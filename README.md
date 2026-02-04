# GuardQuote

**ML-powered security service pricing platform**

Get instant, accurate quotes for security services — from event security to executive protection.

🌐 **Production:** https://guardquote.vandine.us  
📊 **Admin:** https://guardquote.vandine.us/admin

---

## Overview

GuardQuote helps businesses get security quotes without the back-and-forth. Clients answer simple questions, our ML engine calculates fair pricing, and vetted professionals follow up within 24 hours.

### Key Features

| For Clients | For Admins |
|-------------|------------|
| ✅ 4-step quote wizard | 📊 Real-time dashboard |
| ✅ Instant price estimates | 📋 Quote management |
| ✅ No account required | 🧠 ML model controls |
| ✅ Mobile responsive | 👥 User management |
| | 🔧 Service monitoring |
| | 📜 Request logging |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                                       │
│                                                                               │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐   │
│   │   Cloudflare    │   │  guardquote-    │   │    vandine-tunnel       │   │
│   │   Zero Trust    │   │  gateway        │   │                         │   │
│   │   Access        │   │  (Worker)       │   │   Argo Tunnel to Pi1    │   │
│   │                 │   │                 │   │                         │   │
│   │  • Email auth   │   │  • Rate limit   │   │   guardquote.vandine.us │   │
│   │  • Admin only   │   │  • API keys     │   │   → localhost:3002      │   │
│   │                 │   │  • Logging      │   │   → localhost:80        │   │
│   └─────────────────┘   └─────────────────┘   └─────────────────────────┘   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Secure Tunnel
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PI CLUSTER (Home Lab)                                 │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    PI1 - Services Host                               │   │
│   │                    192.168.2.70 (Raspbian 12)                        │   │
│   │                                                                      │   │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│   │   │  nginx   │  │ GuardQt  │  │ Postgres │  │  Docker  │           │   │
│   │   │   :80    │  │   API    │  │  :5432   │  │ Services │           │   │
│   │   │          │  │  :3002   │  │          │  │          │           │   │
│   │   │ Frontend │  │ Node.js  │  │ Quotes   │  │ Grafana  │           │   │
│   │   │  React   │  │  Hono    │  │ Users    │  │ Prom/Loki│           │   │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│   │                                                                      │   │
│   │   Files:                                                             │   │
│   │   • Frontend: /var/www/guardquote/                                   │   │
│   │   • Backend:  ~/guard-quote/backend/                                 │   │
│   │   • Logs:     journalctl -u guardquote                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    PI0 - Monitoring Host                             │   │
│   │                    192.168.2.101 (Ubuntu 25.10)                      │   │
│   │                                                                      │   │
│   │   • WireGuard VPN (:51820)    • NFS Server (:2049)                  │   │
│   │   • Rsyslog (:514)            • GitHub Runner                        │   │
│   │   • NetFlow (:2055)           • Node Exporter (:9100)               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (`/frontend`)
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| TailwindCSS | Styling |
| React Router 7 | Navigation |
| Lucide React | Icons |
| Framer Motion | Animations |

### Backend (Pi1)
| Technology | Purpose |
|------------|---------|
| Node.js 22 | Runtime |
| Hono | API framework |
| PostgreSQL | Database |
| bcrypt | Password hashing |
| tsx | TypeScript execution |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Cloudflare Tunnel | Secure ingress |
| Cloudflare Access | Zero Trust auth |
| Cloudflare Workers | API gateway |
| Pi Cluster | Self-hosted compute |

---

## ML Engine

### Current Model: v2.0 (Formula-Based)

```
Price = BaseRate × RiskMultiplier × LocationModifier × Hours × Guards
```

| Factor | Source | Example |
|--------|--------|---------|
| BaseRate | Event type lookup | Concert: $45/hr |
| RiskMultiplier | Event risk level | High risk: 1.3x |
| LocationModifier | City/region data | Hollywood: 1.35x |
| Hours | User input | 8 hours |
| Guards | Calculated/input | 4 guards |

### Features
- **Risk scoring** (0-10 scale)
- **Confidence scores** (70-95%)
- **Price ranges** (±15% estimates)
- **Recommended guards** (crowd-based)

### Training Data
- 500+ historical quotes
- 15 event types
- 28 locations
- Acceptance/rejection tracking

### Admin Controls
- View model status
- Browse training data
- Export datasets (JSON)
- Rollback to previous versions
- Trigger retraining

