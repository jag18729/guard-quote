# GuardQuote

**ML-powered security service pricing platform**

Get instant, accurate quotes for security services: event security, executive protection, and more.

[![Live Site](https://img.shields.io/badge/Live-guardquote.vandine.us-orange)](https://guardquote.vandine.us)
[![CI](https://github.com/jag18729/guard-quote/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/jag18729/guard-quote/actions)
[![Security](https://github.com/jag18729/guard-quote/actions/workflows/security.yml/badge.svg)](https://github.com/jag18729/guard-quote/actions)

---

## ✨ Features

- **Instant Quotes**: ML-powered pricing in seconds, not days
- **OAuth Login**: Sign in with GitHub, Google, or Microsoft
- **Smart Risk Assessment**: AI evaluates event complexity and security needs
- **Transparent Pricing**: No hidden fees; see exactly what you're paying for
- **Admin Dashboard**: Manage quotes, users, and view analytics

---

## 🚀 Live Demo

**Production:** https://guardquote.vandine.us

| Page | Description |
|------|-------------|
| [Get a Quote](https://guardquote.vandine.us/quote) | Try the quote wizard |
| [Tech Stack](https://guardquote.vandine.us/tech-stack) | See how it's built |
| [Quote Lookup](https://guardquote.vandine.us/quote/lookup) | Review a past quote |

---

## 🧠 ML Engine

| Model | Task | Performance |
|-------|------|-------------|
| **GradientBoost** | Price Prediction | R² = 0.93 |
| **RandomForest** | Risk Classification | 81% accuracy |

Trained on 500+ historical quotes across 15 event types and 28 US locations.

---

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Bun + Hono (TypeScript) |
| **ML Engine** | Python, FastAPI, scikit-learn |
| **Database** | PostgreSQL 16 |
| **Auth** | OAuth 2.0 + PKCE, JWT sessions |
| **Infrastructure** | K3s, Cloudflare Tunnel |
| **Monitoring** | Grafana, Prometheus, Loki |

---

## 🛠️ Quick Start

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

## 📁 Project Structure

```
guard-quote/
├── frontend/        # React SPA
├── backend/         # Bun + Hono API
├── ml-engine/       # Python ML service
└── docs/            # Documentation
```

---

## 👥 Team

| Name | Role |
|------|------|
| **Rafael Garcia** ([@jag18729](https://github.com/jag18729)) | Lead Developer |
| **Milkias Kassa** ([@Malachizirgod](https://github.com/Malachizirgod)) | ICAM Lead |
| **Isaiah Bernal** ([@ibernal1815](https://github.com/ibernal1815)) | Security Ops |
| **Xavier Nguyen** ([@xan942](https://github.com/xan942)) | UX Lead |

---

## 📋 Links

- [Project Board](https://github.com/users/jag18729/projects/1)
- [Deployment Guide](./docs/GUARDQUOTE-V2-DEPLOYMENT.md)

---

## 📄 License

California State University, Northridge; CIT 480 Senior Design Project

---

*Built with ☕ and too many late nights.*
