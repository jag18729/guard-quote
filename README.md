# GuardQuote

**ML-powered security service pricing platform**

Get instant, accurate quotes for security services — from event security to executive protection.

🌐 **Live Site:** https://guardquote.vandine.us
📊 **Admin Dashboard:** https://guardquote.vandine.us/admin
📋 **Project Board:** https://github.com/users/jag18729/projects/3
📐 **Architecture Doc:** [docs/plans/guardquote-v2-architecture.md](./docs/plans/guardquote-v2-architecture.md)

---

## 👥 Team

| Name | GitHub | Role | Responsibilities |
|------|--------|------|------------------|
| **Rafael Garcia** | [@jag18729](https://github.com/jag18729) | Lead Developer | App dev, CI/CD, ML, SSO/OAuth, networking & infrastructure |
| **Milkias Kassa** | [@Malachizirgod](https://github.com/Malachizirgod) | ICAM Lead + PM | Security review (OWASP), GitHub Projects, documentation |
| **Isaiah Bernal** | [@ibernal1815](https://github.com/ibernal1815) | Security Ops | SIEM, IDS/IPS, detection rules |
| **Xavier Nguyen** | [@xan942](https://github.com/xan942) | UX Lead + UAT | User experience, UAT driver, presentations, slides |

---

## 🗺️ Roadmap — v2.0

> **Target: SDPS (Senior Design Project Showcase) — March 3, 2026**

### Phase 1: Backend Port + OAuth *(In Progress)*
- [ ] Port backend from Hono → native **Bun 1.3** `Bun.serve()` ([#90](https://github.com/jag18729/guard-quote/issues/90))
- [x] OAuth SSO — **GitHub + Google** registered & verified ([#99](https://github.com/jag18729/guard-quote/issues/99))
- [ ] Implement OAuth routes & account linking ([#91](https://github.com/jag18729/guard-quote/issues/91))
- [ ] Database schema v2 — OAuth, SIEM events, ML predictions ([#98](https://github.com/jag18729/guard-quote/issues/98))
- [x] Fix EVENT_TYPE_MAP pricing bug ([#88](https://github.com/jag18729/guard-quote/issues/88))
- [ ] Remove ~2,350 lines of infrastructure overlap ([#95](https://github.com/jag18729/guard-quote/issues/95))

### Phase 2: ML Engine + Enrichment
- [ ] 3-source ML engine: XGBoost + external APIs + rule engine ([#92](https://github.com/jag18729/guard-quote/issues/92))
- [ ] Email workflows — quotes, notifications, ML reports ([#94](https://github.com/jag18729/guard-quote/issues/94))

### Phase 3: Frontend + SDPS Demo
- [ ] Frontend updates — OAuth UI, ML dashboard ([#97](https://github.com/jag18729/guard-quote/issues/97))
- [ ] DEMO_MODE for SDPS showcase + local dev ([#93](https://github.com/jag18729/guard-quote/issues/93))
- [ ] SDPS Registration — **deadline March 3** ([#100](https://github.com/jag18729/guard-quote/issues/100))

### Infrastructure
- [ ] Migrate PostgreSQL to dedicated Orange Pi RV2 server ([#89](https://github.com/jag18729/guard-quote/issues/89))
- [ ] Deploy on pi2 Raspberry Pi 5 K3s cluster ([#96](https://github.com/jag18729/guard-quote/issues/96))

---

## 🏗️ Architecture

**Zero AWS. Zero monthly cost. Full ownership.**

### Current (v1 — Production)
```
Internet → Cloudflare Tunnel → Pi1 (Node.js :3002) → PostgreSQL
                                 └── Grafana, Prometheus, Loki
```

### v2 Target Architecture
```
Internet → Cloudflare Tunnel → Pi1 (cloudflared)
                                  │
                         PA-220 Firewall
                                  │
                                  ▼
                    Pi2 — Raspberry Pi 5 (K3s)
                    ├── GuardQuote API (Bun 1.3)     :30520
                    ├── ML Engine (Python FastAPI)    ClusterIP
                    ├── MarketPulse (Bun 1.3)        :30510
                    ├── SentinelNet                   
                    └── Redis (shared cache)          ClusterIP
                                  │
                         PA-220 Firewall
                                  │
                    Orange Pi RV2 — Dedicated DB
                    └── PostgreSQL 16 (500GB NVMe)

                    Pi3 — Off-site (Mom's house)
                    └── Remote health probe (WireGuard)
```

### Network Topology
```
Studio (Reveal SOHO):
├── ThinkStation           — Dev workstation, OpenClaw gateway
├── PA-220 reveal-fw       — Palo Alto firewall, 4 security zones
├── UDM                    — UniFi gateway/router
├── pi0                    — DNS, SNMP, log shipping (dmz-mgmt)
├── pi1                    — Monitoring: Grafana/Prometheus/Loki (dmz-services)
├── pi2                    — K3s workloads, 16GB RAM, 234GB NVMe (dmz-security)
└── Orange Pi RV2 (TBD)    — PostgreSQL server, 8GB RAM, 500GB NVMe

Remote:
└── pi3 (TBD)              — Off-site monitoring, WireGuard tunnel

# IPs and access details are in the team .env file (shared privately)
```

---

## 💻 Tech Stack

### Current (v1)
| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind, React Router 7, Framer Motion |
| **Backend** | Node.js v3.0.0 + dd-trace (production), Hono (dev branch) |
| **Database** | PostgreSQL 16 (15 event types, 28 locations) |
| **Auth** | bcrypt + JWT |
| **Edge** | Cloudflare Tunnel |

### v2 Target
| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | **Bun 1.3** native `Bun.serve()` | Zero-framework, single binary |
| **Auth** | **OAuth 2.0** (GitHub + Google) + argon2id | PKCE, httpOnly cookies |
| **ML Engine** | Python FastAPI + **XGBoost** | 3-source: model + APIs + rules |
| **Enrichment** | NWS Weather, Census ACS, PredictHQ | Free tier APIs |
| **Deployment** | **K3s** on Pi 5 (ARM64) | `--smol` flag, ~20MB memory |
| **Database** | PostgreSQL 16 on **Orange Pi RV2** (RISC-V) | Dedicated server, 500GB NVMe |
| **SIEM** | Auth event logging (35 event types) | CEF severity, auto-lockout |
| **Monitoring** | Grafana + Prometheus + Loki + Vector | Replaces custom infra code |

**Operational Cost: $0/month** ✨

---

## 🔐 Authentication (v2)

### OAuth SSO — Verified ✅

| Provider | Status | Scopes | Data Captured |
|----------|--------|--------|---------------|
| **GitHub** | ✅ Verified | `read:user`, `user:email` | login, id, name, email(s), avatar, company, location, bio, repos, followers |
| **Google** | ✅ Verified | `openid`, `email`, `profile` | sub, name, given/family name, email, picture, locale, verified status |

- Raw OAuth 2.0 flows (no framework)
- PKCE recommended for public clients
- httpOnly cookies for session tokens
- Account linking by verified email
- Auto-lockout after 5 failed attempts (15 min)
- Full SIEM auth event logging (35 event types)

### SIEM Auth Events

Every authentication action is logged to `siem_auth_events` with CEF-compatible severity:

| Category | Events |
|----------|--------|
| **Auth** | login_success, login_failure, logout, token_refresh, token_expired |
| **OAuth** | oauth_authorize_start, oauth_callback_success/failure, oauth_linked/unlinked |
| **Account** | password_change/reset, email_change, role_change, account_locked/created |
| **Abuse** | rate_limited, brute_force_detected, suspicious_activity, impossible_travel |
| **Admin** | admin_user_create/update/delete, admin_role_change, admin_session_revoke |

---

## 🧠 ML Engine (v2)

### 3-Source Intelligence

```
Quote Request
     │
     ▼
┌─────────────────────────────────────┐
│         ML Microservice             │
│         (Python FastAPI)            │
│                                     │
│  ┌───────────┐  ┌──────────────┐   │
│  │  XGBoost  │  │ External API │   │
│  │  (trained │  │ Enrichment   │   │
│  │   model)  │  │              │   │
│  │  weight:  │  │ • NWS Weather│   │
│  │   ~60%    │  │ • Census ACS │   │
│  └─────┬─────┘  │ • PredictHQ │   │
│        │        │  weight: ~25%│   │
│        │        └──────┬───────┘   │
│        │               │           │
│        ▼               ▼           │
│  ┌─────────────────────────────┐   │
│  │    Ensemble Blender         │   │
│  │  confidence-weighted price  │◄──┤ Rule Engine
│  └─────────────┬───────────────┘   │ (business rules)
│                │                   │  weight: ~15%
└────────────────┼───────────────────┘
                 │
                 ▼
        Price + Confidence + Breakdown
```

| Source | Purpose | Weight |
|--------|---------|--------|
| **XGBoost Model** | Trained on historical quotes | ~60% |
| **External APIs** | Weather, demographics, concurrent events | ~25% |
| **Rule Engine** | Business rules, min/max, multipliers | ~15% |

### Training Data
- 500+ historical quotes
- 15 event types (corporate, concert, sports, private, construction, retail, residential, gov_rally, industrial, music_festival, retail_lp, social_wedding, tech_summit, vip_protection, + more)
- 28 locations across US

---

## 🚀 Quick Start

### Development

```bash
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Backend (dev branch)
cd backend && bun install && bun run dev
# → http://localhost:3002
```

### Demo Mode (v2)
```bash
DEMO_MODE=true bun run src/server.ts
# No DB, no Redis, no ML service needed — mock data for everything
```

---

## 📁 Project Structure

```
guard-quote/
├── frontend/                 # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Landing.tsx   # Public homepage
│   │   │   ├── QuoteForm.tsx # Quote wizard
│   │   │   ├── Login.tsx     # Auth (+ OAuth buttons in v2)
│   │   │   └── admin/        # Admin dashboard pages
│   │   ├── contexts/         # AuthContext, etc.
│   │   └── lib/              # Utilities
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.ts         # Main entry (Bun.serve in v2)
│   │   ├── services/
│   │   │   ├── auth.ts       # JWT + password hashing
│   │   │   ├── quote-calculator.ts  # Pricing logic
│   │   │   └── email.ts      # Resend integration
│   │   ├── middleware/
│   │   │   ├── rate-limit.ts # Redis sliding window
│   │   │   └── s2s-auth.ts   # PSK for ML service
│   │   ├── schemas/          # Zod validation
│   │   └── db/
│   │       └── schema.sql    # PostgreSQL DDL (170 lines)
│   └── package.json
├── ml-engine/                # Python ML service (v2)
├── docs/
│   ├── plans/
│   │   ├── guardquote-v2-architecture.md  # 1,462-line architecture doc
│   │   ├── guardquote-v2-schema-migration.sql  # v2 schema (OAuth, SIEM, ML)
│   │   └── hardware-integration.md  # Orange Pi + Pi3 plan
│   ├── TEAM-TASKS.md
│   └── bun-reference.md      # Bun 1.3 patterns reference
├── .github/
│   ├── workflows/            # CI/CD
│   └── ISSUE_TEMPLATE/
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

---

## 📊 Database Schema (v2)

### Existing Tables
`users` · `locations` · `event_types` · `service_options` · `clients` · `quotes` · `quote_line_items` · `quote_status_history` · `ml_training_data` · `webhooks` · `webhook_logs`

### New in v2
| Table | Purpose |
|-------|---------|
| `oauth_providers` | GitHub/Google identity linking with full profile data |
| `user_emails` | All verified emails across providers (for account matching) |
| `auth_sessions` | Active session tracking with token hashes |
| `siem_auth_events` | Security event log — 35 event types, CEF severity |
| `ml_predictions` | Per-quote ML output with source breakdown + enrichment |
| `ml_models` | Model version tracking, metrics, lifecycle |
| `pricing_rules` | Typed business rules with simple operators |

Full migration: [`docs/plans/guardquote-v2-schema-migration.sql`](./docs/plans/guardquote-v2-schema-migration.sql)

---

## 🔐 Access

### Sites

| Site | URL | Auth |
|------|-----|------|
| Client Landing | https://guardquote.vandine.us/ | Public |
| Quote Form | https://guardquote.vandine.us/quote | Public |
| Admin Dashboard | https://guardquote.vandine.us/admin | Login required |
| Grafana | https://grafana.vandine.us | Admin |

### Admin Login
```
Credentials in team .env file (shared privately)
```

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live Site** | https://guardquote.vandine.us |
| **v2 Project Board** | https://github.com/users/jag18729/projects/3 |
| **v2 Architecture** | [docs/plans/guardquote-v2-architecture.md](./docs/plans/guardquote-v2-architecture.md) |
| **Grafana** | https://grafana.vandine.us |
| **MarketPulse** | https://market.vandine.us |

---

## 📅 Milestones

| Milestone | Due | Status |
|-----------|-----|--------|
| v2.0 — Bun + ML + SDPS | **March 3, 2026** | 🔄 In Progress |
| UAT Round 1 | Complete | ✅ 13/17 issues closed |
| Sprint 2 — Security | Complete | ✅ |

---

## 📄 License

Private — California State University, Northridge — Senior Design Project (CIT 480)

---

*Last updated: 2026-02-18*
