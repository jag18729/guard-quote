# RV2 Storage and Log Persistence

How `/var/log` is laid out on the Orange Pi RV2 SecOps host, why it broke once, what's in place now, and how to roll back if any change misbehaves.

## TL;DR

- **Hardware**: WD Blue SN580 NVMe 500 GB (`/dev/nvme0n1p1`) mounted at `/`. 458 GB available.
- **Default Orange Pi distro behavior**: `/var/log` is mounted as a 150 MB tmpfs by `orangepi-ramlog.service`, with periodic flush to `/var/log.hdd` for persistence. This is meant for SD-card-based deployments to reduce write wear; on RV2 it makes no sense because the OS boots from NVMe.
- **Failure mode encountered**: Suricata's `/var/log/suricata/eve.json` outgrew the 150 MB tmpfs (with the `flow` event type enabled it produced ~70% of all events). Once full, Suricata stopped writing entirely. The existing `eve-to-loki.service` had nothing to ship and every Loki-backed dashboard panel went dark.
- **Phase A (shipped 2026-04-07)**: tightened Suricata + fixed logrotate. Disk-fill is contained.
- **Phase B (scheduled Apr 12)**: disable `orangepi-ramlog`, put `/var/log` directly on NVMe, reboot to verify.
- **Phase C (in flight)**: Pi0 NFS leg + RV2 cron offload script (live), Prometheus disk-low alert (deferred until Prometheus rules mounting is fixed upstream), this runbook.

## Hosts and paths

| Path | Host | Role |
|------|------|------|
| `/dev/nvme0n1p1` | RV2 | Root filesystem, ext4, mounted at `/` |
| `/var/log` (tmpfs) | RV2 | 150 MB ramlog managed by `orangepi-ramlog.service` |
| `/var/log.hdd` | RV2 | Persistent backing on NVMe; ramlog flushes here on `ExecReload`/`ExecStop` |
| `/etc/suricata/suricata.yaml` | RV2 | Suricata config; eve-log `flow` event type disabled in Phase A |
| `/etc/logrotate.d/suricata` | RV2 | Rewritten in Phase A; targets live `/var/log/suricata/*.{log,json}` with `copytruncate` |
| `/usr/local/bin/fleet-log-offload-rv2.sh` | RV2 | Daily offload script, mirror of Pi2's pattern |
| `/etc/cron.d/fleet-log-offload-rv2` | RV2 | Cron `0 3 * * * root` |
| `/srv/nfs/backups/rv2/suricata/` | Pi0 | NFS destination for rotated `.gz` files |
| `~/sentinelnet-feeder/eve-to-loki.py` | RV2 | Long-running tailer that ships EVE to Loki on Pi1 (Tailscale `100.77.26.41:3100`) |
| `eve-to-loki.service`, `sentinelnet-feeder.service`, `suricata.service` | RV2 | Three systemd units that must come up after any reboot |
| `/home/rafaeljg/workspace/projects/sentinelnet/models/` | RV2 | ML model artifacts (already on NVMe; no migration needed) |

## What Phase A actually changed

### 1. Dropped `flow` events from eve-log

`/etc/suricata/suricata.yaml` line 314 was previously `        - flow`. Now commented:

```yaml
        # bi-directional flows
        # - flow   # disabled to cut eve.json volume; flow events are noisy and not used by demo dashboards
```

`flow` was the highest-volume event type (one record per completed TCP/UDP flow). Disabling it cut the eve.json write rate by roughly 70%. The dashboard panels that depend on Suricata data (`alert`, `tls`, `http`, `dns`, `stats`) are unaffected.

Verified clean: `sudo suricata -T -c /etc/suricata/suricata.yaml` validates, `systemctl restart suricata` brings the daemon back in ~5 seconds with rules reloaded.

Backup of original config: `/etc/suricata/suricata.yaml.bak.20260407-215200`

### 2. Fixed the broken logrotate

The previous `/etc/logrotate.d/suricata` watched `/var/log.hdd/suricata/*.json`, which is the persistent backing copy that the ramlog service flushes to on shutdown. The live file Suricata actually writes is `/var/log/suricata/eve.json` (the tmpfs path). **Logrotate had never actually rotated the live file.** That's why eve.json grew unbounded until the tmpfs filled.

