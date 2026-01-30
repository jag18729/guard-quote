# GuardQuote

AI-powered cybersecurity assessment platform that generates personalized security recommendations based on user risk profiles.

## Quick Start (Clone & Go)

### Prerequisites

- **Node.js 18+** or **Bun 1.0+** (recommended)
- **PostgreSQL 14+** (optional - runs in demo mode without it)

### 1. Clone the Repository

```bash
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote
```

### 2. Install Dependencies

```bash
# Backend
cd backend
bun install   # or: npm install

# Frontend
cd ../frontend
bun install   # or: npm install
```

### 3. Set Up Environment

```bash
# Backend - copy example env
cd backend
cp .env.example .env
```

Edit `.env` if you have a database, or leave defaults for **Demo Mode**:

```env
# Demo Mode (no database required)
DATABASE_URL=postgres://localhost/guardquote
PORT=3000
JWT_SECRET=dev-secret-change-in-production
```

### 4. Run the App

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev   # or: npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev   # or: npm run dev
```

### 5. Open in Browser

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Admin Panel:** http://localhost:5173/admin

---

## Demo Mode vs Live Mode

The app shows a **status indicator** in the header:

| Status | Meaning |
|--------|---------|
| 🟡 **Demo Mode** | No database connected - mock data used |
| 🔵 **Local DB** | Connected to local PostgreSQL |
| 🟢 **Live** | Connected to production database |

**Demo Mode Features:**
- Quote form submission works (stored in session)
- Personalized reports generated from form data
- Admin panel accessible with default credentials
- No data persistence between sessions

---

## Default Login Credentials

```
Email:    admin@guardquote.com
Password: admin123
```

---

## Project Structure

```
guard-quote/
├── backend/                 # Bun + Hono API
│   ├── src/
│   │   ├── index.ts        # Main server & routes
│   │   └── db/             # Database schema
│   ├── .env.example        # Environment template
│   └── package.json
│
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/          # Page components
│   │   │   ├── IndividualQuote.tsx   # 4-step quote wizard
│   │   │   ├── Report.tsx            # Personalized report
│   │   │   └── admin/                # Admin pages
│   │   ├── components/     # Reusable components
│   │   ├── layouts/        # Page layouts
│   │   ├── context/        # React context (auth)
│   │   └── router/         # Route definitions
│   └── package.json
│
└── ml-engine/              # Python ML service (optional)
    └── ...
```

---

## Features

### Public Pages
- **Landing Page** - Service overview with CTA
- **Quote Wizard** - 4-step personalized assessment
- **Security Report** - AI-generated recommendations based on:
  - Current protection (antivirus, VPN, 2FA, etc.)
  - Device count & usage patterns
  - Work-from-home status
  - Budget constraints
  - Technical comfort level

### Admin Dashboard
- **Quote Requests** - View and manage submissions
- **User Management** - Create admin accounts
- **Status Overview** - Request pipeline visualization
- **Quick Actions** - Common tasks

---

## Database Setup (Optional)

If you want data persistence, set up PostgreSQL:

### Local PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb guardquote

# Run migrations
cd backend
psql -d guardquote -f src/db/schema.sql
```

Update `.env`:
```env
DATABASE_URL=postgres://localhost/guardquote
```

### Docker (Alternative)

```bash
docker run -d \
  --name guardquote-db \
  -e POSTGRES_DB=guardquote \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Update .env
DATABASE_URL=postgres://postgres:password@localhost:5432/guardquote
```

---

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | System status (mode, connections) |
| POST | `/api/quote-requests` | Submit quote (creates user + request) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | User signup |

### Admin (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/quote-requests` | List all requests |
| PATCH | `/api/admin/quote-requests/:id` | Update request status |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, React Router |
| Backend | Bun, Hono, PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Styling | CSS Modules |
| Forms | React Hook Form |

---

## Development

### Run Tests
```bash
cd backend && bun test
cd frontend && bun test
```

### Build for Production
```bash
cd frontend && bun run build
```

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgres://user:pass@host:5432/db
PORT=3000
JWT_SECRET=your-secret-key
ML_ENGINE_URL=http://localhost:8000  # optional
```

---

## Troubleshooting

### "Cannot connect to database"
- This is fine! The app runs in **Demo Mode** without a database
- Check the status indicator in the header

### "Port 3000 already in use"
```bash
lsof -ti :3000 | xargs kill -9
```

### "Module not found"
```bash
cd backend && bun install
cd frontend && bun install
```

### Admin login not working
- Use default credentials: `admin@guardquote.com` / `admin123`
- Or check if database has the admin user seeded

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Status |
|----------|---------|--------|
| `pr-check.yml` | Push/PR to main | ✅ Active |
| `integration.yml.disabled` | — | ⏸️ Disabled |

**PR Check** runs on every push:
- Backend: install, lint, typecheck
- Frontend: install, lint, typecheck
- ML Engine: install, lint, tests

**Integration Tests** (disabled) require:
- Self-hosted runner on local network
- Access to Pi1 (192.168.2.70) for PostgreSQL/Redis

To re-enable: rename `integration.yml.disabled` → `integration.yml`

---

## Team

Built for CIT 480 - California State University, Northridge

## License

MIT

