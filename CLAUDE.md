# GuardQuote - Claude Code Context

## Project Overview
ML-powered security service quoting platform. Self-hosted on Raspberry Pi cluster with Cloudflare edge.

**Live Site:** https://guardquote.vandine.us
**GitHub:** https://github.com/jag18729/guard-quote
**Project Board:** https://github.com/users/jag18729/projects/3

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   CLOUDFLARE EDGE                     │
│  ┌────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │ Pages  │  │ Workers  │  │  Tunnel → Pi2:30522 │   │
│  └────────┘  └──────────┘  └────────────────────┘   │
└────────────────────────┬─────────────────────────────┘
                         │
              PA-220 Firewall (4 DMZ zones)
                         │
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
  pi0                  pi1                  pi2
  DNS/AdGuard        PostgreSQL 17        K3s Workloads
  SNMP/rsyslog       Grafana/Prom/Loki    GuardQuote v2 ✅
  LDAP               Monitoring stack     ML Engine
  NFS log archive                         Wazuh HIDS
                                          cloudflared
```

**Cross-zone routing:** PA-220 blocks direct Pi1↔Pi2 traffic. All cross-host connections use **Tailscale IPs**. See `docs/runbooks/NETWORKING.md`.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Backend | Bun 1.3 + Hono (K3s on Pi2) |
| Database | PostgreSQL 17 (Pi1, accessed via Tailscale 100.77.26.41:5432) |
| Auth | Argon2id + JWT + OAuth 2.0 (GitHub ✅ Google ✅ Microsoft ✅) |
| ML Engine | Python FastAPI + XGBoost (K3s on Pi2) |
| Hosting | Cloudflare Tunnel → K3s NodePort 30522 |
| Monitoring | Grafana + Prometheus + Loki + Vector (Pi1) |
| IDS | Suricata on RV2 (74k rules, ET Open) |
| HIDS | Wazuh on Pi2 (Docker) |

## Key Locations

| What | Where |
|------|-------|
| Frontend | `frontend/src/` |
| Backend | `backend/src/` |
| ML Engine | `ml-engine/` |
| Docs | `docs/` |
| Networking runbook | `docs/runbooks/NETWORKING.md` |
| Backup runbook | `docs/runbooks/BACKUP.md` |
| Monitoring docs | `docs/infrastructure/monitoring/README.md` |
| Tailscale docs | `docs/infrastructure/tailscale/README.md` |
| Host inventory | `docs/infrastructure/HOSTS.md` |

## Critical Infrastructure Notes

### DATABASE_URL
Must use Pi1's Tailscale IP — PA-220 blocks direct Pi2→Pi1 cross-zone. Credentials in `.env`.
Stored in K8s secret:
```bash
kubectl get secret guardquote-secrets -n guardquote -o jsonpath='{.data.database-url}' | base64 -d
```

### OAuth
K3s pods have direct internet egress via Pi2's matrix network adapter (USB ethernet, DHCP from UDM). The OAuth proxy on ThinkStation was eliminated 2026-03-17. `OAUTH_PROXY_URL` is empty; backend falls back to direct `fetch()` in `backend/src/services/oauth.ts`.

### K3s Namespaces
| Namespace | Workloads |
|-----------|-----------|
| `guardquote` | backend, frontend, ml-engine, soc-dashboard |
| `sentinel` | sentinelnet-api (scaled to 0 — needs image rebuild), grafana |
| `nettools` | nettools-api (scaled to 0 — needs image rebuild), nettools-db |

### Images Needing Rebuild
- `sentinelnet:v0.4.0` — build on Pi2, `docker save | sudo k3s ctr images import -`
- `nettools-api:v2` — same process

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + DB status |
| POST | `/api/auth/login` | Login (Argon2id) |
| GET | `/auth/github` | OAuth — GitHub |
| GET | `/auth/google` | OAuth — Google |
| GET | `/auth/microsoft` | OAuth — Microsoft |
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/features` | Feature requests |
| POST | `/api/features/:id/vote` | Vote on feature |
| GET | `/api/ml/predict` | ML price prediction |
| GET | `/api/siem/events` | SIEM auth events |

## Development

```bash
# Frontend
cd frontend && bun install && bun run dev

# Backend (local)
cd backend && bun install && bun run dev

# Demo mode (no DB/Redis needed)
DEMO_MODE=true bun run src/server.ts

# Check production health
curl https://guardquote.vandine.us/api/health
```

## Deployment (Production)

GuardQuote v2 runs on K3s on Pi2. CI/CD via GitHub Actions self-hosted runner on Pi2, auto-deploys on push to `main`.

```bash
# Check pod status
ssh rafaeljg@100.111.113.35 "kubectl get pods -n guardquote"

# Roll restart backend
ssh rafaeljg@100.111.113.35 "kubectl rollout restart deployment/guardquote-backend -n guardquote"

# View logs
ssh rafaeljg@100.111.113.35 "kubectl logs -n guardquote deployment/guardquote-backend --since=5m"
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
| v2.0 — Bun + ML + OAuth + SIEM | March 3, 2026 | ✅ Live |

## Version
- **Current:** v2.1 (production on K3s/Pi2)
- **Last Updated:** 2026-03-17