New config:

```
/var/log/suricata/*.log /var/log/suricata/*.json {
    daily
    rotate 7
    maxsize 20M
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    dateext
    dateformat -%Y%m%d
}
```

Notes:
- `maxsize` (not `size`) so it rotates daily OR when a single day's data exceeds 20 MB, whichever comes first.
- `copytruncate` because `eve-to-loki.service` holds the file open continuously; renaming would break its tail.
- `delaycompress` waits one rotation cycle before compressing, so the previous file is not gzipped while a process might still be writing the last bytes.
- Removed the broken `postrotate /bin/kill -HUP $(cat /var/run/suricata.pid)` block; copytruncate handles file-handle continuity, no signal needed.

Backup: `/etc/logrotate.d/suricata.bak.20260407-215200`

Verified by `sudo logrotate -fv /etc/logrotate.d/suricata` producing `eve.json-20260407.gz`, `fast.log-20260407.gz`, `stats.log-20260407.gz` and truncating the live files.

## What Phase B will change (deferred to Apr 12 rehearsal)

The full long-term fix: stop fighting the ramlog and put `/var/log` on the NVMe directly. Steps:

1. `sudo systemctl reload orangepi-ramlog.service` to flush tmpfs to `/var/log.hdd` one last time.
2. `sudo rsync -aAX /var/log.hdd/ /var/log.disk-staging/` to pre-stage outside the mount point.
3. `sudo systemctl stop orangepi-ramlog.service` to unmount the tmpfs.
4. `sudo systemctl mask orangepi-ramlog.service` so it cannot start at next boot, even after package upgrades.
5. After unmount, the underlying `/var/log` directory may be empty or stale. Restore from the staging copy if needed: `sudo rsync -aAX /var/log.disk-staging/ /var/log/`
6. `sudo reboot` and verify on next boot:
   - `mount | grep /var/log` returns empty
   - `df -h /var/log` shows the same filesystem as `df -h /` (NVMe, 458 GB)
   - `systemctl is-active suricata eve-to-loki sentinelnet-feeder` all return `active`
   - https://grafana.vandine.us/d/sentinelnet-ops loads with all panels populated
   - `ls -la /var/log/suricata/eve.json` shows a non-zero size growing over a 30-second observation window

After Phase B, `/var/log` is a regular ext4 directory on the 458 GB NVMe. System logs persist across reboots. The disk-fill failure mode is gone permanently.

### Why Phase B is scheduled for Apr 12

The CIT 480 final demo is Apr 18. Apr 12 is the on-site rehearsal, when the team is together and any post-reboot issue can be triaged immediately. Doing Phase B at any other time means going solo on a reboot of the live IDS host. Phase A alone is sufficient to keep RV2 healthy through the demo if Phase B has to slip.

## Phase C: NFS leg (live as of 2026-04-07)

`fleet-log-offload-rv2.sh` mirrors the Pi2 script, ships rotated `.gz` files from `/var/log/suricata/` to `pi0:/srv/nfs/backups/rv2/suricata/` via SSH-rsync. Runs daily at 03:00 via `/etc/cron.d/fleet-log-offload-rv2`. Smoke test on Apr 7 produced `eve.json-20260407.gz` (264 KB), `fast.log-20260407.gz` (7 KB), `stats.log-20260407.gz` (27 KB) on Pi0 NFS.

Authentication: `root@rv2` SSH key (`/root/.ssh/id_ed25519`) is authorized in `rafaeljg@pi0:~/.ssh/authorized_keys` with comment `root@rv2-fleet-offload`.

Pi0 directory is owned by `rafaeljg:rafaeljg` mode 0775 to allow the rsync writes.

Retention on Pi0 follows the existing global rule: 30 days, then a Sunday cleanup cron sweeps `.gz` files older than 30 days. The 90-day archive leg to ThinkStation is also handled by the existing fleet cron.

## Phase A.1: Loki query JSON parser fix (live as of 2026-04-07)

After Phase A's logrotate fix went live, the EVE Event Types and Suricata IDS Alerts dashboard panels still showed "no data" even though `sum(count_over_time({job="suricata"}[1m]))` returned ~36 events/min. The actual Loki error from the API was:

