# Infrastructure Hosts

Server details, IPs, and access credentials are in the team `.env` file (shared privately).

## Overview

| Host | Role | Status |
|------|------|--------|
| pi0 | DNS, SNMP, log shipping, LDAP, NFS archive (30-day log store) | 🟢 Active |
| pi1 | PostgreSQL 17, Grafana, Prometheus, Loki, monitoring stack | 🟢 Active |
| pi2 | K3s workloads (GuardQuote v2), Wazuh HIDS host, Cloudflare Tunnel | 🟢 Active |
| ThinkStation | Dev workstation (WSL2), OAuth proxy (port 9876), long-term log archive (M: drive) | 🟢 Active |
| PA-220 | Palo Alto firewall — 4 DMZ zones (dmz-mgmt, dmz-security, dmz-services, untrust) | 🟢 Active |
| UDM | UniFi gateway/router | 🟢 Active |
| Orange Pi RV2 | Lab bastion, Suricata IDS (74k rules, ET Open), dmz-security zone | 🟢 Active |
| pi3 | Off-site monitoring node (planned) | 🔜 Planned |

## Networking Note

PA-220 blocks direct cross-zone traffic. All cross-host connections use **Tailscale IPs**:

| Host | Tailscale IP | Direct IP (zone) |
|------|-------------|-----------------|
| Pi0 | 100.114.94.18 | 192.168.21.10 (dmz-mgmt) |
| Pi1 | 100.77.26.41 | 192.168.20.10 (dmz-services) |
| Pi2 | 100.111.113.35 | 192.168.22.10 (dmz-security) |
| ThinkStation | 100.126.232.42 | 192.168.2.x (untrust) |
| RV2 | 100.118.229.114 | 192.168.25.2 (dmz-security) |

See [`docs/runbooks/NETWORKING.md`](../runbooks/NETWORKING.md) for GuardQuote-specific routing constraints.

## Time Synchronization

All hosts sync to `time.cloudflare.com` (primary). See [NTP.md](NTP.md) for full configuration.

| Host | NTP Service | Synced |
|------|-------------|--------|
| pi0 | systemd-timesyncd | Yes |
| pi1 | chrony | Yes |
| pi2 | systemd-timesyncd | Yes |
| rv2 | chrony | Yes |
| WSL | systemd-timesyncd | Yes |