---

## Project Structure

```
guard-quote/
├── .github/
│   ├── CODEOWNERS           # Auto-request reviews
│   └── workflows/
│       └── frontend-ci.yml  # CI for frontend
├── frontend/                # React application
│   ├── src/
│   │   ├── context/         # Auth state
│   │   ├── layouts/         # Page shells
│   │   └── pages/
│   │       ├── Landing.tsx      # Public homepage
│   │       ├── QuoteForm.tsx    # Quote wizard
│   │       ├── Login.tsx        # Admin login
│   │       └── admin/
│   │           ├── Dashboard.tsx
│   │           ├── QuoteRequests.tsx
│   │           ├── ML.tsx       # ML management
│   │           ├── Users.tsx
│   │           ├── Services.tsx
│   │           └── Logs.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js API (on Pi1)
├── ml-engine/               # ML components
├── CONTRIBUTING.md
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 20+ or Bun
- Git

### Development

```bash
# Clone
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote/frontend

# Install
npm install

# Run dev server (proxies to production API)
npm run dev
# → http://localhost:5173

# Build
npm run build
```

### Local API Development

If working on the backend locally:
```bash
# Create .env.local in frontend/
echo "VITE_API_URL=http://localhost:3002" > .env.local

# Run frontend
npm run dev
```

---

## Deployment

### Frontend (to Pi1)

```bash
cd frontend
npm run build
scp -r dist/* pi1:/var/www/guardquote/
```

### Backend (on Pi1)

```bash
ssh pi1
cd ~/guard-quote/backend
sudo systemctl restart guardquote
```

### CI/CD

GitHub Actions runs on every push:
1. **Type check** - TypeScript validation
2. **Build** - Vite production build
3. **Artifacts** - Upload dist/ for 7 days

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/predict` | Get price prediction |
| POST | `/api/auth/login` | Admin authentication |

### Admin Endpoints (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/quote-requests` | List all quotes |
| PATCH | `/api/admin/quote-requests/:id` | Update quote status |
| GET | `/api/admin/users` | List admin users |
| POST | `/api/admin/users` | Create admin user |
| GET | `/api/admin/services` | System services |
| GET | `/api/admin/services/system` | Pi1 system metrics |
| GET | `/api/admin/logs` | Request logs |
| GET | `/api/admin/ml/status` | ML model status |
| GET | `/api/admin/ml/training-data` | Training dataset |
| GET | `/api/admin/ml/training-stats` | Training statistics |
| POST | `/api/admin/ml/rollback` | Rollback model |
| POST | `/api/admin/ml/retrain` | Trigger retraining |
| GET | `/api/admin/ml/export` | Export training data |

### Example: Price Prediction

```bash
curl -X POST https://guardquote.vandine.us/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "CONCERT",
    "location": "Hollywood",
    "duration_hours": 8,
    "num_guards": 4,
    "crowd_size": 2000
  }'
```

Response:
```json
{
  "prediction": {
    "total_price": 2527.20,
    "price_low": 2148.12,
    "price_high": 2906.28,
    "hourly_rate": 78.98,
    "risk_score": 6,
    "risk_level": "medium",
    "confidence_score": 95,
    "recommended_guards": 8
  },
  "event_type": { "code": "CONCERT", "name": "Concert/Live Music" },
  "location": { "city": "Hollywood", "state": "CA", "risk_zone": "high" }
}
```

---

## Branch Strategy

```
main (production)     ← Protected: PR + approval + CI
  │
  └── dev (staging)   ← Integration branch
        │
        ├── feature/xyz
        ├── fix/abc
        └── ...
```

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production | PR required, 1 approval, CI must pass |
| `dev` | Staging | Open for development |
| `feature/*` | New features | PR to dev |
| `fix/*` | Bug fixes | PR to dev |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Workflow guidelines
- Code style
- Do's and don'ts
- Getting help

---

## Security

- **Admin access**: Cloudflare Zero Trust (email verification)
- **API protection**: Rate limiting via Cloudflare Worker
- **Passwords**: bcrypt hashed
- **Branch protection**: PRs required for production

Report security issues to: john@vandine.us

---

## Team

| Role | Contact |
|------|---------|
| Project Lead | John (john@vandine.us) |
| Infrastructure | Cloudflare + Pi Cluster |
| Repository | https://github.com/jag18729/guard-quote |

---

## License

Private - Vandine Infrastructure
