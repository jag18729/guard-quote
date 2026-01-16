# GuardQuote Documentation Index

## Quick Links

### Infrastructure
- **Pi1 (Database):** 192.168.2.70
  - PostgreSQL: 5432
  - Redis: 6379
  - Grafana: 3000
- **Pi0 (Runner):** 192.168.2.101
  - GitHub Actions self-hosted runner

### Credentials
| Service | User | Password |
|---------|------|----------|
| PostgreSQL | guardquote | WPU8bj3nbwFyZFEtHZQz |
| Redis | - | guardquote_redis_2024 |
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
curl -X POST http://localhost:8000/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{
    "event_datetime": "2026-03-15T14:00:00",
    "event_type": "corporate",
    "zip_code": "94102",
    "num_guards": 4,
    "hours": 8
  }'
```

### Risk Assessment
```bash
curl -X POST http://localhost:8000/api/v1/risk-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "concert",
    "zip_code": "90001",
    "crowd_size": 5000
  }'
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

# Run integration tests
gh workflow run integration.yml
```

## Troubleshooting

### Database connection failed
```bash
# Check Pi1 is reachable
ping 192.168.2.70

# Check PostgreSQL is running
ssh pi1 "systemctl status postgresql"

# Test connection
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote -c "SELECT 1"
```

### ML Engine import errors
```bash
cd ml-engine
source .venv/bin/activate
pip install -e .
```

### GitHub Actions failing
```bash
# Check runner status
ssh pi0 "systemctl status actions.runner.*"

# View runner logs
ssh pi0 "journalctl -u actions.runner.* -f"
```
