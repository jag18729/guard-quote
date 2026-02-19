# GuardQuote - Claude Code Context

## Project Overview
ML-powered security service quoting platform. Self-hosted on Raspberry Pi cluster with Cloudflare edge.

**Live Site:** https://guardquote.vandine.us
**GitHub:** https://github.com/jag18729/guard-quote
**Project Board:** https://github.com/users/jag18729/projects/3

## Architecture

```
┌──────────────────────────────────────────────┐
│              CLOUDFLARE EDGE                  │
│  ┌────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Pages  │  │ Workers  │  │  Tunnel  │     │
│  └────────┘  └──────────┘  └──────────┘     │
└───────────────────┬──────────────────────────┘
                    │
         PA-220 Firewall (4 DMZ zones)
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
  pi0             pi1             pi2
  DNS/Logs     Monitoring      K3s Workloads
  SNMP         Grafana/Prom    GuardQuote (v2)
  LDAP         Loki            ML Engine
               GuardQuote(v1)  SentinelNet
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Backend (v1) | Node.js + Hono |
| Backend (v2) | Bun 1.3 native `Bun.serve()` |
| Database | PostgreSQL 16 |
| Auth | bcrypt + JWT → OAuth 2.0 (GitHub + Google) + argon2id |
| ML Engine | Python FastAPI + XGBoost (v2) |
| Hosting | Cloudflare Pages + Tunnel |
| Monitoring | Grafana + Prometheus + Loki + Vector |

## Key Locations

| What | Where |
|------|-------|
| Frontend | `frontend/src/` |
| Backend | `backend/src/` |
| ML Engine | `ml-engine/` |
| Docs | `docs/` |
| v2 Architecture | `docs/plans/guardquote-v2-architecture.md` |
| v2 Schema | `docs/plans/guardquote-v2-schema-migration.sql` |

## Environment Setup

All IPs, credentials, and SSH access details are in the team `.env` file.
See `.env.example` for the required variables.

```bash
# Copy .env to repo root (it's gitignored)
cp ~/path/to/shared.env .env
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check |
| POST | `/api/auth/login` | Admin login |
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/features` | Feature requests |
| POST | `/api/features/:id/vote` | Vote on feature |

### v2 Additions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/github` | OAuth — GitHub |
| GET | `/auth/google` | OAuth — Google |
| GET | `/api/ml/predict` | ML price prediction |
| GET | `/api/siem/events` | SIEM auth events |

## Development

```bash
# Frontend
cd frontend && bun install && bun run dev

# Backend
cd backend && bun install && bun run dev

# Demo mode (v2 — no DB/Redis needed)
DEMO_MODE=true bun run src/server.ts
```

## Team

| Member | GitHub | Role |
|--------|--------|------|
| Rafael Garcia | @jag18729 | Lead — CI/CD, ML, Data |
| Milkias Kassa | @Malachizirgod | IAM — Identity & Access |
| Isaiah Bernal | @ibernal1815 | SecOps — SIEM & Security |
| Xavier Nguyen | @xan942 | UX — Design & Frontend |

## Milestones

| Milestone | Date | Status |
|-----------|------|--------|
| v2.0 — Bun + ML + SDPS | March 3, 2026 | 🔄 In Progress |

## Version
- **Current:** v3.0.0-node (production), v2 in development
- **Last Updated:** February 18, 2026
