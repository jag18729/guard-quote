# GuardQuote Backend

> **Note:** The production backend runs on **Deno** at `pi1:~/guardquote-deno/`. This directory contains legacy Bun code that is no longer used.

## Current Production Stack

| Component | Technology | Location |
|-----------|------------|----------|
| Runtime | Deno 2.6.8 | pi1 ([see .env]) |
| Framework | Hono | `~/guardquote-deno/server.ts` |
| Database | PostgreSQL 16 | pi1 Docker |
| Auth | bcrypt + djwt (JWT) | Native Deno |
| Hosting | Cloudflare Tunnel | Origin: guardquote-origin.vandine.us |

## Why Deno?

Bun doesn't work on Raspberry Pi 4:
- Bun requires ARMv8.1+ CPU instructions
- Pi 4 is ARMv8.0 (causes SIGILL crash)
- Deno works natively on aarch64

## Production API

**Base URL:** https://guardquote.vandine.us/api

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check |
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Create user |
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/features` | Feature requests |
| POST | `/api/features` | Create feature |
| POST | `/api/features/:id/vote` | Vote on feature |
| POST | `/api/features/sync-github-all` | Sync to GitHub |
| GET | `/api/blog-posts` | List blog posts |
| POST | `/api/blog-posts` | Create post |
| GET | `/api/admin/stats` | Dashboard stats |

## Development

### On pi1

```bash
ssh pi1
cd ~/guardquote-deno
deno run -A server.ts
```

### Deploy Changes

```bash
# Copy updated server.ts to pi1
scp server.ts user@host:~/guardquote-deno/

# Restart on pi1
ssh pi1 'pkill -f "deno run"; cd ~/guardquote-deno && nohup deno run -A server.ts > /tmp/gq.log 2>&1 &'
```

### Check Logs

```bash
ssh pi1 'tail -f /tmp/gq.log'
```

## Database

```bash
# Connect to PostgreSQL
ssh pi1
PGPASSWORD=$DB_PASSWORD psql -h 127.0.0.1 -U postgres -d guardquote

# Tables
\dt
# users, clients, quotes, blog_posts, blog_comments, feature_requests
```

## Environment Variables (pi1)

```bash
# ~/guardquote-deno/.env
DATABASE_URL=postgres://postgres:$DB_PASSWORD@localhost:5432/guardquote
JWT_SECRET=<secret>
GITHUB_TOKEN=<ghp_token>
GITHUB_PROJECT_ID=<project_id>
```

## See Also

- **Main README:** `/README.md`
- **Frontend:** `/frontend/README.md`
- **Docs:** `/docs/`
