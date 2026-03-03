# NTP / Time Synchronization

Accurate time is critical for SIEM log correlation, TLS certificate validation, and cron scheduling across the fleet. All hosts sync to public NTP pools with pi1 as a local fallback.

## Current Configuration

| Host | NTP Service | Primary Source | Fallback Sources | Timezone | Status |
|------|-------------|----------------|------------------|----------|--------|
| pi0 | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |
| pi1 | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Down (as of 2026-03-03) |
| pi2 | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |
| rv2 | chrony | time.cloudflare.com | Ubuntu NTP pools, pi1 (192.168.20.10) | America/Los_Angeles | Synced |
| WSL (ThinkStation) | systemd-timesyncd | time.cloudflare.com | 0.debian.pool.ntp.org, pi1 (192.168.20.10), 1.debian.pool.ntp.org, time.google.com | America/Los_Angeles | Synced |

## Config Files

### systemd-timesyncd (pi0, pi1, pi2, WSL)

**File:** `/etc/systemd/timesyncd.conf`

```ini
[Time]
NTP=time.cloudflare.com 0.debian.pool.ntp.org 192.168.20.10
FallbackNTP=1.debian.pool.ntp.org time.google.com
```

### chrony (rv2)

**File:** `/etc/chrony/chrony.conf`

```conf
# Ubuntu defaults (pool sources)
pool ntp.ubuntu.com        iburst maxsources 4
pool 0.ubuntu.pool.ntp.org iburst maxsources 1
pool 1.ubuntu.pool.ntp.org iburst maxsources 1
pool 2.ubuntu.pool.ntp.org iburst maxsources 2

# Preferred source + local fallback
server time.cloudflare.com iburst prefer
server 0.debian.pool.ntp.org iburst
server 192.168.20.10 iburst
```

## Why Cloudflare First

Previously all hosts used `NTP=192.168.20.10` (pi1) as the sole primary NTP server. When pi1 went down, `systemd-timesyncd` failed to fall back to `time.cloudflare.com` in a timely manner, leaving the fleet unsynchronized. Both pi0 and pi2 reported `NTPSynchronized=no` during the outage.

**Fix applied 2026-03-03:** Cloudflare is now the primary NTP source on all hosts. Pi1 remains in the pool as a local reference when it's available, but the fleet no longer depends on it for time.

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

- **Adding a new host:** Copy the `timesyncd.conf` above, restart `systemd-timesyncd`
- **Pi1 recovery:** Apply the same `timesyncd.conf` config when pi1 comes back online
- **Monitoring:** `NTPSynchronized=no` should be treated as a P2 alert — logs may be unreliable

---

*Last updated: 2026-03-03*
