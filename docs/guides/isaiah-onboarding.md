# 🛡️ SecOps Onboarding — GuardQuote v2.0

Welcome to the team. Here's everything you need to get going.

---

## 📋 Links

| Resource | URL |
|----------|-----|
| **Project Board** | https://github.com/users/jag18729/projects/3 |
| **Grafana** | https://grafana.vandine.us |
| **GuardQuote (Live)** | https://guardquote.vandine.us |
| **Backend Repo** | https://github.com/jag18729/guard-quote (`dev` branch) |
| **Frontend Repo** | https://github.com/jag18729/guardquote-frontend (`master`) |
| **CIT 480 Monorepo** | https://github.com/jag18729/GuardQuote (`main`) |

---

## 🌐 Getting Connected

1. **Tailscale** — You've been approved as network admin. Install from https://tailscale.com/download and log in. Run `tailscale status` to see the mesh.
2. **SSH** — Once on Tailscale, you can SSH into the Pis. Ask Rafael for usernames and Tailscale IPs.
3. **Grafana** — Credentials in the `.env` file (see below).

---

## 🔑 Secrets

All credentials, IPs, and infrastructure details are in the shared `.env` file. **Ask Rafael for it.**

```bash
# Drop it in the repo root (it's gitignored)
cp ~/path/to/shared.env .env

# Bun loads it automatically — no imports needed
bun run dev
```

The `.env.example` in the repo shows every variable you need. The `.env` has the real values.

**Rules:**
- Never commit `.env` — it's in `.gitignore`
- Never put credentials in code, comments, docs, or Slack messages
- GitHub Secrets handle CI/CD — you don't need to touch those

---

## 🏗️ Architecture

```
Internet → Cloudflare Pages (frontend)
              ↓ /api/* proxy
         CF Tunnel → Pi cluster (backend API)
                        ↓
                     PostgreSQL
                        ↓
                     ML Engine (v2)
```

The backend currently runs on Node.js + Hono. We're porting to Bun 1.3 for v2.

Three Pis behind a Palo Alto PA-220 firewall, each in its own DMZ zone:
- **pi0** — Identity, DNS, log collection
- **pi1** — Monitoring (Grafana, Prometheus, Loki), current GuardQuote backend
- **pi2** — Security ops (Suricata, Wazuh, SentinelNet), K3s — **your primary box**

Details (IPs, ports, zones) are in the `.env` file and on Grafana dashboards.

---

## 🔐 Your Focus: SIEM & Security

### What Exists
- Suricata IDS on pi2 (network traffic analysis)
- Wazuh agent on pi2 (host intrusion detection)
- SentinelNet API (security event aggregation)
- Logs ship to Loki via Vector

### What You're Building

**Issue #94 — SIEM Auth Events:**
https://github.com/jag18729/guard-quote/issues/94

A `siem_auth_events` table tracking 35 event types across the app:

```
LOGIN_SUCCESS, LOGIN_FAILURE, LOGIN_LOCKOUT,
OAUTH_INITIATED, OAUTH_SUCCESS, OAUTH_FAILURE,
SESSION_CREATED, SESSION_EXPIRED, SESSION_REVOKED,
PASSWORD_CHANGED, PASSWORD_RESET_REQUEST,
ACCOUNT_CREATED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED,
MFA_ENABLED, MFA_DISABLED, MFA_SUCCESS, MFA_FAILURE,
SUSPICIOUS_ACTIVITY, BRUTE_FORCE_DETECTED, GEO_ANOMALY,
RATE_LIMIT_HIT, IP_BLOCKED, CORS_VIOLATION
... and more
```

Features:
- CEF severity mapping (0-10)
- Auto-lockout trigger (5 failed logins in 15 min)
- 90-day retention policy
- Grafana-ready summary view

**Full schema:** `docs/plans/guardquote-v2-schema-migration.sql`
**Architecture doc:** `docs/plans/guardquote-v2-architecture.md`

### Related Issues
- **#91** — OAuth routes (feeds auth events to your SIEM table)
- **#92** — ML engine (may generate security events)
- **#93** — Demo mode (needs sample SIEM data for showcase)

---

## 📅 Project Board

**Board:** https://github.com/users/jag18729/projects/3

| Phase | Focus | Issues |
|-------|-------|--------|
| **Phase 1** (Now) | Backend port, OAuth, DB schema | #90, #91, #98 |
| **Phase 2** | ML engine, SIEM, email | #92, #94 |
| **Phase 3** | Demo mode, frontend, deploy | #93, #95, #96, #97 |

Your primary: **#94 — SIEM Auth Events** (Phase 2, P1 priority)

---

## 🧪 Local Dev

```bash
# Clone
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote
git checkout dev

# Get the .env from Rafael, drop it in repo root

# Install + run (Bun: https://bun.sh)
bun install
bun run dev
```

**Frontend:**
```bash
cd frontend
bun install
bun run dev
# http://localhost:5173
```

---

## 📅 Deadline

> **SDPS Registration: March 3, 2026**
>
> Senior Design Project Showcase — we demo to industry professionals.
> Everything needs to work: OAuth login, ML predictions, SIEM event log.
> Demo mode (#93) provides mock data for the showcase.

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Rafael Garcia | Lead — CI/CD, ML, Data | @jag18729 |
| Milkias Kassa | IAM — Identity & Access | @Malachizirgod |
| Isaiah Bernal | SecOps — SIEM & Security | @ibernal1815 |
| Xavier Nguyen | Infra — Networking | @xan942 |

---

## 📁 Start Here

1. Read `docs/plans/guardquote-v2-architecture.md` — the full v2 design
2. Read `docs/plans/guardquote-v2-schema-migration.sql` — your SIEM table
3. Browse the Grafana dashboards — get familiar with what's monitored
4. Check the project board — find your issues

Let's ship it. 🚀
