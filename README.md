# GuardQuote

**ML-powered security service pricing platform**

Get instant, accurate quotes for security services — from event security to executive protection.

🌐 **Live Site:** https://guardquote.vandine.us  
📊 **Admin Dashboard:** https://guardquote.vandine.us/admin  
📋 **Project Board:** https://github.com/users/jag18729/projects/1

---

## 👥 Team

| Name | GitHub | Role | Responsibilities |
|------|--------|------|------------------|
| **Rafael Garcia** | [@jag18729](https://github.com/jag18729) | Lead Developer | App dev, CI/CD, ML, SSO/OAuth, networking & infrastructure |
| **Milkias Kassa** | [@Malachizirgod](https://github.com/Malachizirgod) | ICAM Lead + PM | Security review (OWASP), GitHub Projects, documentation |
| **Isaiah Bernal** | [@ibernal1815](https://github.com/ibernal1815) | Security Ops | SIEM (Elastic Stack), his bastion host, IDS/IPS, detection rules |
| **Xavier Nguyen** | [@xan942](https://github.com/xan942) | UX Lead + UAT | User experience, UAT driver, presentations, slides |

---

## 🏗️ Architecture

**Zero AWS. Zero monthly cost. Full ownership.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                                      │
│                                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│   │    Pages     │   │   Workers    │   │   Tunnel     │                   │
│   │  (Frontend)  │   │ (API Gateway)│   │  (Ingress)   │                   │
│   └──────────────┘   └──────────────┘   └──────────────┘                   │
│                                                                              │
│   ┌──────────────┐   ┌──────────────┐                                       │
│   │    Access    │   │     DNS      │                                       │
│   │ (Zero Trust) │   │ guardquote.  │                                       │
│   │  Email OTP   │   │  vandine.us  │                                       │
│   └──────────────┘   └──────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                            Secure Tunnel (QUIC)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VANDINE HOME LAB (192.168.2.0/24)                       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Pi1 - Application Server                          │   │
│   │                    192.168.2.70 │ Ubuntu 25.10                       │   │
│   │                                                                      │   │
│   │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│   │   │ GuardQuote │  │ PostgreSQL │  │  Grafana   │  │ Prometheus │   │   │
│   │   │    API     │  │   :5432    │  │   :3000    │  │   :9090    │   │   │
│   │   │   :3002    │  │            │  │            │  │            │   │   │
│   │   │ Deno+Hono  │  │  Database  │  │ Dashboards │  │  Metrics   │   │   │
│   │   └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Pi0 - Monitoring & Logs                           │   │
│   │                    192.168.2.101 │ Ubuntu 25.10                      │   │
│   │                                                                      │   │
│   │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│   │   │   Vector   │  │   LDAP     │  │  rsyslog   │  │    NFS     │   │   │
│   │   │   (Logs)   │  │   :389     │  │   :514     │  │   :2049    │   │   │
│   │   └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌──────────────┐                    ┌──────────────┐                      │
│   │    PA-220    │◄── SNMP/Syslog ──►│     UDM      │                      │
│   │   Firewall   │                    │    Router    │                      │
│   │ 192.168.2.14 │                    │ 192.168.2.1  │                      │
│   └──────────────┘                    └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                            Tailscale Mesh (WireGuard)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY / SIEM                                      │
│                                                                              │
│   ┌────────────────────────┐          ┌────────────────────────┐            │
│   │   Rafa's Bastion       │          │   Isaiah's Bastion     │            │
│   │   (nettools.vandine.us)│          │   (his infrastructure) │            │
│   │   • pi0 hosted         │          │   • Elastic Stack      │            │
│   │   • Web terminal       │          │   • Elasticsearch      │            │
│   │   • LDAP auth          │          │   • Logstash           │            │
│   │   • Network diag       │          │   • Kibana dashboards  │            │
│   └───────────┬────────────┘          └───────────┬────────────┘            │
│               │                                   │                          │
│               └───────────────┬───────────────────┘                          │
│                               │                                              │
│                               ▼                                              │
│               ┌───────────────────────────────────┐                          │
│               │         Elastic Stack (ELK)       │                          │
│               │   • Centralized log aggregation   │                          │
│               │   • Detection rules & alerts      │                          │
│               │   • Security dashboards           │                          │
│               └───────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind | Cloudflare Pages |
| **Backend** | Deno 2.6 + Hono | Replaced Bun (ARM compatibility) |
| **Database** | PostgreSQL 16 | Self-hosted on Pi1 |
| **Monitoring** | Grafana + Prometheus + Loki | Full observability stack |
| **Log Pipeline** | Vector → Loki / Elastic | Centralized logging |
| **SIEM** | Elastic Stack (ELK) | Security monitoring |
| **Auth** | bcrypt + JWT | Admin authentication |
| **Edge** | Cloudflare Workers + Tunnel | Zero Trust access |
| **Mesh VPN** | Tailscale | Site-to-site connectivity |
| **DNS** | Cloudflare | guardquote.vandine.us |

**Operational Cost: $0/month** ✨

---

## 🚀 Quick Start

### Clone & Setup

```bash
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote/frontend
npm install
npm run dev
# → http://localhost:5173
```

### Build & Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=guardquote
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full dev workflow.

---

## 📁 Project Structure

```
guard-quote/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI (DataFlowDiagram, etc.)
│   │   ├── pages/
│   │   │   ├── Landing.tsx   # Public homepage
│   │   │   ├── QuoteForm.tsx # Quote wizard
│   │   │   └── admin/        # Admin dashboard pages
│   │   ├── layouts/          # Page wrappers
│   │   └── lib/              # Utilities
│   └── package.json
├── docs/                     # Documentation
│   ├── TEAM-TASKS.md         # Current sprint tasks
│   ├── QUICKSTART-ISAIAH.md  # SIEM onboarding
│   └── SIEM-SETUP-ISAIAH.md  # Full SIEM guide
├── scripts/                  # Automation
├── .github/
│   ├── workflows/            # CI/CD
│   └── ISSUE_TEMPLATE/       # Issue templates
├── CONTRIBUTING.md           # How to contribute
└── README.md
```

---

## 🔐 Access

### Sites

| Site | URL | Auth |
|------|-----|------|
| Client | https://guardquote.vandine.us/ | Public |
| Quote Form | https://guardquote.vandine.us/quote | Public |
| Admin | https://guardquote.vandine.us/admin | Login required |
| Grafana | https://grafana.vandine.us | Cloudflare Access |

### Admin Login

```
Email: admin@guardquote.com
Password: admin123
```

### SSH (Team)

```bash
# Via Tailscale (ask Rafa for invite)
ssh rafaeljg@100.114.94.18    # pi0
ssh johnmarston@100.77.26.41  # pi1
```

---

## 📊 Features

### Client Portal
- ✅ 4-step quote wizard
- ✅ Instant ML-powered pricing
- ✅ No account required
- ✅ Mobile responsive

### Admin Dashboard
- 📊 Real-time analytics
- 📋 Quote management
- 🧠 ML model controls
- 👥 User management (RBAC)
- 🔧 Service monitoring
- 📡 Network operations
- 📝 Blog & feature requests

### Infrastructure
- 🗺️ Interactive data pipeline diagram
- 📈 Prometheus + Grafana monitoring
- 📝 Centralized logging (Vector → Loki)
- 🛡️ SIEM integration (Elastic Stack)
- 🔒 Zero Trust access (Cloudflare)

---

## 🧠 ML Engine

### Pricing Model v2.0

```
Price = BaseRate × RiskMultiplier × LocationModifier × Hours × Guards
```

| Factor | Description |
|--------|-------------|
| BaseRate | Event type lookup table |
| RiskMultiplier | Event risk level (1.0 - 1.5x) |
| LocationModifier | City/region pricing |
| Confidence | 70-95% based on data quality |

### Training Data
- 500+ historical quotes
- 15 event types
- 28 locations

---

## 📋 Current Sprint

See [docs/TEAM-TASKS.md](./docs/TEAM-TASKS.md) for:
- Role assignments
- Task checklist
- Meeting notes

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live Site** | https://guardquote.vandine.us |
| **GitHub Repo** | https://github.com/jag18729/guard-quote |
| **Project Board** | https://github.com/users/jag18729/projects/1 |
| **Grafana** | https://grafana.vandine.us |
| **API Origin** | https://guardquote-origin.vandine.us |

---

## 📄 License

Private - California State University, Los Angeles - Capstone Project

---

*Last updated: 2026-02-07*
