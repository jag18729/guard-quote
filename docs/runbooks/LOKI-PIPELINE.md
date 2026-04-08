# Loki Pipeline

How logs flow into Loki on Pi1, who ships what, the cross-zone routing rules, and the gotchas that took down the SentinelNet dashboard once already.

## Topology

```
        +-----------+         +-----------+         +--------+
pi0 --> |  Vector   | --rsy-> |   Loki    | <-curl- | feeder |  <-- RV2
        | (system)  |         |  on pi1   |         | python |
        +-----------+         +-----------+         +--------+
              ^                     ^
              |                     |
        journald, syslog,    Grafana queries
        docker, PA-220,      from pi1 :3000
        UDM, switches
```

| Source | Host | Shipper | Transport | Tailscale dest |
|--------|------|---------|-----------|----------------|
| systemd journal, auth.log, docker, PA-220 syslog, UDM, USW switches | pi0 | Vector (`vector.toml`) | HTTP push | `100.77.26.41:3100` |
| Suricata `/var/log/suricata/eve.json` | RV2 | `~/sentinelnet-feeder/eve-to-loki.py` (`eve-to-loki.service`) | HTTP push | `100.77.26.41:3100` |
| ThinkStation system logs | ThinkStation | (its own Vector or similar) | HTTP push | `100.77.26.41:3100` |

Loki itself runs as a Docker container on Pi1, listening on `100.77.26.41:3100` (Tailscale) and `192.168.20.10:3100` (matrix VLAN). Cross-zone clients **must use the Tailscale address** because PA-220 blocks direct cross-zone TCP between dmz-mgmt (pi0), dmz-services (pi1), and dmz-security (pi2/RV2).

## Label namespace

Loki labels in use right now:

| Label | Values | Set by |
|-------|--------|--------|
| `host` | `pi0`, `rv2`, `thinkstation` | source-specific shipper |
| `service_name` | systemd unit names + `suricata` | Vector remap (pi0), eve-to-loki.py (RV2) |
| `job` | `suricata` (only) | eve-to-loki.py |
| `collector` | `pi0`, `rv2`, `thinkstation` | shipper config |
| `source` | `vector`, `eve.json` | shipper config |

**Rule**: when querying for Suricata data, use `{job="suricata"}` (set by the RV2 feeder), not `{service_name="suricata"}`. The Vector pi0 path uses `service_name`; only the eve-to-loki.py path sets `job=suricata`.

## Cross-zone routing rules

PA-220 enforces zone separation between dmz-mgmt (pi0), dmz-services (pi1), dmz-security (pi2/RV2), and matrix. Direct cross-zone TCP is blocked. **All inter-host traffic for Loki, Postgres, Redis, etc. must use Tailscale IPs**, not matrix VLAN IPs:

| Service | Tailscale | Matrix VLAN | Use which |
|---------|-----------|-------------|-----------|
| Loki on pi1 | `100.77.26.41:3100` | `192.168.20.10:3100` | **Tailscale** |
| PostgreSQL on pi1 | `100.77.26.41:5432` | `192.168.20.10:5432` | **Tailscale** |
| Grafana on pi1 | `100.77.26.41:3000` | `192.168.20.10:3000` | **Tailscale** |
| Pi0 from pi2 | `100.114.94.18` | `192.168.21.x` | **Tailscale** |

**Failure mode**: Vector on pi0 was timing out for weeks against `192.168.20.10:3100` because the matrix VLAN path is firewalled. The fix was a one-line edit in `/etc/vector/vector.toml` swapping every Loki sink endpoint to the Tailscale address.

## Loki query gotchas

### 1. JSON parser errors poison the entire query

When you write `{job="suricata"} | json | event_type = "alert"`, the `| json` step fails on any malformed line and the whole query returns nothing. **Always add `| __error__=""` after `| json`** to drop the parse-error rows:

```logql
{job="suricata"} | json | __error__="" | event_type = `alert`

sum by (event_type) (count_over_time({job="suricata"} | json | __error__="" [1h]))
```

This is especially important for files written by long-running tailers + copytruncate rotation, where the rotation moment can produce one half-written line.

### 2. Old timestamps get rejected

Loki's `reject_old_samples` window is 7 days by default. If a shipper has buffered events older than that (because it was disconnected from Loki), it will retry forever and Loki will keep rejecting:

```
"entry has timestamp too old: 2026-03-24T09:04:49Z, oldest acceptable
timestamp is: 2026-04-01T04:20:02Z"
```

**Fix**: clear the shipper's buffer or checkpoint. For Vector specifically: `sudo rm -rf /var/lib/vector/*` and add `since_now = true` to any journald source so it resumes from the current cursor instead of replaying from boot.

### 3. Use range queries, not instant queries, for log stream filtering

