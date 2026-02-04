# GuardQuote

ML-powered security service pricing platform. Built with React + TypeScript + TailwindCSS.

**Production:** https://guardquote.vandine.us

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Install dependencies
npm install

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                             │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  Zero Trust │  │ guardquote-     │  │    vandine-tunnel       │ │
│  │   Access    │  │ gateway Worker  │  │  (Cloudflare Tunnel)    │ │
│  │ (email auth)│  │ (rate limiting) │  │                         │ │
│  └──────┬──────┘  └────────┬────────┘  └────────────┬────────────┘ │
└─────────┼──────────────────┼───────────────────────┼───────────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PI1 (Services Host)                         │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   nginx     │  │ GuardQuote  │  │ PostgreSQL  │  │   Redis   │ │
│  │   :80       │  │ API :3002   │  │   :5432     │  │   :6379   │ │
│  │ (frontend)  │  │ (Node.js)   │  │             │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
│  Frontend: /var/www/guardquote/                                     │
│  Backend:  ~/guard-quote/backend/                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── context/
│   └── AuthContext.tsx      # Authentication state management
├── layouts/
│   ├── AdminLayout.tsx      # Admin dashboard shell + sidebar
│   └── PublicLayout.tsx     # Public pages header/footer
├── pages/
│   ├── Landing.tsx          # Public homepage
│   ├── QuoteForm.tsx        # Quote wizard (4 steps)
│   ├── Login.tsx            # Admin login
│   └── admin/
│       ├── Dashboard.tsx    # Overview stats
│       ├── QuoteRequests.tsx # Manage quotes
│       ├── ML.tsx           # ML model management
│       ├── Users.tsx        # User management
│       ├── Services.tsx     # System services
│       └── Logs.tsx         # Request logs
├── App.tsx                  # Router configuration
├── main.tsx                 # Entry point
└── index.css                # Tailwind + custom styles
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | TailwindCSS 3.4 |
| **Routing** | React Router 7 |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Backend** | Node.js + Hono (on Pi1) |
| **Database** | PostgreSQL |
| **Auth** | Cloudflare Zero Trust Access |
| **CDN/Security** | Cloudflare Tunnel + Workers |

---

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |

### Environment

The frontend connects to the backend API at `/api/*`. In development, requests proxy to the production API through Vite.

**vite.config.ts** handles the proxy:
```ts
server: {
  proxy: {
    '/api': 'https://guardquote.vandine.us'
  }
}
```

---

## Deployment

### Manual Deploy (from ThinkStation)

```bash
# Build
npm run build

# Deploy to Pi1
scp -r dist/* pi1:/var/www/guardquote/
```

### CI/CD

GitHub Actions runs on every push:
1. **lint-and-build** - TypeScript check + Vite build
2. **test** - Run tests (if present)

Branch protection requires CI to pass before merging.

---

## API Endpoints

### Public
| Endpoint | Description |
|----------|-------------|
| `POST /api/predict` | Get price prediction |
| `POST /api/auth/login` | Admin login |
| `GET /api/health` | Health check |

### Admin (requires auth)
| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/stats` | Dashboard statistics |
| `GET /api/admin/quote-requests` | List all quotes |
| `GET /api/admin/users` | List admin users |
| `GET /api/admin/services` | System services |
| `GET /api/admin/ml/status` | ML model status |
| `GET /api/admin/ml/training-data` | Training dataset |
| `POST /api/admin/ml/rollback` | Rollback model version |
| `POST /api/admin/ml/retrain` | Trigger retraining |

---

## Admin Access

**URL:** https://guardquote.vandine.us/admin

1. Click "Admin Login" in header
2. Enter credentials
3. Cloudflare Access will verify your email

**Test Account:**
- Email: johnmarston@vandine.us
- Password: (ask John)

---

## Key Features

### For Clients (Public)
- 🏠 Landing page with testimonials/FAQ
- 📝 4-step quote wizard
- 💰 Instant price estimates

### For Admins
- 📊 Dashboard with stats
- 📋 Quote request management
- 🧠 ML model monitoring & rollback
- 👥 User management
- 🔧 Service monitoring
- 📜 Request logs

---

## Teammate Guide

### Getting Started
1. Clone repo and run `npm install`
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes
4. Push and create PR
5. Wait for John's approval + CI pass

### Do's ✅
- Follow existing code patterns
- Use TypeScript strict mode
- Use TailwindCSS for styling
- Write clear commit messages
- Test your changes locally

### Don'ts ❌
- Push directly to `master`
- Change auth/security code without discussion
- Modify CI configuration
- Add new dependencies without approval

---

## Contact

- **Project Lead:** John (john@vandine.us)
- **Repo:** https://github.com/jag18729/guard-quote
- **Production:** https://guardquote.vandine.us

---

## License

Private - Vandine Infrastructure
