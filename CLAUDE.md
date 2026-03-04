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

## Model Training

Train on ThinkStation via Docker (requires Python 3.14, local is 3.12):

```bash
cd ml-engine
sudo docker build -t guardquote-ml:audit .
sudo docker run --rm \
  -v $(pwd)/models/trained:/app/models/trained \
  -v $(pwd)/scripts:/app/scripts \
  -v $(pwd)/data:/app/data \
  guardquote-ml:audit python -u scripts/train_from_csv.py
```

Commit the updated `models/trained/guardquote_models.pkl` and `model_metadata.txt`, then deploy to pi2:

```bash
git push origin dev

# On pi2 (SSH to GitHub is blocked, use HTTPS for fetch):
cd ~/guard-quote
git remote set-url origin https://github.com/jag18729/guard-quote.git
git fetch origin dev && git merge origin/dev
git remote set-url origin git@github.com:jag18729/guard-quote.git

cd ml-engine
sudo docker build -t guardquote-ml:v2.3 .
sudo docker save guardquote-ml:v2.3 | \
  sudo ctr --address /run/containerd/containerd.sock -n k8s.io images import -
sudo kubectl rollout restart deployment/guardquote-ml -n guardquote
```

Verify: `curl -s http://10.43.210.9:8000/health` should show `model_loaded: true`.

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