`/loki/api/v1/query` is for instant metric queries (a single point in time). For log line filtering, use `/loki/api/v1/query_range` with `start` and `end` parameters. The error message `log queries are not supported as an instant query type` is the giveaway.

## Logrotate gotchas

### `size` vs `maxsize`

`size N` means "do not rotate unless the file is at least N bytes". Combined with `daily`, this can suppress rotation entirely if the file stays small.

`maxsize N` means "rotate at the time interval OR when the file exceeds N bytes, whichever comes first". This is the right directive when you want a daily floor plus a size ceiling.

```
# wrong, blocks daily rotation if file is small
daily
size 20M

# right, daily floor plus 20M ceiling
daily
maxsize 20M
```

### `copytruncate` with long-running tailers

`copytruncate` is required when a process holds the file open and tails it. The alternative (rename + create new file) breaks the process's file descriptor. The trade-off is a small window where copytruncate writes back the file head and any in-flight bytes get lost. For our use case (Suricata + eve-to-loki + Loki) the loss is one line every rotation, well under 1ms of data, acceptable for IDS.

The rotated file MAY contain a partially-written last line; combine with the JSON parser error filter above.

### Watch the right path

Logrotate config glob patterns must match the LIVE file location, not a backing copy or cache. The original `/etc/logrotate.d/suricata` on RV2 was watching `/var/log.hdd/suricata/*.json` (the orangepi-ramlog persistent backing) instead of `/var/log/suricata/*.json` (the live tmpfs). The result: logrotate happily rotated nothing for weeks, the live file grew unbounded, and the tmpfs filled up.

## Vector journald source needs `since_now` after a long disconnect

If Vector has been failing to ship for any reason (broken sink, wrong endpoint, network outage), its journald cursor stays where it left off. When you fix the sink, Vector tries to flush from the old cursor, which can be days or weeks back. Loki rejects everything older than 7 days and reports thousands of "Events dropped" errors.

The fix is `since_now = true` in the journald source block:

```toml
[sources.journal]
type = "journald"
current_boot_only = true
since_now = true
exclude_units = ["vector.service"]
```

This tells Vector to start from the current cursor on next start, ignoring the saved position. Combined with `sudo rm -rf /var/lib/vector/*` for a clean slate.

## Stale file handles after a truncate

If you truncate a file that a long-running tailer has open (e.g., `truncate -s 0 /var/log/suricata/eve.json`), the tailer's file descriptor still points at the OLD position N where N was the pre-truncate file size. Subsequent `read()` calls return empty until the file grows past position N.

**Fix**: restart the tailer after any external truncate. For our setup: `sudo systemctl restart eve-to-loki`. The tailer reopens the file and seeks to the (now zero) end.

This is also why `logrotate copytruncate` works: it does NOT actually truncate via the tailer's file descriptor, it copies the content to a new file and then writes zero bytes back to the original position 0. The tailer's offset is unchanged because the truncate happens AFTER copytruncate restores the content.

## Inventory of who ships what (cheatsheet)

| Want to query | LogQL selector |
|---------------|----------------|
| Suricata EVE events | `{job="suricata"}` |
| Suricata alerts only | `{job="suricata"} \| json \| __error__="" \| event_type = ` `` `alert` `` |
| Pi0 system logs | `{host="pi0"}` |
| Pi0 OpenLDAP | `{host="pi0", service_name="openldap"}` |
| Pi0 cloudflared tunnel | `{host="pi0", service_name="cloudflared"}` |
| PA-220 firewall syslog | `{host="reveal-fw"}` (if labeled that way by Vector) |
| Anything from a specific host | `{host="<hostname>"}` |
| All event_types over time | `sum by (event_type) (count_over_time({job="suricata"} \| json \| __error__="" [1h]))` |

## Incident reference

Tonight (2026-04-07) the SentinelNet dashboard had four "no data" panels. The chain of root causes, deepest first:

1. RV2's `/var/log` is a 150 MB orangepi-ramlog tmpfs, and Suricata had filled it with a 122 MB orphaned `.eve.json.qdEdwp` rotation file plus a 5.9 MB live `eve.json`.
2. Once full, Suricata stopped writing entirely.
3. The existing `eve-to-loki.service` had a stale file handle pointing past the new EOF (file had been truncated externally) and was tailing nothing.
4. Vector on pi0 had been timing out for weeks against `192.168.20.10:3100` (matrix VLAN unreachable across zones), so pi0 logs never made it to Loki.
5. The dashboard's `| json` queries were also failing on the first malformed line (parser error), so even after fixing the upstream pipeline the panels needed `| __error__=""` filters.

Five separate root causes layered on top of each other. The fix sequence and full incident writeup is in `docs/runbooks/RV2-STORAGE.md`.

---

*Last updated: 2026-04-07*
