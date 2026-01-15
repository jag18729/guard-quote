# GuardQuote Roadmap Skill

Use this skill to understand what's been built, what's in progress, and what's planned next.

## Completed Phases

### Phase -1: Infrastructure Setup
- PostgreSQL 15 on Pi1 with connection pooling (PgBouncer)
- Redis 7 for caching/sessions
- Monitoring stack: Prometheus, Grafana, Alertmanager, Loki/Promtail
- UFW firewall configuration
- fail2ban for SSH protection

### Phase 0: Client Page Enhancements
- Multi-step quote wizard (4 steps: Event, Location, Security, Review)
- Live price calculation via WebSocket
- Form validation with react-hook-form
- LocalStorage draft saving with auto-restore
- Debounced price updates (300ms)

### Phase 1: Admin Dashboard
- JWT authentication with refresh tokens
- Argon2 password hashing
- Admin login page
- Protected routes with AdminGuard
- Sidebar layout with navigation
- Dashboard with stats overview
- User management (CRUD)
- **Service management** - Compact LED-status cards, click-to-manage
- **SSH redundancy** - Retry logic with exponential backoff (3 attempts)
- **Automated backups** - Daily PostgreSQL, Redis, config backups at 2 AM

## Current Features

### Client-Facing
- Security quote wizard at `/quote/security`
- Live price updates as form changes
- Draft persistence across sessions

### Admin Panel
- Login at `/admin/login`
- Dashboard at `/admin`
- User management at `/admin/users`
- Service management at `/admin/services`

### Service Management
Manage Pi1 services from the admin UI:
- **Compact LED cards** - Green (running), Amber (stopped), Red (error), Purple (planned)
- **Click-to-manage** - Select a card to reveal action buttons
- **Systemd**: PostgreSQL, Redis, PgBouncer, fail2ban, UFW, Pi-hole
- **Docker**: Prometheus, Grafana, Alertmanager, Node Exporter, Loki, Promtail
- **Planned**: Traefik, OpenLDAP, Keycloak, Vault, MinIO
- Actions: Start, Stop, Restart, View Logs, Remediate
- System info: hostname, uptime, load, memory, disk, CPU temp
- SSH retry logic: 3 attempts with exponential backoff

### Backups
Automated daily backups at 2 AM on Pi1:
- **PostgreSQL** - Full dump (pg_dump -Fc)
- **Redis** - RDB snapshot
- **Configs** - postgresql, pg_hba, pgbouncer, fail2ban, pihole
- **Retention** - Local: 3 days, Remote (Pi0): 7 days
- **Script** - `/home/johnmarston/backup-guardquote.sh`

## Pending / Not Yet Implemented

### Phase 1 Remaining
- [ ] **Pi0 SSH setup** - Add keys for backup replication (see `pi0-setup.md`)
- [ ] Quote management page (`/admin/quotes`)
- [ ] Client management page (`/admin/clients`)
- [ ] Analytics page (`/admin/analytics`)
- [ ] Settings page (`/admin/settings`)
- [ ] Fix `last_login` column in users table

### Phase 2: Advanced Features (Planned)
- [ ] Email notifications (quote confirmation, reminders)
- [ ] PDF quote generation
- [ ] Payment integration
- [ ] Client portal with quote history
- [ ] Scheduling/calendar integration

### Phase 3: Scaling (Future)
- [ ] Multi-tenant support
- [ ] Role-based permissions (admin, manager, viewer)
- [ ] Audit logging
- [ ] API rate limiting
- [ ] Load balancing

## Known Issues

### Database
- `last_login` column doesn't exist in users table
- Fix: `ALTER TABLE users ADD COLUMN last_login TIMESTAMP;`

### Performance
- Services page initial load ~5s (17 services, parallel SSH calls)
- SSH retry adds latency on connection failures (up to 6s extra)

### Network
- UFW may need rules added for 192.168.1.x network if developing from there
- Pi0 SSH not configured yet - backups stored locally only

## Technical Debt

1. **Placeholder admin pages** - Quotes, Clients, Analytics, Settings are stubs
2. **No tests** - Should add unit and integration tests
3. **Hardcoded credentials** - Pi credentials in `pi-services.ts` should be env vars
4. **No HTTPS** - Local dev only, need TLS for production

## API Endpoints Status

| Endpoint | Status |
|----------|--------|
| Auth (login, refresh, me) | Working |
| Admin stats | Working |
| Admin users | Working (except last_login) |
| Admin services | Working |
| Quotes CRUD | Working |
| Clients CRUD | Working |
| WebSocket price calc | Working |

---

*Last updated: January 15, 2026*
*Current commit: 116d3b6*
