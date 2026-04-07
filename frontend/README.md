# GuardQuote Frontend

ML-powered security service pricing platform. Built with React + TypeScript + TailwindCSS.

**Production:** https://guardquote.vandine.us

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote/frontend

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
│  │  Zero Trust │  │   Pages (CDN)   │  │    vandine-tunnel       │ │
│  │   Access    │  │   Frontend      │  │  (Cloudflare Tunnel)    │ │
│  │ (email OTP) │  │   Static Files  │  │                         │ │
│  └──────┬──────┘  └────────┬────────┘  └────────────┬────────────┘ │
└─────────┼──────────────────┼───────────────────────┼───────────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PI1 ([see .env])                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ GuardQuote  │  │ PostgreSQL  │  │  Grafana    │                 │
│  │ API :3002   │  │   :5432     │  │   :3000     │                 │
│  │ (Deno)      │  │             │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│  Backend: ~/guardquote-deno/server.ts                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── components/
│   └── DataFlowDiagram.tsx   # Interactive React Flow diagram
├── context/
│   └── AuthContext.tsx       # Authentication state management
├── layouts/
│   ├── AdminLayout.tsx       # Admin dashboard shell + sidebar
│   └── PublicLayout.tsx      # Public pages header/footer
├── pages/
│   ├── Landing.tsx           # Public homepage
│   ├── QuoteForm.tsx         # Quote wizard
│   ├── Login.tsx             # Admin login
│   └── admin/
│       ├── Dashboard.tsx     # Overview stats
│       ├── Users.tsx         # User management (RBAC)
│       ├── Blog.tsx          # Blog posts
│       ├── Features.tsx      # Feature requests + voting
│       ├── Network.tsx       # Topology + data pipeline
│       ├── Services.tsx      # Infrastructure status
│       └── ML.tsx            # ML model management
├── App.tsx                   # Router configuration
├── main.tsx                  # Entry point
└── index.css                 # Tailwind + custom styles
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | TailwindCSS 3.4 |
| **Routing** | React Router 7 |
| **Icons** | Lucide React |
| **Diagrams** | React Flow (@xyflow/react) |
| **Backend** | Deno 2.6 + Hono (on pi1) |
| **Database** | PostgreSQL 16 |
| **Auth** | bcrypt + JWT |
| **Hosting** | Cloudflare Pages |

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

---

## Deployment

### Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=guardquote
```

### CI/CD

GitHub Actions runs on every push:
1. **lint-and-build** - TypeScript check + Vite build
2. **test** - Run tests (if present)

---

## Admin Access

**URL:** https://guardquote.vandine.us/admin

**Credentials:**
- Email: admin@guardquote.vandine.us
- Password: [see .env]

---

## Key Features

### For Clients (Public)
- Landing page with teal accent over black
- Quote wizard
- Instant price estimates

### For Admins
- Dashboard with stats
- User management (RBAC)
- Blog with comments
- Feature requests with voting and GitHub sync
- Network topology diagram
- Interactive data pipeline visualization
- Service monitoring

---

## Contributing

1. Clone repo and run `npm install`
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes
4. Push and create PR
5. Wait for approval + CI pass

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## Team

- **Lead Dev:** Rafa (rafael.garcia.contact.me@gmail.com)
- **Repo:** https://github.com/jag18729/guard-quote
- **Project Board:** https://github.com/users/jag18729/projects/1

---

## License

Private - Vandine Infrastructure
