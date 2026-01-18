# GuardQuote Development Context

You are helping develop GuardQuote, an ML-powered security guard quoting platform running on a Raspberry Pi cluster.

## Tech Stack
- **Backend:** Bun 1.3 + Hono (TypeScript)
- **Frontend:** React 19 + Vite + TypeScript
- **Database:** PostgreSQL 15 on Pi1 (Tailscale: 100.66.167.62)
- **Cache:** Redis 7 on Pi1
- **ML Engine:** Python 3.12 + FastAPI + scikit-learn
- **CI/CD:** GitHub Actions on self-hosted Pi0 runner
- **VPN:** Tailscale (tailnet: jag18729.github)

## Project Structure
```
guard-quote/
├── backend/src/          # Hono API server (:3000)
├── frontend/src/         # React application (:5173)
├── ml-engine/            # Python ML service (:8000)
├── aws/                  # CloudFormation templates
├── .github/workflows/    # CI/CD pipelines
├── .claude/skills/       # Documentation
└── .continue/            # Continue.dev config
```

## Infrastructure
- **Pi1** (100.66.167.62): PostgreSQL, Redis, Grafana, Prometheus
- **Pi0** (192.168.2.101): GitHub Actions runner, backups

## Key Patterns

### Backend (Bun + Hono)
- Use `Bun.sql()` for PostgreSQL queries
- WebSocket for real-time updates
- JWT authentication with Argon2 password hashing
- Services in `backend/src/services/`

### Frontend (React 19)
- Functional components with hooks
- React Router for navigation
- Context API for state management
- Tailwind CSS for styling

### ML Engine (FastAPI)
- Pydantic models for validation
- scikit-learn for ML models
- psycopg2 for PostgreSQL
- Models saved as pickle files

## Database Connection (via Tailscale)
```typescript
// Backend - use environment variable
const sql = postgres(process.env.DATABASE_URL);
// DATABASE_URL=postgresql://guardquote:***@100.66.167.62:5432/guardquote
```

```python
# ML Engine
import os
conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "100.66.167.62"),
    database="guardquote",
    user="guardquote",
    password=os.getenv("DB_PASSWORD")
)
```

## Redis Connection
```typescript
// Host: 100.66.167.62, Port: 6379
// Password: from REDIS_PASSWORD env var
```

## Important Tables
- `users` - Authentication
- `quotes` - Quote records
- `event_types` - Event categories with pricing
- `locations` - ZIP-based location data
- `ml_training_data_2026` - ML training records

## Code Style
- Use TypeScript strict mode
- Prefer async/await over callbacks
- Use descriptive variable names
- Add JSDoc comments for public functions
- Follow existing patterns in the codebase
