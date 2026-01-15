# GuardQuote

Security guard service quoting platform with ML-powered pricing, real-time WebSocket updates, and a full admin dashboard.

## Features

### Client-Facing
- **Multi-step Quote Wizard** - Guided 4-step process for security quotes
- **Live Price Updates** - WebSocket-powered real-time pricing as you type
- **Draft Persistence** - Auto-saves progress to localStorage
- **Risk Assessment** - ML-based risk scoring and pricing

### Admin Dashboard
- **Authentication** - JWT + refresh tokens with Argon2 password hashing
- **User Management** - Create, edit, and manage admin users
- **Service Management** - Start/stop/restart Pi1 services from the UI
- **System Monitoring** - View Pi1 system info (load, memory, disk, temp)
- **Dashboard Stats** - Overview of quotes, revenue, clients

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

## Quick Start

### Prerequisites
- Bun 1.3+
- Node.js 22+
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

### ML Engine (Optional)
```bash
cd ml-engine
source .venv/bin/activate
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
│           ├── auth.ts      # JWT authentication
│           ├── websocket.ts # Real-time updates
│           └── pi-services.ts # Pi1 service management
├── frontend/                # React 19 + Vite
│   └── src/
│       ├── pages/           # Route components
│       │   ├── SecurityQuote.tsx  # Quote wizard
│       │   └── admin/       # Admin pages
│       ├── layouts/         # Page layouts
│       ├── context/         # React contexts
│       └── hooks/           # Custom hooks
├── ml-engine/               # Python ML service
└── .claude/
    └── skills/              # Claude Code skills
```

## API Overview

### Authentication
- `POST /api/auth/login` - Get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List/manage users
- `GET /api/admin/services` - Pi1 service status
- `POST /api/admin/services/:name/:action` - Control services

### WebSocket
Connect to `ws://localhost:3000/ws` for real-time price updates.

## Admin Access

Default admin credentials (create via `POST /api/auth/setup`):
- Email: admin@guardquote.com
- Password: admin123

## Infrastructure

The database and monitoring services run on a Raspberry Pi (Pi1):

| Service | Port | Type |
|---------|------|------|
| PostgreSQL | 5432 | Native |
| Redis | 6379 | Native |
| PgBouncer | 6432 | Native |
| Prometheus | 9090 | Docker |
| Grafana | 3000 | Docker |
| Alertmanager | 9093 | Docker |
| Loki | 3100 | Docker |

## Development

See `.claude/skills/` for detailed documentation:
- `infrastructure.md` - Server details, credentials, SSH commands
- `architecture.md` - Code structure, patterns, API reference
- `development.md` - Local setup, debugging, common tasks
- `roadmap.md` - Completed features, known issues, next steps

## License

MIT
