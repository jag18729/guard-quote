# GuardQuote Backend

ML-powered security guard quoting system with PostgreSQL backend on Raspberry Pi cluster.

## Overview

GuardQuote is an intelligent pricing system for security guard services. It uses machine learning to predict optimal pricing based on event type, location, crowd size, and other risk factors.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           192.168.2.0/24 Network                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │    Pi1      │    │   Syslog    │    │    Dev      │    │   Future    │  │
│  │ 192.168.2.70│    │192.168.2.101│    │  (Local)    │    │    .x       │  │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤  │
│  │ PostgreSQL  │◀───│   rsyslog   │◀───│  Bun/Hono   │    │   Nginx     │  │
│  │ Redis       │    │ Prometheus  │    │  API Server │    │   LDAP      │  │
│  │ PgBouncer   │    │  Grafana    │    │  WebSocket  │    │   SIEM      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun 1.3.6 |
| Framework | Hono |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui |

## Features

### Client Page (Public)
- Multi-step quote request form
- Real-time price calculation via WebSocket
- Risk assessment visualization
- PDF quote generation
- Quote status tracking

### Admin Dashboard
- User management (CRUD + roles)
- Quote management with workflow
- Client management
- ML training data management
- Real-time services monitoring
- Infrastructure monitoring
- Centralized log viewer
- Backup management
- Analytics dashboard

### Services Layer
- **WebSocket** - Real-time updates for client and admin
- **Cache** - Redis with memory fallback
- **Monitor** - Service health tracking
- **Backup** - Automated database backups
- **Logging** - Centralized logging with syslog
- **Infrastructure** - Multi-server monitoring

## Quick Start

### Prerequisites

- Bun 1.3.6+
- PostgreSQL 15 (on Pi or local)
- Redis (optional, has fallback)

### Installation

```bash
# Clone repository
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote/backend

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run server
bun run src/index.ts
```

### Environment Variables

```bash
PORT=3000
DATABASE_URL=postgres://guardquote:password@192.168.2.70/guardquote
REDIS_URL=redis://:password@192.168.2.70:6379
SYSLOG_HOST=192.168.2.101
SYSLOG_PORT=514
SYSLOG_ENABLED=true
LOG_LEVEL=info
BACKUP_ENABLED=true
```

## API Endpoints

### Health
```
GET  /health              # Basic health check
GET  /api/health          # Detailed health with DB status
```

### ML Prediction
```
POST /ml/quote            # Get price prediction
POST /ml/risk-assessment  # Get risk analysis
GET  /ml/health           # ML service status
GET  /ml/model-info       # Model metadata
GET  /ml/event-types      # Available event types
```

### CRUD Operations
```
GET/POST     /api/users       # User management
GET/POST     /api/clients     # Client management
GET/POST/PATCH /api/quotes    # Quote management
GET          /api/locations   # Location data
GET          /api/event-types # Event types
GET/POST/DELETE /api/webhooks # Webhook config
```

### Admin (Planned)
```
GET  /admin/services      # Services health
GET  /admin/infra         # Infrastructure status
GET  /admin/logs          # Log viewer
GET  /admin/backups       # Backup management
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main API server
│   ├── db/
│   │   ├── connection.ts     # PostgreSQL connection
│   │   └── schema.sql        # Database schema
│   ├── services/
│   │   ├── index.ts          # Service exports
│   │   ├── websocket.ts      # WebSocket server
│   │   ├── cache.ts          # Redis caching
│   │   ├── monitor.ts        # Health monitoring
│   │   ├── backup.ts         # Backup service
│   │   ├── logging.ts        # Centralized logging
│   │   └── infrastructure.ts # Server monitoring
│   └── seed-training-data.ts # ML data generator
├── .claude/
│   └── commands/             # Claude Code skills
├── .continue/
│   ├── config.json           # Tasks & infrastructure
│   ├── ROADMAP.md            # Project roadmap
│   ├── INFRASTRUCTURE.md     # Setup guide
│   ├── PACKAGES.md           # Package reference
│   └── QUICKREF.md           # Quick reference
├── CLAUDE.md                 # Project context
└── package.json
```

## Infrastructure

### Server Details

| Server | IP | Services |
|--------|-----|----------|
| Pi1 Database | 192.168.2.70 | PostgreSQL, Redis, PgBouncer |
| Syslog | 192.168.2.101 | rsyslog, Prometheus, Grafana |
| Local Dev | localhost | API Server, WebSocket |

### Required Packages

**Pi1 (Database):**
```bash
sudo apt install -y postgresql-15 redis-server pgbouncer \
  prometheus-node-exporter fail2ban ufw
```

**Syslog Server:**
```bash
sudo apt install -y rsyslog prometheus grafana \
  prometheus-node-exporter fail2ban ufw
```

## ML Prediction

### Event Types

| Code | Name | Base Rate | Risk Multiplier |
|------|------|-----------|-----------------|
| CONCERT | Concert/Live Music | $45/hr | 1.30 |
| SPORT | Sporting Event | $40/hr | 1.20 |
| CORPORATE | Corporate Event | $35/hr | 1.00 |
| WEDDING | Wedding/Private | $38/hr | 0.90 |
| FESTIVAL | Festival/Fair | $42/hr | 1.40 |
| NIGHTCLUB | Nightclub/Bar | $50/hr | 1.50 |
| RETAIL | Retail Security | $32/hr | 1.10 |
| EXECUTIVE | Executive Protection | $75/hr | 1.60 |

### Pricing Factors

- **Location** - Risk zone modifier (0.9x - 1.5x)
- **Time** - Night shift (+20%), Weekend (+15%)
- **Armed** - +$15/hr per guard
- **Vehicle** - +$50 per guard
- **Crowd size** - Staffing ratio adjustments

## Development

### Run Development Server

```bash
bun run src/index.ts
```

### Run with Hot Reload

```bash
bun --hot run src/index.ts
```

### Seed Training Data

```bash
bun run src/seed-training-data.ts 500
```

### Test ML Prediction

```bash
curl -X POST http://localhost:3000/ml/quote \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "concert",
    "location_zip": "90210",
    "num_guards": 4,
    "hours": 8,
    "crowd_size": 2000,
    "is_armed": true
  }'
```

## Roadmap

### Current (v2.1.0)
- [x] PostgreSQL backend on Pi
- [x] ML prediction endpoints
- [x] Service layer (WebSocket, Cache, Monitor, Backup, Logging)
- [x] Infrastructure monitoring

### In Progress
- [ ] Infrastructure hardening (Redis, security)
- [ ] Admin dashboard UI

### Planned
- [ ] JWT authentication
- [ ] Client page real-time updates
- [ ] Prometheus/Grafana monitoring
- [ ] Automated backups
- [ ] API Gateway
- [ ] LDAP integration
- [ ] SIEM integration

## Documentation

| Document | Description |
|----------|-------------|
| `CLAUDE.md` | Project context for AI assistance |
| `.continue/ROADMAP.md` | Detailed project roadmap |
| `.continue/INFRASTRUCTURE.md` | Server setup guide |
| `.continue/PACKAGES.md` | Package installation reference |
| `.continue/QUICKREF.md` | Quick reference card |

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT

## Author

Built with Bun, Hono, and PostgreSQL on Raspberry Pi.
