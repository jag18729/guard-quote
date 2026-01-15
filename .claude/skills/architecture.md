# GuardQuote Architecture Skill

Use this skill when working on GuardQuote codebase structure, understanding the tech stack, or making architectural decisions.

## Project Structure

```
guard-quote/
├── backend/           # Bun + Hono API server
│   └── src/
│       ├── index.ts           # Main server entry point
│       ├── db/
│       │   ├── connection.ts  # PostgreSQL connection (postgres.js)
│       │   └── schema.ts      # Drizzle ORM schema
│       └── services/
│           ├── auth.ts        # JWT + Argon2 authentication
│           ├── websocket.ts   # Real-time WebSocket handler
│           ├── quote-calculator.ts  # ML-based quote pricing
│           └── pi-services.ts # Pi1 service management via SSH
├── frontend/          # React 19 + Vite
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── context/
│       │   └── AuthContext.tsx    # Auth state management
│       ├── hooks/
│       │   └── useQuoteWebSocket.ts  # Live quote updates
│       ├── layouts/
│       │   ├── PublicLayout.tsx   # Client-facing layout
│       │   ├── AdminLayout.tsx    # Admin sidebar layout
│       │   └── DashboardLayout.tsx
│       ├── pages/
│       │   ├── SecurityQuote.tsx  # Multi-step quote wizard
│       │   └── admin/
│       │       ├── AdminLogin.tsx
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminUsers.tsx
│       │       └── AdminServices.tsx
│       └── router/
│           └── index.tsx      # React Router config
├── ml-engine/         # Python FastAPI ML service
│   └── src/
│       └── main.py            # ML quote generation
└── .claude/
    └── skills/                # Claude Code skills
```

## Tech Stack

### Backend (Port 3000)
- **Runtime**: Bun 1.3+
- **Framework**: Hono (fast web framework)
- **Database**: PostgreSQL 15 via postgres.js
- **ORM**: Drizzle ORM (schema + migrations)
- **Auth**: JWT (HS256) + Argon2 password hashing
- **Real-time**: Native WebSocket (Bun.serve)

### Frontend (Port 5173/5174 dev)
- **Framework**: React 19
- **Build**: Vite 7.x
- **Router**: react-router-dom v7
- **Forms**: react-hook-form
- **Styling**: CSS Modules

### Database (Pi1 - 192.168.2.70)
- **PostgreSQL**: Port 5432 (direct) or 6432 (PgBouncer)
- **Redis**: Port 6379 (caching, sessions)
- **Connection pooling**: PgBouncer

### ML Engine (Port 8000)
- **Runtime**: Python 3.14
- **Framework**: FastAPI
- **ML**: scikit-learn

## Database Schema

### Core Tables
```sql
-- users: Admin and client accounts
users (id, email, password_hash, first_name, last_name, role, is_active, created_at)

-- clients: Business/individual clients
clients (id, name, email, phone, company_name, created_at)

-- quotes: Security service quotes
quotes (id, client_id, event_type, event_date, location, guest_count,
        duration_hours, base_price, risk_multiplier, final_price, status, created_at)

-- event_types: Supported event categories
event_types (id, name, base_rate, risk_factor, description)

-- locations: Service areas with risk factors
locations (id, city, state, zip_code, risk_modifier)
```

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/health` - API health with DB status

### Authentication
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/setup` - Create initial admin (one-time)

### Admin (requires JWT)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Services Management (requires JWT)
- `GET /api/admin/services` - List all Pi1 services
- `GET /api/admin/services/system` - Pi1 system info
- `POST /api/admin/services/:name/start` - Start service
- `POST /api/admin/services/:name/stop` - Stop service
- `POST /api/admin/services/:name/restart` - Restart service
- `POST /api/admin/services/:name/remediate` - Auto-fix service
- `GET /api/admin/services/:name/logs` - View service logs

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client

### WebSocket (ws://localhost:3000/ws)
Messages:
- `price.calculate` - Request live price calculation
- `price.calculating` - Acknowledgment
- `price.update` - Price result with breakdown

## Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Backend verifies with Argon2, returns JWT access + refresh tokens
3. Frontend stores in localStorage via AuthContext
4. Requests include `Authorization: Bearer <token>` header
5. Protected routes use `AdminGuard` component

## Key Patterns

### Error Handling
```typescript
try {
  // operation
} catch (err: any) {
  return c.json({ error: err.message }, 500);
}
```

### Auth Middleware
```typescript
const authHeader = c.req.header("Authorization");
const token = authHeader?.replace("Bearer ", "");
const payload = await verifyToken(token);
if (!payload) return c.json({ error: "Unauthorized" }, 401);
```

### SSH Commands (Pi Services)
```typescript
const proc = Bun.spawn(["sshpass", "-p", PI_PASS, "ssh", ...]);
const stdout = await new Response(proc.stdout).text();
```

---

*Last updated: January 14, 2026*
