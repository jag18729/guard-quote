# 🛡️ Isaiah's SecOps Onboarding Guide — GuardQuote v2.0

Welcome to the matrix, Isaiah. You've got Tailscale network admin access. Here's everything you need to hit the ground running.

---

## 📋 Quick Reference Card

| Resource | URL / Address |
|----------|---------------|
| **GitHub Project Board** | https://github.com/users/jag18729/projects/3 |
| **Grafana Dashboards** | https://grafana.vandine.us (admin / `adm1npassw0rD`) |
| **GuardQuote (Live)** | https://guardquote.vandine.us |
| **GuardQuote API** | https://guardquote-origin.vandine.us/health |
| **Backend Repo** | https://github.com/jag18729/guard-quote (branch: `dev`) |
| **Frontend Repo** | https://github.com/jag18729/guardquote-frontend (branch: `master`) |
| **CIT 480 Monorepo** | https://github.com/jag18729/GuardQuote (branch: `main`) |
| **v2 Architecture Doc** | `docs/plans/guardquote-v2-architecture.md` in guard-quote repo |
| **v2 Schema Migration** | `docs/plans/guardquote-v2-schema-migration.sql` in guard-quote repo |
| **Milestone** | `v2.0 — Bun + ML + SDPS` (due March 3, 2026) |

---

## 🌐 Network Topology

```
Internet
    │
    ▼
┌──────────┐
│   UDM    │  192.168.2.1 (Gateway)
│  Router  │
└────┬─────┘
     │ 192.168.2.0/24 (untrust)
     │
┌────┴──────────┐
│   PA-220      │  192.168.2.20 (Palo Alto Firewall)
│  reveal-fw    │
└──┬────┬────┬──┘
   │    │    │
   │    │    └─── eth1/2: dmz-security (192.168.22.0/24)
   │    │              └── pi2 (192.168.22.10) ◄── YOUR PRIMARY BOX
   │    │
   │    └──────── eth1/8: dmz-services (192.168.20.0/24)
   │                   └── pi1 (192.168.20.10) — Monitoring Hub
   │
   └───────────── eth1/1: dmz-mgmt (192.168.21.0/24)
                       └── pi0 (192.168.21.10) — Identity/DNS
```

**Key point:** All cross-zone traffic goes through the PA-220 firewall. The Pis can't talk to each other directly — every packet is inspected.

---

## 🖥️ Infrastructure — What Lives Where

### pi2 — Security Ops (192.168.22.10) — YOUR BOX

This is where your work lives. 16GB RAM, 234GB NVMe, running K3s.

| Service | Access | What It Does |
|---------|--------|--------------|
| **SentinelNet** | `192.168.22.10:30800` | Security monitoring API |
| **Sentinel Grafana** | `192.168.22.10:30880` | Security-specific dashboards |
| **Wazuh** | K3s pod | HIDS/SIEM agent |
| **Suricata** | systemd service | Network IDS |
| **NetTools** | `192.168.22.10:30300` | Network diagnostics API |
| **MarketPulse (Deno)** | `192.168.22.10:30500` | Market research app (production) |
| **MarketPulse (Bun)** | `192.168.22.10:30510` | Bun port (testing) |

**SSH Access:**
```bash
# Via Tailscale (once you're connected):
ssh rafaeljg@<pi2-tailscale-ip>

# Or via direct IP if on the LAN:
ssh rafaeljg@192.168.22.10
```

**K3s basics:**
```bash
# List all pods
sudo kubectl get pods -A

# Check a specific namespace
sudo kubectl get pods -n sentinel
sudo kubectl get pods -n marketpulse
sudo kubectl get pods -n nettools

# Pod logs
sudo kubectl logs -n sentinel <pod-name>

# Describe pod (troubleshooting)
sudo kubectl describe pod -n sentinel <pod-name>
```

### pi1 — Monitoring Hub (192.168.20.10)

