# GuardQuote Documentation Index

## Quick Links

### Infrastructure (via Tailscale VPN)
- **Pi1 (Database):** `100.66.167.62` (Tailscale) / `192.168.2.70` (local)
  - PostgreSQL: 5432
  - Redis: 6379
  - Grafana: 3000
  - Prometheus: 9090
- **Pi0 (Runner):** `192.168.2.101` (local, pending Tailscale)
  - GitHub Actions self-hosted runner
  - Backup storage

### Tailscale
- **Tailnet:** jag18729.github
- **Tailnet ID:** T1mz7GfThV11CNTRL
- **Admin:** https://login.tailscale.com/admin

### Credentials
| Service | User | Password |
|---------|------|----------|
| PostgreSQL | guardquote | WPU8bj3nbwFyZFEtHZQz |
| Redis | - | guardquote_redis_2024 |
| Admin Login | admin@guardquote.com | admin123 |
| Pi1 SSH | johnmarston | 481526 |
| Pi0 SSH | rafaeljg | adm1npassw0rD |

## Backend API

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardquote.com","password":"admin123"}'

# Protected route
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Quotes
```bash
# Create quote
curl -X POST http://localhost:3000/api/quotes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"corporate","guards":4,"hours":8}'
```

## ML Engine API

### Generate Quote
```bash
# Required: event_type, location_zip, num_guards, hours, date
# Optional: is_armed (false), requires_vehicle (false), crowd_size (0)
curl -X POST http://localhost:8000/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "corporate",
    "location_zip": "94102",
    "num_guards": 4,
    "hours": 8,
    "date": "2026-03-15T14:00:00"
  }'

# Concert with crowd size (returns critical risk level)
curl -X POST http://localhost:8000/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "concert",
    "location_zip": "90001",
    "num_guards": 6,
    "hours": 12,
    "date": "2026-04-20T19:00:00",
    "crowd_size": 5000
  }'
```

### Event Types
- `corporate`, `concert`, `sports`, `private`, `construction`, `retail`, `residential`

### Risk Levels
- `low`, `medium`, `high`, `critical`

### Health Check
```bash
curl http://localhost:8000/api/v1/health
# Returns: {"status":"healthy","version":"0.1.0","model_loaded":true}
```

## Database Schema

### Core Tables
```sql
-- Users (authentication)
SELECT id, email, first_name, last_name, role FROM users;

-- Event types with pricing
SELECT code, name, base_rate, risk_multiplier FROM event_types;

-- Locations with risk zones
SELECT zip_code, city, state, risk_zone, rate_modifier FROM locations;

-- Quotes
SELECT id, quote_number, total_price, status FROM quotes;
```

### ML Training Data
```sql
-- Training records
SELECT event_type, guards, duration, price, accepted
FROM ml_training_data_2026
LIMIT 10;

-- Statistics
SELECT
  COUNT(*) as total,
  AVG(price) as avg_price,
  SUM(accepted)::float / COUNT(*) as accept_rate
FROM ml_training_data_2026;
```

## Common Tasks

### Start Development
```bash
# Backend
cd backend && bun run --watch src/index.ts

# Frontend
cd frontend && bun run dev

# ML Engine
cd ml-engine && source .venv/bin/activate && uvicorn src.main:app --reload
```

### Run Tests
```bash
# Backend
cd backend && bun test

# ML Engine
cd ml-engine && pytest tests/
```

### Deploy
```bash
# Trigger ML training
gh workflow run train-ml.yml

# Run integration tests (requires self-hosted runner)
mv .github/workflows/integration.yml.disabled .github/workflows/integration.yml
gh workflow run integration.yml
```

## CI/CD

### Workflows

| Workflow | Trigger | Status |
|----------|---------|--------|
| `pr-check.yml` | Push/PR to main | ✅ Active (4 jobs) |
| `train-ml.yml` | Weekly/Manual | ✅ Active |
| `integration.yml.disabled` | Manual | ⏸️ Disabled |

### PR Check Jobs

| Job | What it does |
|-----|--------------|
| `lint-backend` | Biome lint + TypeCheck (soft-fail) |
| `lint-frontend` | ESLint + TypeCheck (soft-fail) + Vitest + Build |
| `test-ml-engine` | Ruff + Pytest (soft-fail) |
| `docker-build` | Build all 3 Dockerfiles |

### Run CI Locally

```bash
# Full CI simulation
# Backend
cd backend && bun run lint && bun run typecheck && bun test

# Frontend
cd frontend && bun run lint && bun run typecheck && bun run test && bun run build

# ML Engine
cd ml-engine && ruff check . && pytest tests/ -v

# Docker
docker build -t guardquote-frontend ./frontend
docker build -t guardquote-backend ./backend
docker build -t guardquote-ml ./ml-engine
```

### Fix Lint Errors

```bash
# Frontend (ESLint + Prettier)
cd frontend && bun run lint:fix && bun run format

# Backend (Biome)
cd backend && bun run lint:fix && bun run format

# ML Engine (Ruff)
cd ml-engine && ruff check --fix . && ruff format .
```

### Docker Build

```bash
# Build all images
docker build -t guardquote-frontend ./frontend
docker build -t guardquote-backend ./backend
docker build -t guardquote-ml ./ml-engine

# Run with compose
docker-compose up -d
```

### Coverage Reports

```bash
# Frontend
cd frontend && bun run test:coverage
open coverage/index.html

# ML Engine
cd ml-engine && pytest tests/ --cov=src --cov-report=html
open htmlcov/index.html
```

## Troubleshooting

### Database connection failed
```bash
# Check Tailscale is running
tailscale status

# Ping Pi1 via Tailscale
tailscale ping pi1

# Test PostgreSQL connection
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@100.66.167.62:5432/guardquote -c "SELECT 1"
```

### Not on Tailscale yet?
```bash
# Install and join
brew install tailscale
sudo tailscale up
# Login with GitHub → join jag18729.github tailnet
```

### ML Engine import errors
```bash
cd ml-engine
source .venv/bin/activate
pip install -e .
pip install psycopg2-binary  # If PostgreSQL errors
```

### GitHub Actions failing
```bash
# Check runner status on Pi0
ssh rafaeljg@192.168.2.101 "systemctl status actions.runner.*"

# View runner logs
ssh rafaeljg@192.168.2.101 "journalctl -u actions.runner.* -f"
```

### Services not starting
```bash
# Check all ports
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :8000  # ML Engine

# Kill if needed
kill -9 <PID>
```
