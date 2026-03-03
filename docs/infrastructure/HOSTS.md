# Infrastructure Hosts

Server details, IPs, and access credentials are in the team `.env` file (shared privately).

## Overview

| Host | Role | Status |
|------|------|--------|
| pi0 | DNS, SNMP, log shipping, LDAP | 🟢 Active |
| pi1 | Monitoring (Grafana, Prometheus, Loki), GuardQuote API | 🟢 Active |
| pi2 | K3s workloads, security ops (Suricata, Wazuh, SentinelNet) | 🟢 Active |
| ThinkStation | Development workstation (WSL2) | 🟢 Active |
| PA-220 | Palo Alto firewall — 4 DMZ security zones | 🟢 Active |
| UDM | UniFi gateway/router | 🟢 Active |
| Orange Pi RV2 | Suricata IDS, planned DB server | 🟢 Active |
| pi3 | Off-site monitoring node (planned) | 🔜 Planned |

## Time Synchronization

All hosts sync to `time.cloudflare.com` (primary) with Debian/Ubuntu pools and pi1 as fallbacks. See [NTP.md](NTP.md) for full configuration.

| Host | NTP Service | Synced |
|------|-------------|--------|
| pi0 | systemd-timesyncd | Yes |
| pi1 | chrony | Yes |
| pi2 | systemd-timesyncd | Yes |
| rv2 | chrony | Yes |
| WSL | systemd-timesyncd | Yes |

