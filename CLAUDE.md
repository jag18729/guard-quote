# GuardQuote - Claude Context

## Project Overview
ML-powered security guard quoting system with PostgreSQL backend running on Raspberry Pi cluster.

## Quick Reference

### Infrastructure Skill
See `.claude/skills/infrastructure.md` for:
- SSH credentials and commands
- Server IPs and services
- Database connection strings
- Redis/PgBouncer passwords

### Key Locations
| What | Where |
|------|-------|
| Backend API | `backend/src/index.ts` |
| Frontend | `frontend/src/` |
| Services | `backend/src/services/` |
| Roadmap | `backend/.continue/ROADMAP.md` |
| Infrastructure | `.claude/skills/infrastructure.md` |

### Current Version: v2.2.0

### Servers
- **Pi1 (192.168.2.70):** PostgreSQL, Redis, PgBouncer, Prometheus, Grafana
- **Pi0 (192.168.2.101):** Offline (SSH needs fix)
- **Local:** Bun/Hono API server

### Next Phases
- **Phase 0:** Client page enhancements (live calculator, wizard)
- **Phase 1:** Admin dashboard (user/quote/client management)
- **Phase 2:** Authentication system (JWT, RBAC)

### SSH Quick Access
```bash
ssh pi1  # Database server (192.168.2.70)
```

### Start Development
```bash
cd ~/Projects/guard-quote
bun run backend/src/index.ts  # Start API
```

### Database
```bash
# Direct
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote

# Via PgBouncer (recommended)
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:6432/guardquote
```

### Redis
```bash
redis-cli -h 192.168.2.70 -a guardquote_redis_2024
```
