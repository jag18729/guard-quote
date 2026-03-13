# Tailscale VPN Configuration

> Last updated: 2026-03-12

## Overview

Tailscale provides a WireGuard-based mesh VPN connecting all infrastructure nodes.
It is the **primary cross-zone connectivity mechanism** — the PA-220 firewall blocks direct traffic between DMZ zones, so all cross-host connections (monitoring scrapes, DB connections, OAuth proxy) route through Tailscale.

## Node IPs

| Node | Tailscale IP | Zone / Network | Role |
|------|-------------|----------------|------|
| ThinkStation | 100.126.232.42 | untrust (192.168.2.x) | Dev workstation, OAuth proxy (:9876) |
| Pi0 | 100.114.94.18 | dmz-mgmt (192.168.21.x) | DNS, LDAP, SNMP exporter, NFS archive |
| Pi1 | 100.77.26.41 | dmz-services (192.168.20.x) | PostgreSQL 17, Grafana/Prometheus/Loki |
| Pi2 | 100.111.113.35 | dmz-security (192.168.22.x) | K3s (GuardQuote v2), Wazuh, cloudflared |
| RV2 | 100.118.229.114 | dmz-security (192.168.25.x) | Suricata IDS, lab bastion |

## Why Tailscale for Cross-Zone Traffic

PA-220 zones block direct cross-zone connections:

| From | To | Status |
|------|----|--------|
| Pi1 (dmz-services) | Pi2 (dmz-security) | BLOCKED — all ports |
| Pi1 (dmz-services) | Pi0 (dmz-mgmt) | BLOCKED — most ports (DNS :53 allowed) |
| K3s pods (Pi2) | Pi1 (dmz-services) | BLOCKED — all ports incl. 5432 |

Tailscale traffic routes via `tailscale0` on each host — bypasses PA-220 zone policy entirely.

## Critical Tailscale-Routed Connections

| Service | From | To (Tailscale IP) | Port |
|---------|------|-------------------|------|
| GuardQuote DATABASE_URL | K3s pods (Pi2) | Pi1: 100.77.26.41 | 5432 |
| OAuth proxy | K3s pods (Pi2) | ThinkStation: 100.126.232.42 | 9876 |
| Prometheus → node-pi2 | Pi1 Docker | Pi2: 100.111.113.35 | 9100 |
| Prometheus → Wazuh | Pi1 Docker | Pi2: 100.111.113.35 | 55000 |
| Prometheus → SentinelNet | Pi1 Docker | Pi2: 100.111.113.35 | 30800 |
| Prometheus → NetTools | Pi1 Docker | Pi2: 100.111.113.35 | 30880 |
| Prometheus → Sentinel Grafana | Pi1 Docker | Pi2: 100.111.113.35 | 30300 |
| Prometheus → SNMP exporter | Pi1 Docker | Pi0: 100.114.94.18 | 9116 |
| Prometheus → AdGuard pi0 | Pi1 Docker | Pi0: 100.114.94.18 | 3001 |
| Prometheus → RV2 services | Pi1 Docker | RV2: 100.118.229.114 | 8090/8091 |
| fleet-log-offload (rsync) | Pi2 root | Pi0: via SSH alias | 22 |

## Common Commands

```bash
# Check status and all peer IPs
tailscale status

# Verify peer reachability
tailscale ping pi2

# Get your Tailscale IP
tailscale ip -4
```

## Troubleshooting

**Prometheus target DOWN with "connection refused" or "context deadline exceeded":**
Check that the target IP in `~/monitoring/prometheus.yml` (on Pi1) is the Tailscale IP, not the direct zone IP.
See `docs/infrastructure/monitoring/README.md` for the full IP mapping table.

**K3s pod can't reach PostgreSQL (401 on login, ECONNREFUSED):**
`DATABASE_URL` secret must use `100.77.26.41:5432`, not `192.168.20.10:5432`.
Also verify Pi1 `pg_hba.conf` has: `hostnossl all all 100.64.0.0/10 scram-sha-256`

**OAuth failing ("Failed to complete login"):**
Verify `oauth-proxy.service` is running on ThinkStation: `sudo systemctl status oauth-proxy`
Check that the target OAuth hostname is in the proxy allowlist (`/home/johnmarston/oauth-proxy.ts`).

## Installation

```bash
# Linux
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Verify
tailscale status
tailscale ip -4
```

## Resources

- [Tailscale Admin Console](https://login.tailscale.com/admin)
- Cross-zone networking details: [`docs/runbooks/NETWORKING.md`](../../runbooks/NETWORKING.md)
- Monitoring scrape target map: [`docs/infrastructure/monitoring/README.md`](../monitoring/README.md)