```
pipeline error: 'JSONParserErr' for series: '{__error__="JSONParserErr",
__error_details__="Value looks like object, but can't find closing } symbol", ...}
```

**Root cause**: when `logrotate` runs `copytruncate` on `eve.json`, there is a small window where Suricata is mid-write to the file. If a copytruncate fires during a partially-written line, the line gets shipped to Loki as malformed JSON. Loki's `| json` parser is strict, so a single bad line in the time range poisons the entire query result.

**Fix**: any panel query that uses `| json` must include `| __error__=""` immediately after, to drop the parse-error rows from the pipeline. Updated panels 44 and 45 in dashboard `sentinelnet-ops` (now version 6):

```logql
{job="suricata"} | json | __error__="" | event_type = `alert`

sum by (event_type) (count_over_time({job="suricata"} | json | __error__="" [1h]))
```

**General rule**: every query against a stream that comes from a copytruncate-rotated file should add `| __error__=""` after `| json`. This applies to anything Suricata, future Wazuh, or any service that uses long-running tailers.

## Known gaps tracked elsewhere

- **Prometheus rules are not mounted into the container.** `prometheus.yml` declares `rule_files: /etc/prometheus/*-alerts.yml` but the rules directory is not bind-mounted. The existing `pi3-alerts.yml` at `/home/johnmarston/monitoring/rules/` is therefore not loaded. A disk-low alert for RV2 (`node_filesystem_avail_bytes{mountpoint="/"} < 20Gi` warn / `< 5Gi` crit) is the right next step but it cannot fire until the rules mount is fixed upstream. Tracked separately.
- **Pi2's `fleet-log-offload.sh` has no scheduled cron either.** The script exists at `/usr/local/bin/fleet-log-offload.sh` but no `/etc/cron.d/` entry, no user crontab, no systemd timer. Same fix pattern as RV2: drop a cron entry. Not blocking RV2 work; flagged for future cleanup.

## Rollback procedure

### Phase A rollback

If the `flow` disable causes a Grafana panel to go empty that the team needs:

```bash
ssh 100.118.229.114
sudo cp /etc/suricata/suricata.yaml.bak.20260407-215200 /etc/suricata/suricata.yaml
sudo systemctl restart suricata
```

If the new logrotate misbehaves:

```bash
sudo cp /etc/logrotate.d/suricata.bak.20260407-215200 /etc/logrotate.d/suricata
```

### Phase B rollback (when applicable)

If after a Phase B reboot the box does not come back cleanly, rollback is simply:

```bash
sudo systemctl unmask orangepi-ramlog.service
sudo reboot
```

The masked symlink at `/etc/systemd/system/orangepi-ramlog.service -> /dev/null` is removed, the service comes back, and the next boot mounts the tmpfs again with whatever was last in `/var/log.hdd`.

### Phase C rollback

To remove the NFS leg:

```bash
ssh 100.118.229.114
sudo rm /etc/cron.d/fleet-log-offload-rv2
sudo rm /usr/local/bin/fleet-log-offload-rv2.sh

ssh 100.114.94.18
sudo rm -rf /srv/nfs/backups/rv2
sudo sed -i '/rv2-fleet-offload/d' /home/rafaeljg/.ssh/authorized_keys
```

## Verification commands

Run these any time to verify the storage layer is healthy:

```bash
# Disk free
ssh 100.118.229.114 'df -h /var/log /'

# Suricata writing
ssh 100.118.229.114 'wc -l /var/log/suricata/eve.json'
sleep 10
ssh 100.118.229.114 'wc -l /var/log/suricata/eve.json'   # should be larger

# Loki receiving
ssh johnmarston@100.77.26.41 'curl -s -G http://localhost:3100/loki/api/v1/query --data-urlencode "query=sum(count_over_time({job=\"suricata\"}[1m]))"'

# Three RV2 services healthy
ssh 100.118.229.114 'systemctl is-active suricata eve-to-loki sentinelnet-feeder'

# Yesterday's rotated files made it to Pi0
ssh 100.114.94.18 'ls -la /srv/nfs/backups/rv2/suricata/'
```

---

*Last updated: 2026-04-07*
