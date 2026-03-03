# NTP / Time Synchronization

Accurate time is critical for SIEM log correlation, TLS certificate validation, and cron scheduling across the fleet. All hosts sync to public NTP pools with pi1 as a local fallback.

## Current Configuration

| Host | NTP Service | Primary Source | Fallback Sources | Timezone | Status |
|------|-------------|----------------|------------------|----------|--------|
| pi0 | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |
| pi1 | chrony | time.cloudflare.com | Ubuntu NTP pools (plain, NTS disabled) | America/Los_Angeles | Synced |
| pi2 | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |
| rv2 | chrony | time.cloudflare.com | Ubuntu NTP pools, pi1 (192.168.20.10) | America/Los_Angeles | Synced |
| WSL (ThinkStation) | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |

## Config Files

### systemd-timesyncd (pi0, pi2, WSL)

**File:** `/etc/systemd/timesyncd.conf`

```ini
[Time]
NTP=time.cloudflare.com 0.debian.pool.ntp.org 192.168.20.10
FallbackNTP=1.debian.pool.ntp.org time.google.com
```

### chrony (pi1, rv2)

**File:** `/etc/chrony/chrony.conf`

```conf
# Ubuntu defaults (pool sources)
pool ntp.ubuntu.com        iburst maxsources 4
pool 0.ubuntu.pool.ntp.org iburst maxsources 1
pool 1.ubuntu.pool.ntp.org iburst maxsources 1
pool 2.ubuntu.pool.ntp.org iburst maxsources 2

# Preferred source
server time.cloudflare.com iburst prefer
```

**Pi1 notes:**
- Ubuntu 24.04 ships with NTS-enabled NTP pools in `/etc/chrony/sources.d/ubuntu-ntp-pools.sources`. NTS requires port 4460/tcp which is blocked by the PA-220, so these were replaced with plain NTP pools.
- Had a `local-ntp.sources` file with `server 127.0.0.1 iburst prefer` (self-referencing loop) — removed.
- Required `chronyd -q` one-shot sync to step a 720ms clock drift before chrony would select a source.

## Why Cloudflare First

Previously all hosts used `NTP=192.168.20.10` (pi1) as the sole primary NTP server. When pi1 went down, `systemd-timesyncd` failed to fall back to `time.cloudflare.com` in a timely manner, leaving the fleet unsynchronized. Both pi0 and pi2 reported `NTPSynchronized=no` during the outage.

**Fix applied 2026-03-03:** Cloudflare is now the primary NTP source on all hosts. Pi1 remains in the pool as a local reference on timesyncd hosts, but the fleet no longer depends on it for time.

**Pi1 fix (same day):** Pi1 uses chrony (Ubuntu 24.04), not timesyncd. Had three issues: (1) `local-ntp.sources` with `server 127.0.0.1 prefer` creating a self-referencing loop, (2) NTS pools failing because PA-220 blocks port 4460/tcp, (3) 720ms clock drift requiring a forced step via `chronyd -q`. All resolved — pi1 now syncs to Cloudflare as primary.

## Verification

```bash
# systemd-timesyncd hosts (pi0, pi1, pi2, WSL)
timedatectl show --property=NTPSynchronized --property=Timezone
timedatectl timesync-status

# chrony hosts (rv2)
chronyc sources
chronyc tracking

# Quick fleet check from bastion
for h in pi0 pi1 pi2; do
  echo "=== $h ===" && ssh $h "timedatectl show --property=NTPSynchronized" 2>&1
done
ssh rafaeljg@192.168.2.90 "chronyc sources | grep '^\^'" 2>&1
```

## Impact on SIEM

Wazuh correlates alerts by timestamp across agents. Clock drift between hosts causes:
- Brute force detection rules (100021, 100022) to miss correlated events
- Alert timelines in the SOC Dashboard to appear out of order
- Log rotation windows to generate spurious noise alerts (see `siem-test noise`)

The `siem-test noise` validation may show alerts from the first ~5 minutes after midnight log rotation. This is normal Wazuh behavior during `alerts.json` file rotation and does not indicate a suppression failure.

## Maintenance

- **Adding a new host:** Copy the `timesyncd.conf` above, restart `systemd-timesyncd`. For chrony hosts, add `server time.cloudflare.com iburst prefer` and disable NTS pools if behind PA-220.
- **iperf3 on pi1:** Disabled permanently (`systemctl disable --now iperf3-server.service`) — was generating Wazuh rule 40704 noise alerts.
- **Monitoring:** `NTPSynchronized=no` should be treated as a P2 alert — logs may be unreliable

---

*Last updated: 2026-03-03*