| Service | Access | What It Does |
|---------|--------|--------------|
| **Grafana** | `grafana.vandine.us` or `192.168.20.10:3000` | Dashboards for everything |
| **Prometheus** | `192.168.20.10:9090` | Metrics collection (34 targets) |
| **Loki** | `192.168.20.10:3100` | Log aggregation |
| **Alertmanager** | `192.168.20.10:9093` | Alert routing |
| **GuardQuote API** | `192.168.20.10:3002` | Production backend (v3.0.0-node) |

**SSH Access:**
```bash
ssh johnmarston@192.168.20.10
# ⚠️ SSH is SLOW on pi1 — be patient, use:
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_rsa johnmarston@192.168.20.10
```

### pi0 — Identity/DNS (192.168.21.10)

| Service | Access | What It Does |
|---------|--------|--------------|
| **AdGuard Home** | `192.168.21.10:3001` | DNS + ad blocking |
| **LDAP/LAM** | `192.168.21.10:8080` | Identity management |
| **SNMP Exporter** | `192.168.21.10:9116` | SNMP metrics for network gear |
| **Vector** | systemd | Log shipper (firewall, syslog → Loki) |

---

## 🔧 Tailscale Setup

You've been approved as **network admin**. Here's how to connect:

1. **Install Tailscale** on your machine: https://tailscale.com/download
2. **Log in** with the account you were invited with
3. **Verify connection:**
   ```bash
   tailscale status
   ```
4. You should see the other nodes on the tailnet (pi2, ThinkStation, etc.)
5. **SSH via Tailscale IP** — find pi2's Tailscale IP with `tailscale status` and use that for SSH

---

## 📊 Grafana Dashboards

**Login:** https://grafana.vandine.us — `admin` / `adm1npassw0rD`

Three dashboards to know:

1. **🏠 Matrix Lab Overview** (`matrix-lab`) — Bird's-eye view of all hosts, CPU, memory, disk, temps, network I/O
2. **🌐 Network & Firewall** (`network-fw`) — SNMP interface traffic, errors, uptime, ICMP latency, PA-220 logs
3. **🛡️ GuardQuote Operations** (`guardquote-ops`) — App health, Docker containers, security stack status, team roster

**Your dashboards to watch:**
- GuardQuote Ops → Security Stack section (SentinelNet, Wazuh, Suricata status)
- Network & Firewall → Firewall logs (see what the PA-220 is blocking/allowing)

---

## 🔐 Your Focus: SIEM & Security (v2.0)

### What's Built
- Suricata IDS running on pi2 (systemd, watches network traffic)
- Wazuh agent on pi2 (host intrusion detection)
- SentinelNet API for security event aggregation
- Vector on pi2 ships Suricata EVE JSON logs to Loki

### What You're Building for v2.0

**Issue #94 — SIEM Auth Events:**
https://github.com/jag18729/guard-quote/issues/94

The v2 schema includes a `siem_auth_events` table with 35 event types:
- Login success/failure, OAuth flow events, MFA, session management
- CEF severity mapping (0-10)
- Auto-lockout trigger (5 failed logins in 15 min → account locked)
- 90-day retention policy
- Grafana-ready view (`v_siem_summary`)

Schema is at: `docs/plans/guardquote-v2-schema-migration.sql`

**Related issues:**
- **#94** — SIEM auth events integration (your primary)
- **#91** — OAuth routes (feeds auth events)
- **#92** — ML engine (may generate security-relevant events)
- **#93** — Demo mode (needs fake SIEM data for SDPS showcase)

