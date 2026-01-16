# GuardQuote

Security guard service quoting platform with ML-powered pricing, real-time WebSocket updates, and automated CI/CD on Raspberry Pi cluster.

## Features

### Client-Facing
- **Multi-step Quote Wizard** - Guided 4-step process for security quotes
- **Live Price Updates** - WebSocket-powered real-time pricing as you type
- **Draft Persistence** - Auto-saves progress to localStorage
- **Risk Assessment** - ML-based risk scoring and pricing

### Admin Dashboard
- **Authentication** - JWT + refresh tokens with Argon2 password hashing
- **User Management** - Create, edit, and manage admin users
- **Service Management** - Compact LED-status view, click to manage services
- **System Monitoring** - View Pi1 system info (load, memory, disk, temp)
- **Dashboard Stats** - Overview of quotes, revenue, clients
- **Automated Backups** - Daily PostgreSQL, Redis, and config backups

### ML Engine
- **Price Prediction** - Gradient Boosting model with 15 features
- **Risk Classification** - 4-level risk assessment (low/medium/high/critical)
- **2026 Pricing** - Updated event types and location modifiers
- **Automated Training** - Weekly model retraining via GitHub Actions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Bun 1.3 + Hono |
| Frontend | React 19 + Vite + TypeScript |
| Database | PostgreSQL 15 (on Raspberry Pi) |
| Cache | Redis 7 |
| Auth | JWT (HS256) + Argon2 |
| Real-time | Native WebSocket |
| ML Engine | Python 3.14 + FastAPI + scikit-learn |
| Monitoring | Prometheus + Grafana + Loki |
| CI/CD | GitHub Actions (self-hosted on Pi0) |

## Infrastructure

```
┌─────────────────────┐         ┌─────────────────────┐
│ Pi0 (192.168.2.101) │         │ Pi1 (192.168.2.70)  │
│ GitHub Actions      │────────►│ PostgreSQL :5432    │
│ Runner              │         │ Redis      :6379    │
│                     │         │ PgBouncer  :6432    │
│                     │         │ Prometheus :9090    │
│                     │         │ Grafana    :3000    │
└─────────────────────┘         └─────────────────────┘
```

## Quick Start

### Prerequisites
- Bun 1.3+
- Python 3.12+ (for ML engine)
- Access to Pi1 (192.168.2.70) for database

### Backend
```bash
cd backend
bun install
bun run --watch src/index.ts
```
Runs at http://localhost:3000

### Frontend
```bash
cd frontend
bun install
bun run dev
```
Runs at http://localhost:5173

### ML Engine
```bash
cd ml-engine
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn src.main:app --reload --port 8000
```

## Project Structure

```
guard-quote/
├── backend/                 # Bun + Hono API
│   └── src/
│       ├── index.ts         # Server entry + routes
│       ├── db/              # Database connection + schema
│       └── services/        # Business logic
├── frontend/                # React 19 + Vite
│   └── src/
│       ├── pages/           # Route components
│       ├── layouts/         # Page layouts
│       └── hooks/           # Custom hooks
├── ml-engine/               # Python ML service
│   ├── src/                 # FastAPI application
│   ├── scripts/             # Training & data generation
│   ├── models/trained/      # Serialized models
│   └── data/                # Training data & SQL
├── .github/workflows/       # CI/CD pipelines
└── .claude/skills/          # Claude Code skills
```

## CI/CD

GitHub Actions workflows run on a self-hosted runner (Pi0):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `pr-check.yml` | PR/Push | Lint, type check |
| `train-ml.yml` | Weekly/Manual | Retrain ML models |
| `integration.yml` | Push to main | Test against Pi1 |
| `test-runner.yml` | Manual | Verify runner setup |

## ML Pipeline

### Generate Training Data
```bash
cd ml-engine
source .venv/bin/activate
python scripts/generate_training_data_2026.py
```

### Train Models
```bash
python scripts/train_models.py
```

### Current Model Performance
- **Price R²:** 0.82
- **Risk Accuracy:** 84%
- **Training Records:** 1,100

## API Overview

### Authentication
- `POST /api/auth/login` - Get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/:id` - Get quote details

### ML Engine (port 8000)
- `POST /api/v1/quote` - Generate ML quote
- `POST /api/v1/risk-assessment` - Risk analysis
- `GET /api/v1/event-types` - Available event types

### WebSocket
Connect to `ws://localhost:3000/ws` for real-time price updates.

## Database

```bash
# Connect to PostgreSQL
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote

# Key tables
- users           # Authentication
- quotes          # Quote records
- event_types     # Event categories with pricing
- locations       # ZIP-based location data
- ml_training_data_2026  # ML training records
```

## Documentation

See `.claude/skills/` for detailed documentation:
- `infrastructure.md` - Server details, credentials, SSH commands
- `ml-pipeline.md` - ML training workflow
- `github-actions.md` - CI/CD setup and workflows
- `architecture.md` - Code structure, patterns
- `troubleshooting.md` - Common issues and fixes

## Admin Access

Default admin credentials:
- Email: admin@guardquote.com
- Password: admin123

## License

MIT
