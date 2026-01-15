# GuardQuote

Security guard service quoting platform with ML-powered pricing and risk assessment.

## Tech Stack

- **Backend**: Bun 1.3 + Hono + Drizzle ORM
- **Database**: MySQL 9.5
- **ML Engine**: Python 3.14 + FastAPI + scikit-learn
- **Frontend**: (Coming soon)

## Quick Start

### Prerequisites

- Bun 1.3+
- Python 3.14+
- MySQL 9.5+

### Backend Setup

```bash
cd backend
bun install
cp .env.example .env  # Configure your database
bunx drizzle-kit push
bun run src/index.ts
```

### ML Engine Setup

```bash
cd ml-engine
python3.14 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --reload
```

## API Endpoints

### Backend (port 3000)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote

### ML Engine (port 8000)
- `POST /api/v1/quote` - Generate ML-powered quote
- `POST /api/v1/risk-assessment` - Risk analysis
- `GET /api/v1/event-types` - Available event types

## License

MIT