### SIEM Event Types You'll Implement
```
LOGIN_SUCCESS, LOGIN_FAILURE, LOGIN_LOCKOUT,
OAUTH_INITIATED, OAUTH_SUCCESS, OAUTH_FAILURE, OAUTH_LINK, OAUTH_UNLINK,
SESSION_CREATED, SESSION_EXPIRED, SESSION_REVOKED,
PASSWORD_CHANGED, PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE,
MFA_ENABLED, MFA_DISABLED, MFA_SUCCESS, MFA_FAILURE,
ACCOUNT_CREATED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED, ACCOUNT_DELETED,
ROLE_CHANGED, PERMISSION_GRANTED, PERMISSION_REVOKED,
API_KEY_CREATED, API_KEY_REVOKED,
SUSPICIOUS_ACTIVITY, BRUTE_FORCE_DETECTED, GEO_ANOMALY,
DATA_EXPORT, BULK_OPERATION, ADMIN_ACTION,
RATE_LIMIT_HIT, IP_BLOCKED, CORS_VIOLATION
```

---

## 🏗️ Project Board & Workflow

**Board:** https://github.com/users/jag18729/projects/3

### Phases
| Phase | Focus | Issues |
|-------|-------|--------|
| **Phase 1** (Now) | Backend port, OAuth, DB schema | #90, #91, #98 |
| **Phase 2** | ML engine, SIEM, email | #92, #94 |
| **Phase 3** | Demo mode, frontend, deploy | #93, #95, #96, #97 |

### Your Issues
- **#94** — SIEM Auth Events (Phase 2, P1 priority)
- Touch points with #91 (OAuth) and #93 (demo mode)

### Branch Strategy
- **`dev`** branch for all v2 work on `guard-quote` repo
- **`master`** on `guardquote-frontend` for frontend
- **`main`** on `GuardQuote` monorepo (CIT 480 reference)

---

## 🔑 Secrets & Security

**NEVER commit secrets to the public repos.** The repos are public.

- OAuth client IDs are safe to reference (they're in redirect URLs anyway)
- OAuth client secrets, JWT secrets, DB passwords → **GitHub Secrets only**
- App refuses to start without required env vars (`JWT_SECRET`, `DB_PASSWORD`) — this is intentional
- `.env.example` files show what's needed without real values

**GitHub Secrets (already configured):**
- `guard-quote` repo: `JWT_SECRET`, `GH_OAUTH_CLIENT_ID`, `GH_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `GuardQuote` monorepo: `JWT_SECRET`, `DB_PASSWORD`

---

## 📁 Key Files to Read

Start here to understand the codebase:

1. **Architecture:** `docs/plans/guardquote-v2-architecture.md` — the full v2 design
2. **Schema:** `docs/plans/guardquote-v2-schema-migration.sql` — DB tables including SIEM
3. **Backend entry:** `backend/src/server.ts` (current Hono-based, being ported to Bun.serve)
4. **Frontend entry:** `src/App.tsx` → routes in React Router 7
5. **README:** Updated with v2 roadmap, team roster, architecture diagram

---

## 🧪 Local Dev Setup

```bash
# Clone the backend
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote
git checkout dev

# Install deps (using Bun — install from https://bun.sh)
bun install

# Set env vars (copy example and fill in)
cp backend/.env.example backend/.env
# Edit .env with real values (ask Rafael for secrets)

# Run
bun run dev
```

**Frontend:**
```bash
git clone https://github.com/jag18729/guardquote-frontend.git
cd guardquote-frontend
bun install
bun run dev
# Opens at http://localhost:5173
```

---

## 📅 Critical Deadline

> **SDPS Registration: March 3, 2026**
>
> This is the Senior Design Project Showcase. We demo GuardQuote to industry professionals. The demo needs to work — OAuth login, ML predictions, SIEM event log, the whole thing. Demo mode (#93) will provide mock data for the showcase.

---

## 💬 Questions?

- **Rafael (Lead):** GitHub @jag18729
- **Milkias (IAM):** GitHub @malachite
- **Xavier (Infra):** GitHub @xan
- **Grafana:** Always your first stop for "is it running?" questions
- **Project Board:** Track progress and pick up issues

Welcome aboard. Let's ship this. 🚀
