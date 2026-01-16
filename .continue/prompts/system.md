# GuardQuote Development Context

You are helping develop GuardQuote, an ML-powered security guard quoting platform.

## Tech Stack
- **Backend:** Bun 1.3 + Hono (TypeScript)
- **Frontend:** React 19 + Vite + TypeScript
- **Database:** PostgreSQL 15 on Raspberry Pi (192.168.2.70)
- **ML Engine:** Python 3.14 + FastAPI + scikit-learn
- **CI/CD:** GitHub Actions on self-hosted Pi0 runner

## Project Structure
```
guard-quote/
├── backend/src/          # Hono API server
├── frontend/src/         # React application
├── ml-engine/            # Python ML service
├── .github/workflows/    # CI/CD pipelines
└── .claude/skills/       # Documentation
```

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

## Database Connection
```typescript
// Backend
const sql = postgres('postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote');
```

```python
# ML Engine
import psycopg2
conn = psycopg2.connect(
    host="192.168.2.70",
    database="guardquote",
    user="guardquote",
    password="WPU8bj3nbwFyZFEtHZQz"
)
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
