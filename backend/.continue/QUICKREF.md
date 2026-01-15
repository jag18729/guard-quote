# GuardQuote Quick Reference

## Server IPs

| Server | IP | SSH | Role |
|--------|-----|-----|------|
| Pi1 DB | 192.168.2.70 | `ssh johnmarston@192.168.2.70` | PostgreSQL, Redis |
| Syslog | 192.168.2.101 | `ssh user@192.168.2.101` | Logs, Prometheus, Grafana |
| Local | localhost:3000 | - | API Server |

## Ports

| Service | Port | Server |
|---------|------|--------|
| API | 3000 | Local |
| PostgreSQL | 5432 | Pi1 |
| Redis | 6379 | Pi1 |
| PgBouncer | 6432 | Pi1 |
| Syslog | 514/UDP | Syslog |
| Prometheus | 9090 | Syslog |
| Grafana | 3000 | Syslog |
| Node Exporter | 9100 | All |
| Postgres Exporter | 9187 | Pi1 |

## Quick Commands

```bash
# Start API server
cd /Users/rjgar/Projects/guard-quote/backend && bun run src/index.ts

# Health check
curl http://localhost:3000/health

# All services status
curl http://localhost:3000/admin/services | jq

# Infrastructure status
curl http://localhost:3000/admin/infra | jq

# Recent logs
curl "http://localhost:3000/admin/logs?limit=20" | jq

# Backup database
curl -X POST http://localhost:3000/admin/backups/full | jq
```

## Database

```bash
# Connect to PostgreSQL
PGPASSWORD='WPU8bj3nbwFyZFEtHZQz' psql -h 192.168.2.70 -U guardquote -d guardquote

# Quick query
ssh johnmarston@192.168.2.70 "PGPASSWORD='WPU8bj3nbwFyZFEtHZQz' psql -h localhost -U guardquote -d guardquote -c 'SELECT COUNT(*) FROM quotes'"
```

## Redis

```bash
# Connect to Redis
redis-cli -h 192.168.2.70 -a guardquote_redis_2024

# Ping
redis-cli -h 192.168.2.70 -a guardquote_redis_2024 ping
```

## Syslog

```bash
# View GuardQuote logs
ssh user@192.168.2.101 "tail -f /var/log/guardquote.log"

# Send test message
echo "<134>Test $(date)" | nc -u 192.168.2.101 514
```

## Web UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://192.168.2.101:3000 | admin/admin |
| Prometheus | http://192.168.2.101:9090 | - |
| API Health | http://localhost:3000/health | - |

## Claude Skills

| Command | Description |
|---------|-------------|
| `/start-server` | Start API server |
| `/validate` | Validate endpoints |
| `/predict` | Test ML prediction |
| `/troubleshoot` | Fix common issues |
| `/backup-ops` | Backup commands |
| `/logs` | Log analysis |
| `/infra` | Infrastructure mgmt |
| `/services` | Service management |
| `/setup-infra` | Install packages |
| `/admin-dashboard` | Dashboard design |

## Files

| File | Description |
|------|-------------|
| `.continue/config.json` | Task list & infrastructure config |
| `.continue/ROADMAP.md` | Project roadmap with phases |
| `.continue/INFRASTRUCTURE.md` | Full setup guide |
| `.continue/PACKAGES.md` | Package installation reference |
| `CLAUDE.md` | Project context |

## Environment Variables

```bash
# .env
PORT=3000
DATABASE_URL=postgres://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70/guardquote
REDIS_URL=redis://:guardquote_redis_2024@192.168.2.70:6379
SYSLOG_HOST=192.168.2.101
SYSLOG_PORT=514
SYSLOG_ENABLED=true
LOG_LEVEL=info
BACKUP_ENABLED=true
```
