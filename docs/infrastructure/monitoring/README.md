# Monitoring Stack

> Last updated: 2026-03-17

## Architecture

Grafana + Prometheus + Loki run in Docker on **Pi1** (`100.77.26.41`).
Metrics are collected from all fleet hosts via node_exporter, blackbox, and SNMP.
**Promtail on Pi2** ships K3s pod logs (guardquote namespace) to Loki.

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
│  Pi0: 100.114.94.18  (Tailscale — DMZ IP dead)     │
│  Pi2: 100.111.113.35 (Tailscale only)              │
│  RV2: 192.168.25.2   (reachable via dmz-security)  │
└────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Pi2 — Promtail (Docker)                             │
│  Scrapes: K3s pod logs (guardquote namespace)        │
│  Ships to: Loki at http://100.77.26.41:3100          │
│  Config: ~/promtail/config.yml                       │
└──────────────────────────────────────────────────────┘
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

### Pi0 USB Adapter Migration (2026-03-17)

The DMZ ethernet adapter (`enx806d972f9573`) was physically moved from Pi0 to Pi2 as `eth2`.
**Pi0's DMZ IP `192.168.21.10` is no longer reachable.** All Pi0 prometheus.yml targets were migrated to Pi0's Tailscale IP `100.114.94.18`.

Affected jobs: `node-pi0`, `dns-probes` (dns-primary), `dns-pi3`, `tcp-syslog`, `http-services` (lam), `http-adguard` (adguard-primary), `blackbox-pi3-internal`.

Instance label relabeling preserves human-readable labels (e.g. `192.168.21.10:53`) in Grafana even though scraping goes through Tailscale — see `prometheus.yml` relabeling rules for `service=dns-primary` and `service=adguard-primary`.

## Prometheus Config

**File:** `/home/johnmarston/monitoring/prometheus.yml` on Pi1
**Reload:** `docker compose restart prometheus` (in `~/monitoring/`)

## Target Health (as of 2026-03-17)

| Status | Count | Notes |
|--------|-------|-------|
| UP | 42 | All reachable hosts and services |
| DOWN (expected) | 1 | Pi3 node_exporter (node-pi3 — Pi3 recently moved) |
| DOWN (expected) | 1 | XPS — offline |
| DOWN (expected) | 1 | Pi3 blackbox Prometheus probe (9090/-/healthy returns non-200) |

## Grafana Datasources

| Name | Type | UID | Target |
|------|------|-----|--------|
| Prometheus | prometheus | `PBFA97CFB590B2093` | `http://prometheus:9090` |
| Loki | loki | `P8E80F9AEF21F6940` | `http://loki:3100` |
| GuardQuote DB | postgres | `guardquote-postgres` | `100.77.26.41:5432` / db: `guardquote` |

### Adding the GuardQuote DB datasource

If the Grafana container is recreated and the volume lost, re-add via API:

```bash
curl -X POST -u 'admin:<pw>' -H 'Content-Type: application/json' \
  http://localhost:3000/api/datasources \
  -d '{
    "name": "GuardQuote DB",
    "type": "postgres",
    "uid": "guardquote-postgres",
    "url": "100.77.26.41:5432",
    "user": "postgres",
    "secureJsonData": {"password": "guardquote123"},
    "jsonData": {"database": "guardquote", "sslmode": "disable", "postgresVersion": 1700},
    "access": "proxy"
  }'
```

## Grafana Admin Password

Password is set via `grafana-cli` after each container restart (env var `GF_SECURITY_ADMIN_PASSWORD` does not override an existing admin user):

```bash
docker exec grafana grafana-cli admin reset-admin-password '<password>'
```

This is run automatically in the deployment runbook. See credentials in team `.env`.

## Promtail (Pi2 — K3s Log Shipping)

Promtail runs as a Docker container on Pi2, scraping all K3s pod logs in the `guardquote` namespace and shipping them to Loki on Pi1.

**Config:** `~/promtail/config.yml` on Pi2
**Compose:** `~/promtail/docker-compose.yml`
**Manage:** `cd ~/promtail && sudo docker compose [up -d | logs | restart]`

Loki stream labels produced:

| Label | Value |
|-------|-------|
| `job` | `guardquote-logs` |
| `namespace` | `guardquote` |
| `pod` | e.g. `guardquote-backend-xxx` |
| `container` | e.g. `guardquote-backend` |
| `host` | `pi2` |
| `source` | `k3s` |

**LogQL query for Grafana** (backend logs, no health check noise):
```logql
{job="guardquote-logs", container="guardquote-backend"} != `health`
```

**Auth errors only:**
```logql
{job="guardquote-logs"} |~ "(error|Error|ERROR|failed|Failed|OAuth|401|403)"
```

## iperf3 — Disabled Fleet-Wide

iperf3 services have been disabled on all hosts.

| Host | Services Disabled |
|------|-----------------|
| Pi2 | `iperf3-exporter.service`, `iperf3-server.service`, `iperf3.service` |
| Pi0 | `iperf3-server.service` |
| Pi1 | `iperf3-server.service` (disabled previously — Wazuh noise) |

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
| Promtail | Pi2 | 9080 | internal (Pi2 only) |
| Sentinel Grafana | Pi2 K3s | 30300 | internal |
| SentinelNet API | Pi2 K3s | 30800 | internal |
| Wazuh API | Pi2 | 55000 | internal |

## SentinelNet (Pi2 K3s)

SentinelNet runs in the `sentinel` namespace as `sentinelnet-api` deployment.

**ONNX model:** 15-class CICIDS2017 network intrusion detection, 78 features + exfil autoencoder.

> **Critical:** Pi2 K3s uses `cri-dockerd` (Docker as CRI), NOT system containerd.
> `ctr import` writes to the wrong store. Always use `sudo docker build/load`.

```bash
# Rebuild and deploy SentinelNet on Pi2
cd ~/workspace/projects/sentinelnet
sudo docker build -t sentinelnet:v0.4.0 .
kubectl rollout restart deployment/sentinelnet-api -n sentinel
```

## Log Sources in Loki

| Source | Label | Notes |
|--------|-------|-------|
| GuardQuote K3s pods | `{job="guardquote-logs"}` | Shipped via Promtail on Pi2 |
| UDM IPS | `{job="udm-ips"}` | UniFi threat events |

## Pi3 Off-Site Node

Prometheus has Pi3 scrape jobs configured (Tailscale IP: `100.119.105.10`).
Pi3 is at Vandine site; `rnsd` and `iperf3` targets DOWN until node is stable on new rack location.

## Disk Monitoring

Fleet Disk Monitor cron on ThinkStation checks all hosts every 30 min.
Telegrams `@frank_is_a_real_bot` if any host exceeds **75% disk**.

```promql
100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"}
      / node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}) * 100)
```
