# GuardQuote - Team Quickstart

Get up and running in 10 minutes. Demo-ready setup for all team members.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Tailscale | Latest | `brew install tailscale` or https://tailscale.com/download |
| Bun | 1.3+ | `curl -fsSL https://bun.sh/install \| bash` |
| Python | 3.12+ | `brew install python@3.12` or system package |
| Git | 2.x | Pre-installed on macOS/Linux |

## 0. Join Team VPN (2 min)

**You should have received a Tailscale invite email. Accept it first.**

```bash
# Install Tailscale
brew install tailscale   # macOS
# or: curl -fsSL https://tailscale.com/install.sh | sh   # Linux

# Authenticate (join jag18729.github tailnet)
sudo tailscale up
# Opens browser → Login with GitHub → Accept invite
```

Once connected, you can reach Pi1 services from anywhere:
- PostgreSQL: `100.x.x.x:5432` (Tailscale IP)
- Redis: `100.x.x.x:6379`
- Grafana: `100.x.x.x:3000`

Check your connection: `tailscale status`

## 1. Clone & Setup (5 min)

```bash
# Clone the repo
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Copy environment template
cp .env.example .env
```

**Edit `.env` with team credentials:**
```bash
# Database (Pi1 - Rafael will share access)
DB_HOST=192.168.2.70
DB_PASSWORD=<provided_by_rafael>

# Redis (Pi1)
REDIS_HOST=192.168.2.70
REDIS_PASSWORD=<provided_by_rafael>

# JWT (use this for local dev)
JWT_SECRET=guardquote_local_dev_secret_32chars

# S2S Auth
ML_ENGINE_SECRET=guardquote_s2s_secret_2026
```

## 2. Start Services (3 min)

### Option A: All at once (Docker)
```bash
docker-compose up -d
# Services: frontend:5173, backend:3000, ml-engine:8000
```

### Option B: Individual services (Development)

**Terminal 1 - Backend:**
```bash
cd backend
bun install
bun run dev
# → http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun install
bun run dev
# → http://localhost:5173
```

**Terminal 3 - ML Engine:**
```bash
cd ml-engine
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn src.main:app --reload --port 8000
# → http://localhost:8000
```

## 3. Verify Everything Works (2 min)

```bash
# Backend health
curl http://localhost:3000/health
# Expected: {"status":"healthy","database":"connected"}

# ML Engine health
curl http://localhost:8000/health
# Expected: {"status":"healthy","model_status":"active"}

# Frontend
open http://localhost:5173
# Expected: Landing page loads
```

## 4. Test Key Features

### Quote Wizard (Client)
1. Go to http://localhost:5173/quote/security
2. Fill out the 4-step form
3. Watch live price updates

### Admin Dashboard
1. Go to http://localhost:5173/admin/login
2. Login: `admin@guardquote.com` / `admin123`
3. Explore: Dashboard, Users, Services

### ML Prediction API
```bash
curl -X POST http://localhost:3000/ml/quote \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "concert",
    "location_zip": "90001",
    "num_guards": 4,
    "hours": 8,
    "crowd_size": 2000
  }'
```

---

## Team Roles & Areas

| Team Member | Focus Area | Key Files |
|-------------|------------|-----------|
| **Frontend** | React 19, Quote Wizard, Admin UI | `frontend/src/pages/`, `frontend/src/components/` |
| **Backend** | Bun/Hono API, Auth, WebSocket | `backend/src/index.ts`, `backend/src/services/` |
| **ML/Data** | Training, Models, FastAPI | `ml-engine/src/`, `ml-engine/scripts/` |
| **DevOps** | Pi Cluster, CI/CD, AWS | `.github/workflows/`, `docker-compose.yml`, `aws/` |

## Quick Commands by Role

### Frontend Developer
```bash
cd frontend
bun run dev          # Start dev server
bun run build        # Production build
bun run preview      # Preview production build
```

### Backend Developer
```bash
cd backend
bun run dev          # Start with hot reload
bun test             # Run tests
```

### ML Engineer
```bash
cd ml-engine
source .venv/bin/activate
python scripts/generate_training_data_2026.py  # Generate data
python scripts/train_models.py                  # Train models
pytest tests/                                   # Run tests
```

### DevOps
```bash
# Docker
docker-compose up -d
docker-compose logs -f
docker-compose ps

# GitHub Actions
gh workflow run test-runner.yml
gh run list

# SSH to Pi cluster
ssh pi1  # 192.168.2.70 (database, monitoring)
ssh pi0  # 192.168.2.101 (GitHub runner)
```

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check Pi1 is reachable
ping 192.168.2.70

# Check your network (must be on same network or VPN)
# Contact Rafael for VPN access
```

### "ML Engine import errors"
```bash
cd ml-engine
source .venv/bin/activate
pip install -e .
pip install psycopg2-binary  # If PostgreSQL errors
```

### "Port already in use"
```bash
# Find and kill process
lsof -i :3000  # or :5173, :8000
kill -9 <PID>
```

### "CORS errors in browser"
Backend CORS is configured for localhost. If using different host:
```bash
# Backend allows all origins in dev mode
# Check backend/src/index.ts cors() middleware
```

---

## Demo Checklist

Before the demo, verify:

- [ ] Backend `/health` returns "healthy"
- [ ] Frontend loads at localhost:5173
- [ ] Quote wizard shows live pricing
- [ ] Admin login works
- [ ] ML predictions return prices
- [ ] WebSocket price updates work (change form values)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   ML Engine     │
│  React + Vite   │     │  Bun + Hono     │     │    FastAPI      │
│     :5173       │     │     :3000       │     │     :8000       │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────────────────────┐
                        │      Pi1 (192.168.2.70)         │
                        │  PostgreSQL │ Redis │ Grafana   │
                        └─────────────────────────────────┘
```

---

## Need Help?

1. Check `.claude/skills/` for detailed docs
2. Read `CLAUDE.md` for project overview
3. Ask in team Slack/Discord
4. File issue on GitHub

**Key Skills:**
- `stack-2026.md` - Latest best practices
- `troubleshooting.md` - Common issues
- `infrastructure.md` - Server access
- `ml-pipeline.md` - ML workflow
