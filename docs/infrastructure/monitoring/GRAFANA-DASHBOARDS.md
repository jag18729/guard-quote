# Grafana Dashboards

> Last updated: 2026-03-17

All dashboards at **https://grafana.vandine.us**

## Dashboard Inventory

| Dashboard | UID | Default Home | Description |
|-----------|-----|:---:|-------------|
| Matrix Lab Overview | `matrix-lab` | | Full fleet health, all hosts, services, security tools |
| GuardQuote Operations | `guardquote-ops` |, | App health + auth monitoring + OAuth tracking |
| Network & Firewall | `network-fw-v2` |, | PA-220 traffic, SNMP, network topology |
| Infrastructure | `infrastructure` |, | Detailed per-host metrics |
| Applications | `applications` |, | Application-level service metrics |

---

## GuardQuote Operations (`guardquote-ops`)

The primary operational dashboard for the GuardQuote platform. Uses three datasources:
- **Prometheus** (`PBFA97CFB590B2093`), service UP/DOWN probes, node metrics
- **Loki** (`P8E80F9AEF21F6940`), live container logs from Pi2 K3s
- **GuardQuote DB** (`guardquote-postgres`), PostgreSQL queries for auth events

### Sections

#### Application Services
Probe UP/DOWN status (Prometheus blackbox):

| Panel | Query |
|-------|-------|
| GuardQuote | `probe_success{job="http-services",service="guardquote"}` |
| Grafana | `probe_success{job="http-services",service="grafana"}` |
| Prometheus | `probe_success{job="http-services",service="prometheus"}` |
| Loki | `probe_success{job="http-services",service="loki"}` |
| Alertmanager | `probe_success{job="http-services",service="alertmanager"}` |
| LDAP/LAM | `probe_success{job="http-services",service="lam"}` |
| PostgreSQL | `probe_success{job="tcp-services",service="postgresql"}` |

#### Infrastructure
Node UP/DOWN + CPU/Memory/Disk gauges for pi1, pi0, pi2.

#### Docker Containers (pi1)
cAdvisor CPU and Memory timeseries for all Pi1 containers.

#### Security Stack (pi2)
| Panel | Query |
|-------|-------|
| SentinelNet | `probe_success{job="http-sentinelnet"}` |
| Sentinel Grafana | `probe_success{job="http-sentinel-grafana"}` |
| Wazuh | `probe_success{job="http-wazuh"}` |
| NetTools | `probe_success{job="http-nettools"}` |

#### Authentication & OAuth
All panels query **GuardQuote DB** (PostgreSQL). Tracks login events in real time.

| Panel | SQL |
|-------|-----|
| Failed Logins (24h) | `SELECT COUNT(*) FROM audit_logs WHERE action='login_failed' AND created_at > NOW()-'24h'` |
| Logins (24h) | `SELECT COUNT(*) FROM user_activity WHERE action='login' AND created_at > NOW()-'24h'` |
| OAuth Logins (24h) | `... WHERE details->>'method'='oauth' AND created_at > NOW()-'24h'` |
| Google Accounts | `SELECT COUNT(*) FROM oauth_accounts WHERE provider='google'` |
| GitHub Accounts | `SELECT COUNT(*) FROM oauth_accounts WHERE provider='github'` |
| Microsoft Accounts | `SELECT COUNT(*) FROM oauth_accounts WHERE provider='microsoft'` |
| Login Activity (7d) | Time series: password logins, OAuth logins, failed logins per hour |
| OAuth by Provider (30d) | Bar chart: logins grouped by `details->>'provider'` |
| Recent Auth Events | Table: last 50 events from `user_activity` + `audit_logs` (UNION) |

**Data flows into these panels when:**
- A user logs in with password → `user_activity` row (action=`login`, method=`password`)
- A user logs in via OAuth → `user_activity` row (action=`login`, method=`oauth`, provider=`google|github|microsoft`)
- A login fails (bad password) → `audit_logs` row (action=`login_failed`, reason=`invalid_password`)
- A user logs out → `audit_logs` row (action=`logout`)

#### Container Logs (Loki, live)
Two log panels showing real-time K3s pod output:

| Panel | LogQL |
|-------|-------|
| Container Logs | `{job="guardquote-logs"} \|= "" != \`health\`` |
| Auth Errors | `{job="guardquote-logs"} \|~ "(error\|Error\|ERROR\|failed\|OAuth\|401\|403)"` |

Logs are shipped by **Promtail on Pi2** (see [monitoring README](README.md#promtail-pi2--k3s-log-shipping)).

---

## Database Schema (Auth Monitoring)

### `audit_logs`, Failed logins and logout events

```sql
CREATE TABLE audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,  -- 'login_failed', 'logout'
  details    JSONB,                 -- {"reason": "invalid_password"} etc
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);
```

Created 2026-03-17. The backend had insert code for `login_failed` already; table was missing.

### `user_activity`, Successful logins

```sql
-- existing table, relevant columns:
action     VARCHAR(50)  -- 'login', 'logout', 'restore_blog', etc
details    JSONB        -- {"method": "password"} or {"method": "oauth", "provider": "google"}
ip_address VARCHAR(45)
created_at TIMESTAMP
```

OAuth logins now write to this table (added 2026-03-17 in `backend/src/index.ts` OAuth callback).

### `oauth_accounts`, Linked OAuth provider accounts

| provider | count (as of 2026-03-17) |
|----------|--------------------------|
| google | 4 |
| github | 3 |
| microsoft | 0 |

---

## Maintenance Notes

### Grafana admin password

After any Grafana container restart, the admin password must be re-set:
```bash
# On Pi1
docker exec grafana grafana-cli admin reset-admin-password '<password>'
```
The `GF_SECURITY_ADMIN_PASSWORD` env var only takes effect when the admin user does not yet exist. It does not override an existing user's password on restart.

### Dashboard JSON is stored in Grafana's SQLite DB

If panels appear broken (no data, wrong datasource), check:
1. All panel `id` fields are numeric and unique, null IDs cause rendering failures
2. Datasource UIDs match what's in `/api/datasources`
3. For PostgreSQL panels: `rawSql` must have `$__timeFilter(created_at)` or hardcoded interval (the latter is used here for simplicity)
