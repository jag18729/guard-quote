# GuardQuote

**ML-powered security service pricing platform, designed from need, not flash**

Every technology choice solves a real problem, supply chain risk, resource constraints, operational complexity, cost. This is how we think security applications should be architected in 2026.

[![Live Site](https://img.shields.io/badge/Live-guardquote.vandine.us-orange)](https://guardquote.vandine.us)
[![CI](https://github.com/jag18729/guard-quote/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/jag18729/guard-quote/actions)
[![Security](https://github.com/jag18729/guard-quote/actions/workflows/security.yml/badge.svg)](https://github.com/jag18729/guard-quote/actions)

---

## Features

- **Instant Quotes**: ML-powered pricing in seconds, not days
- **OAuth Login**: Sign in with GitHub, Google, or Microsoft
- **Smart Risk Assessment**: AI evaluates event complexity and security needs
- **Transparent Pricing**: No hidden fees; see exactly what you're paying for
- **Admin Dashboard**: Manage quotes, users, and view analytics
- **SOC Dashboard**: Real-time security command center with MITRE ATT&CK mapping, ML anomaly detection, and threat intelligence
- **SIEM Integration**: Wazuh Manager with 5 agents, Suricata IDS with 47,291 rules

---

## Live Demo

**Production:** https://guardquote.vandine.us

| Page | Description |
|------|-------------|
| [Get a Quote](https://guardquote.vandine.us/quote) | Try the quote wizard |
| [Tech Stack](https://guardquote.vandine.us/tech-stack) | See how it's built |
| [Quote Lookup](https://guardquote.vandine.us/quote/lookup) | Review a past quote |
| [SOC Dashboard](https://soc.vandine.us) | Security operations command center (Cloudflare Zero Trust) |

---

## ML Engine

| Model | Task | Performance |
|-------|------|-------------|
| GradientBoost | Price Prediction | R² = 0.93 |
| RandomForest | Risk Classification | 81% accuracy |

Trained on 500+ historical quotes across 15 event types and 28 US locations.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS | Vite eliminates webpack dependency chain |
| Backend | Bun 1.3 + Hono | Built-in serve, crypto, env, minimal npm supply chain exposure |
| ML Engine | Python, FastAPI, scikit-learn | Right-sized ML, no GPU needed, transparent pricing for an opaque industry |
| Database | PostgreSQL 17 | Proven reliability, zero licensing, native async driver |
| Auth | OAuth 2.0 PKCE + Bun.password (argon2id) | No auth SaaS, no bcrypt native compilation issues on ARM64 |
| Infrastructure | K3s on Raspberry Pi 5, Cloudflare Tunnel | Enterprise patterns on commodity hardware, $0/month hosting |
| Monitoring | Grafana, Prometheus, Loki | Full observability at $0 vs $2K+/month for Datadog/Splunk |
| SIEM | Wazuh 4.14.3 + Suricata 7.0.5 (74K rules) | Enterprise SIEM without Splunk licensing |
| SOC Dashboard | React + Vite (soc.vandine.us) | Real-time security visibility without SaaS dependency |

---

## Quick Start

```bash
# Clone
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Frontend (localhost:5173)
cd frontend && npm install && npm run dev

# Backend (localhost:3000)
cd backend && bun install && bun run dev

# ML Engine (localhost:8000)
cd ml-engine && pip install -e . && uvicorn src.server:app
```

### Demo Mode

Run without external dependencies:
```bash
DEMO_MODE=true bun run src/index.ts
```

---

## Project Structure

```
guard-quote/
├── frontend/        # React SPA
├── backend/         # Bun + Hono API
├── ml-engine/       # Python ML service
├── soc/             # SOC Dashboard (soc.vandine.us)
├── k8s/             # Kubernetes manifests
└── docs/            # Documentation
```

---

## Team

| Name | Role |
|------|------|
| Rafael Garcia ([@jag18729](https://github.com/jag18729)) | Lead Developer |
| Milkias Kassa ([@Malachizirgod](https://github.com/Malachizirgod)) | ICAM Lead |
| Isaiah Bernal ([@ibernal1815](https://github.com/ibernal1815)) | Security Ops |
| Xavier Nguyen ([@xan942](https://github.com/xan942)) | UX Lead |

---

## Links

- [Project Board](https://github.com/users/jag18729/projects/1)
- [Deployment Guide](./docs/GUARDQUOTE-V2-DEPLOYMENT.md)

---

## License

California State University, Northridge; CIT 480 Senior Design Project
