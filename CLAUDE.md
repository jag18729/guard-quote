# GuardQuote - Claude Code Context

## Project Overview
ML-powered security guard quoting system with PostgreSQL backend running on Raspberry Pi cluster.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Development Machine                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │ Frontend    │  │ Backend     │  │ ML Engine   │                      │
│  │ React 19    │  │ Bun + Hono  │  │ FastAPI     │                      │
│  │ :5173       │  │ :3000       │  │ :8000       │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
└─────────┼────────────────┼────────────────┼─────────────────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────┐
│ Pi0 (192.168.2.101) │         │ Pi1 (192.168.2.70)  │
│ ┌─────────────────┐ │         │ ┌─────────────────┐ │
│ │ GitHub Actions  │ │────────►│ │ PostgreSQL:5432 │ │
│ │ Runner          │ │         │ │ Redis:6379      │ │
│ │                 │ │         │ │ PgBouncer:6432  │ │
│ │ User: rafaeljg  │ │         │ │ Prometheus:9090 │ │
│ └─────────────────┘ │         │ │ Grafana:3000    │ │
└─────────────────────┘         │ │ Loki:3100       │ │
                                └─────────────────────┘
```

## Quick Reference

### Skills (in `.claude/skills/`)

| Skill | Use When |
|-------|----------|
| `infrastructure.md` | SSH, credentials, server access |
| `ml-pipeline.md` | Training data, ML workflow |
| `ingest-spec.md` | Parsing Gemini/AI output |
| `generate-data.md` | Creating training records |
| `train-model.md` | Training ML models |
| `github-actions.md` | CI/CD workflows |
| `runner-setup.md` | Pi0 GitHub runner setup |
| `troubleshooting.md` | Debugging issues |
| `database.md` | Schema, queries, migrations |
| `architecture.md` | Code structure, patterns |

### Key Locations

| What | Where |
|------|-------|
| Backend API | `backend/src/index.ts` |
| Frontend | `frontend/src/` |
| ML Engine | `ml-engine/src/` |
| Training Scripts | `ml-engine/scripts/` |
| Trained Models | `ml-engine/models/trained/` |
| GitHub Actions | `.github/workflows/` |
| Skills | `.claude/skills/` |

### Servers

| Server | IP | User | Password | Role |
|--------|-----|------|----------|------|
| Pi1 | 192.168.2.70 | johnmarston | 481526 | Database, Monitoring |
| Pi0 | 192.168.2.101 | rafaeljg | adm1npassw0rD | GitHub Actions Runner |

### SSH Access

```bash
# Pi1 - Database server
ssh pi1
# or: sshpass -p '481526' ssh johnmarston@192.168.2.70

# Pi0 - GitHub runner
ssh pi0
# or: sshpass -p 'adm1npassw0rD' ssh rafaeljg@192.168.2.101
```

### Database

```bash
# Direct PostgreSQL
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote

# Via PgBouncer (recommended for production)
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:6432/guardquote
```

### Redis

```bash
redis-cli -h 192.168.2.70 -a guardquote_redis_2024
```

## ML Pipeline

### Ingest Training Data
When user provides Gemini/AI output, use the ingest skill:
1. Parse the spec (SQL, markdown, CSV, or prose)
2. Map columns to schema
3. Generate training data
4. Load into PostgreSQL

```bash
cd ml-engine
source .venv/bin/activate
python scripts/generate_training_data_2026.py
```

### Train Models
```bash
python scripts/train_models.py
```

### Current Training Data
- **Table:** `ml_training_data_2026`
- **Records:** 1,100
- **Features:** 15 (event_type, location_risk, guards, etc.)
- **Targets:** price, accepted, satisfaction

## CI/CD

### GitHub Actions Workflows

| Workflow | File | Trigger | Runner |
|----------|------|---------|--------|
| PR Check | `pr-check.yml` | PR/Push | ubuntu-latest |
| ML Training | `train-ml.yml` | Weekly/Manual | Pi0 (self-hosted) |
| Integration | `integration.yml` | Push to main | Pi0 (self-hosted) |
| Test Runner | `test-runner.yml` | Manual | Pi0 (self-hosted) |

### GitHub Secrets

| Secret | Value |
|--------|-------|
| `PI1_DB_PASSWORD` | WPU8bj3nbwFyZFEtHZQz |
| `PI1_REDIS_PASSWORD` | guardquote_redis_2024 |

## Development

### Start All Services
```bash
# Terminal 1: Backend
cd backend && bun run --watch src/index.ts

# Terminal 2: Frontend
cd frontend && bun run dev

# Terminal 3: ML Engine (optional)
cd ml-engine && source .venv/bin/activate && uvicorn src.main:app --reload --port 8000
```

### Run Tests
```bash
# Backend
cd backend && bun test

# ML Engine
cd ml-engine && pytest tests/
```

## Version
- **Current:** v2.3.0
- **Last Updated:** January 15, 2026
