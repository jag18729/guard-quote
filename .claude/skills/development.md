# GuardQuote Development Skill

Use this skill when setting up local development, running the app, or debugging issues.

## Prerequisites

- **Bun** 1.3+ (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** 22+ (for Vite)
- **Python** 3.14+ (for ML engine)
- **sshpass** (`brew install hudochenkov/sshpass/sshpass`)

## Quick Start

### Start Backend (Terminal 1)
```bash
cd backend
bun install  # First time only
bun run --watch src/index.ts
```
Backend runs at http://localhost:3000

### Start Frontend (Terminal 2)
```bash
cd frontend
bun install  # First time only
bun run dev
```
Frontend runs at http://localhost:5173 (or 5174 if 5173 is busy)

### Start ML Engine (Optional, Terminal 3)
```bash
cd ml-engine
source .venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote
REDIS_URL=redis://:guardquote_redis_2024@192.168.2.70:6379
JWT_SECRET=your-secret-here
ML_ENGINE_URL=http://localhost:8000
```

## Common Development Tasks

### Check if Pi1 is reachable
```bash
ping -c 1 192.168.2.70
```

### Test database connection
```bash
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote -c "SELECT 1"
```

### Run database migrations
```bash
cd backend
bunx drizzle-kit push
```

### Generate Drizzle types
```bash
cd backend
bunx drizzle-kit generate
```

### Kill process on port
```bash
lsof -ti :3000 | xargs kill -9  # Backend
lsof -ti :5173 | xargs kill -9  # Frontend
```

## Admin Access

### Default Admin Account
- **Email**: admin@guardquote.com
- **Password**: admin123

### Create admin via API (one-time setup)
```bash
curl -X POST http://localhost:3000/api/auth/setup
```

### Login flow
```bash
# Get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardquote.com","password":"admin123"}'

# Use token
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer <token>"
```

## Debugging

### Backend logs
Backend logs to stdout with request/response info:
```
<-- GET /api/health
--> GET /api/health 200 5ms
```

### WebSocket testing
Connect to `ws://localhost:3000/ws` and send:
```json
{"type": "price.calculate", "data": {"eventType": "corporate", "guestCount": 100}}
```

### Check Pi1 services
```bash
ssh pi1 "systemctl status postgresql redis-server"
ssh pi1 "docker ps"
```

### Database queries
```bash
ssh pi1 "sudo -u postgres psql guardquote -c 'SELECT * FROM users'"
```

## Network Issues

### If Pi1 is unreachable from 192.168.1.x network
UFW on Pi1 may need rules for alternate network:
```bash
ssh pi1 "sudo ufw allow from 192.168.1.0/24 to any port 5432"
ssh pi1 "sudo ufw allow from 192.168.1.0/24 to any port 6379"
```

### Database connection timeout
1. Check Pi1 is reachable: `ping 192.168.2.70`
2. Check PostgreSQL is running: `ssh pi1 "systemctl status postgresql"`
3. Check UFW rules: `ssh pi1 "sudo ufw status"`
4. Check pg_hba.conf allows your IP

## File Locations

| What | Where |
|------|-------|
| Backend entry | `backend/src/index.ts` |
| DB schema | `backend/src/db/schema.ts` |
| Auth service | `backend/src/services/auth.ts` |
| Frontend router | `frontend/src/router/index.tsx` |
| Admin pages | `frontend/src/pages/admin/` |
| CSS modules | Same dir as component, `.module.css` |

## Hot Reload

- **Backend**: `bun run --watch` auto-reloads on file changes
- **Frontend**: Vite HMR updates in-place without refresh

## Testing the Quote Wizard

1. Go to http://localhost:5174/quote/security
2. Fill out event details (Step 1)
3. Enter location (Step 2)
4. Configure security options (Step 3)
5. Review and see live price updates (Step 4)

---

*Last updated: January 14, 2026*
