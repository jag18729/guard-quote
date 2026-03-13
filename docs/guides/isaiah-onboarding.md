# 🛡️ SecOps Onboarding — GuardQuote v2.0

Welcome to the team. Here's everything you need to get going.

---

## 📋 Links

| Resource | URL |
|----------|-----|
| **Project Board** | https://github.com/users/jag18729/projects/3 |
| **Grafana** | https://grafana.vandine.us |
| **GuardQuote (Live)** | https://guardquote.vandine.us |
| **Repo** | https://github.com/jag18729/guard-quote (`main`) |

---

## 🌐 Getting Connected

1. **Tailscale** — You've been approved as network admin. Install from https://tailscale.com/download and log in. Run `tailscale status` to see the mesh.
2. **SSH** — Once on Tailscale, SSH to Pi2 (your primary box) and Pi1 (monitoring). Ask Rafael for credentials.
3. **Grafana** — Credentials in the `.env` file (ask Rafael). Direct link: https://grafana.vandine.us

---

## 🔑 Secrets

All credentials, IPs, and infrastructure details are in the shared `.env` file. **Ask Rafael for it.**

```bash
# Drop it in the repo root (it's gitignored)
cp ~/path/to/shared.env .env
```

**Rules:**
- Never commit `.env` — it's in `.gitignore`
- Never put credentials in code, comments, docs, or messages
- GitHub Secrets handle CI/CD — don't touch those

---

## 🏗️ Architecture

```
Internet → Cloudflare Tunnel → Pi2 K3s (NodePort 30522)
                                    │
                              GuardQuote Backend (Bun + Hono)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
             PostgreSQL 17                   ML Engine
             (Pi1 via Tailscale)          (K3s on Pi2)
             100.77.26.41:5432
```

**Key point:** PA-220 firewall blocks direct traffic between Pi zones. All cross-host connections (DB, OAuth, monitoring) route through **Tailscale**. This is why you can't reach Pi1's PostgreSQL from Pi2 directly.

Three Pis behind a Palo Alto PA-220 firewall, each in its own DMZ zone:
- **pi0** (dmz-mgmt) — DNS/AdGuard, LDAP, SNMP, NFS log archive
- **pi1** (dmz-services) — PostgreSQL 17, Grafana, Prometheus, Loki — **monitoring**
- **pi2** (dmz-security) — K3s (GuardQuote v2), Wazuh HIDS, cloudflared — **your primary box**
- **RV2** (dmz-security) — Suricata IDS (74k rules), lab bastion

---

## 🔐 Your Focus: SIEM & Security Monitoring

### What's Running on Pi2 (Your Box)

```bash
# SSH in
ssh rafaeljg@100.111.113.35

# K3s workloads
kubectl get pods -n guardquote    # app workloads
kubectl get pods -n sentinel      # SentinelNet + Sentinel Grafana
kubectl get pods -n nettools      # NetTools API

# Wazuh (Docker)
docker ps | grep wazuh

# Suricata is on RV2, NOT Pi2 (moved for disk reasons)
ssh rafaeljg@100.118.229.114 "systemctl status suricata"
```

### Security Stack

| Service | Host | Access | Status |
|---------|------|--------|--------|
| Wazuh HIDS | Pi2 Docker | `https://100.111.113.35:55000/` | ✅ Running |
| Suricata IDS | RV2 | port 8090 | ✅ Running |
| Sentinel Grafana | Pi2 K3s (:30300) | internal | ✅ Running |
| SentinelNet API | Pi2 K3s (:30800) | internal | ⚠️ Image missing — needs rebuild |
| Wazuh alerts → Loki | Pi2 → Pi1 | `{job="wazuh-alerts"}` in Grafana | ✅ Flowing |

### Grafana Log Queries

```
# Wazuh alerts
{job="wazuh-alerts"}

# High severity only
{job="wazuh-alerts", level="high"}

# Suricata IDS events
{job="suricata"}

# GuardQuote app logs
{source="vector", host="pi2"}
```

### Wazuh Agents

| Agent | Host | ID | Status |
|-------|------|----|--------|
| 001 | Pi1 | 001 | Active |
| 002 | Pi0 | 002 | Active |
| 003 | ThinkStation | 003 | Active |
| 004 | XPS | 004 | Active |
| 005 | isaiah-pi | 005 | Registered |

---

## 🧪 Local Dev

```bash
# Clone
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Get the .env from Rafael, drop it in repo root

# Install + run backend (Bun: https://bun.sh)
cd backend && bun install && bun run dev

# Frontend
cd frontend && bun install && bun run dev
# http://localhost:5173
```

---

## 📋 Your Issues

| Issue | Title | Priority |
|-------|-------|----------|
| #56 | [UAT] Isaiah: Security & Monitoring | High |
| #110 | Wazuh alert analysis + tuning | High |
| #124 | Kali penetration testing — real attack data | Medium |
| #109 | RV2 Edge IDS + Pi Fleet panels | Medium |

---

## 🧰 Useful Commands

```bash
# Check GuardQuote health
curl https://guardquote.vandine.us/api/health

# Wazuh API (from Pi2)
curl -k -u wazuh-admin:VandineWazuh2026! https://localhost:55000/

# Suricata rules count on RV2
ssh rafaeljg@100.118.229.114 "grep -c '^alert' /var/lib/suricata/rules/suricata.rules"

# Disk usage on Pi2 (keep under 75%)
df -h /

# View Wazuh alerts in Loki (via Grafana Explore)
# {job="wazuh-alerts", level="high"}
```

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Rafael Garcia | Lead — CI/CD, ML, Data | @jag18729 |
| Milkias Kassa | IAM — Identity & Access | @Malachizirgod |
| Isaiah Bernal | SecOps — SIEM & Security | @ibernal1815 |
| Xavier Nguyen | UX — Design & Frontend | @xan942 |

---

*Last updated: 2026-03-12*
