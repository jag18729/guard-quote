# Monitoring Stack

> Last updated: 2026-03-12

## Architecture

Grafana + Prometheus + Loki run in Docker on **Pi1** (`100.77.26.41`).
Metrics are collected from all fleet hosts via node_exporter, blackbox, and SNMP.

```
┌──────────────────────────────────────────────────────────────────┐
│                         Pi1 (Monitoring Host)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────┐  ┌─────────────────┐   │
│  │ Grafana  │  │ Prometheus │  │ Loki │  │  Alertmanager   │   │
│  │  :3000   │  │   :9090    │  │:3100 │  │     :9093       │   │
│  └──────────┘  └────────────┘  └──────┘  └─────────────────┘   │
│  ┌────────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Blackbox :9115     │  │ SNMP :9116   │  │ cAdvisor :8080   │  │
│  │ (on Pi0 for SNMP)  │  │ (on Pi0)     │  │ Postgres :9187   │  │
│  └────────────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │ scrapes via Tailscale (PA-220 blocks direct cross-zone)
         ▼
┌────────────────────────────────────────────────────┐
│  node_exporter :9100 on each host                  │
│  Pi0: 192.168.21.10  (reachable direct)            │
│  Pi2: 100.111.113.35 (Tailscale only)              │
│  RV2: 192.168.25.2   (reachable via dmz-security)  │
└────────────────────────────────────────────────────┘
```

## Critical: PA-220 Cross-Zone Scrape Targets

**Pi1 (dmz-services) cannot directly reach Pi2 (dmz-security).**
All Pi2 and RV2 (Matrix VLAN) scrape targets in `prometheus.yml` must use **Tailscale IPs**.

| Job | Wrong (blocked) | Correct (Tailscale) |
|-----|----------------|---------------------|
| node-pi2 | 192.168.22.10:9100 | 100.111.113.35:9100 |
| icmp-pi2 | 192.168.22.10 | 100.111.113.35 |
| http-wazuh | 192.168.22.10:55000 | 100.111.113.35:55000 |
| http-sentinelnet | 192.168.22.10:30800 | 100.111.113.35:30800 |
| http-sentinel-grafana | 192.168.22.10:30300 | 100.111.113.35:30300 |
| http-nettools | 192.168.22.10:30880 | 100.111.113.35:30880 |
| snmp-pa220/udm exporter | 192.168.21.10:9116 | 100.114.94.18:9116 |
| http-adguard (pi0) | 192.168.21.10:3001 | 100.114.94.18:3001 |
| http-rv2-services | 192.168.2.90:8090/8091 | 100.118.229.114:8090/8091 |

> **Rule:** If a target is in a different PA-220 zone than Pi1, use its Tailscale IP.

## Prometheus Config

**File:** `/home/johnmarston/monitoring/prometheus.yml` on Pi1
**Reload:** `docker compose restart prometheus` (in `~/monitoring/`)

## Target Health (as of 2026-03-12)

| Status | Count | Notes |
|--------|-------|-------|
| UP | 35 | All reachable hosts and services |
| DOWN (expected) | 7 | Pi3 off-site node (not yet deployed) |
| DOWN (expected) | 1 | XPS — offline |

All Pi2, Pi0, RV2, and SNMP targets are now UP after migrating to Tailscale IPs.

## iperf3 — Disabled Fleet-Wide

iperf3 services have been disabled on all hosts. They caused CPU spikes and log flooding in Loki.

| Host | Services Disabled |
|------|-----------------|
| Pi2 | `iperf3-exporter.service`, `iperf3-server.service`, `iperf3.service` |
| Pi0 | `iperf3-server.service` |
| Pi1 | `iperf3-server.service` (disabled previously — Wazuh noise) |

Do not re-enable without updating the Loki log panel query to exclude `service_name=iperf3`.

## SNMP Exporter

Runs on **Pi0** (Docker container, port 9116).
Pi0 has dual NICs: `eth0` (192.168.2.101, Matrix VLAN) reaches PA-220 (192.168.2.20) and UDM (192.168.2.1) for SNMP.
Prometheus reaches the exporter via Pi0's Tailscale IP: `100.114.94.18:9116`.

## Key Services & Ports

| Service | Host | Port | URL |
|---------|------|------|-----|
| Grafana | Pi1 | 3000 | https://grafana.vandine.us |
| Prometheus | Pi1 | 9090 | http://pi1:9090 |
| Loki | Pi1 | 3100 | internal only |
| Alertmanager | Pi1 | 9093 | internal only |
| node_exporter | all hosts | 9100 | per-host |
| Blackbox | Pi1 | 9115 | internal only |
| SNMP exporter | Pi0 | 9116 | via Tailscale |
| Sentinel Grafana | Pi2 K3s | 30300 | internal |
| SentinelNet API | Pi2 K3s | 30800 | internal |
| Wazuh API | Pi2 | 55000 | internal |

## Sentinel Namespace (Pi2 K3s)

**sentinel** namespace has two deployments: `grafana` (UP) and `sentinelnet-api` (scaled to 0).

SentinelNet is scaled to 0 because image `sentinelnet:v0.4.0` is not in the local K3s containerd store.
K3s uses `imagePullPolicy: Never` — image must be built on Pi2 and imported:

```bash
# On Pi2 — rebuild and import SentinelNet image
cd ~/sentinelnet  # or wherever the source is
docker build -t sentinelnet:v0.4.0 .
docker save sentinelnet:v0.4.0 | sudo k3s ctr images import -
kubectl scale deployment -n sentinel sentinelnet-api --replicas=1
```

## Log Sources in Loki

| Source | Label | Notes |
|--------|-------|-------|
| Suricata (RV2) | `{job="suricata"}` | Shipped via Vector |
| Wazuh alerts | `{job="wazuh-alerts"}` | Pi2 → Loki via Vector |
| Severity labels | `level=critical/high/medium/low/info` | Applied by Vector |

## Pi3 Off-Site Node (Planned)

Prometheus has Pi3 scrape jobs configured (Tailscale IP: 100.119.105.10).
All Pi3 targets are DOWN until Pi3 is deployed. Expected — do not remove.

## Disk Monitoring

Fleet Disk Monitor cron on ThinkStation checks all hosts every 30 min.
Telegrams `@frank_is_a_real_bot` if any host exceeds **75% disk**.

PromQL for Grafana disk panel:
```promql
100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"}
      / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100)
```
