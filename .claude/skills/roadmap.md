# GuardQuote Roadmap

Project status, completed work, and planned features.

## Current State (v2.3.0)

**What's Working:**
- Client quote wizard with WebSocket real-time pricing
- Admin dashboard with auth, user management, service monitoring
- ML Engine with trained models (R² 0.82, 84% risk accuracy)
- CI/CD pipeline on self-hosted GitHub Actions runner
- PostgreSQL on Pi1 with automated backups to Pi0

## ✅ Completed

### Infrastructure (Pi Cluster)

| Component | Status | Details |
|-----------|--------|---------|
| PostgreSQL 15 | ✅ Pi1 | PgBouncer pooling, 5432/6432 |
| Redis 7 | ✅ Pi1 | Sessions/cache, 6379 |
| Monitoring | ✅ Pi1 | Prometheus, Grafana, Loki |
| Security | ✅ Pi1 | UFW, fail2ban, Pi-hole |
| GitHub Runner | ✅ Pi0 | Self-hosted actions runner |
| Backup Replication | ✅ Pi0 | Daily sync from Pi1 |

### Client Application

| Feature | Route | Description |
|---------|-------|-------------|
| Quote Wizard | `/quote/security` | 4-step form with validation |
| Live Pricing | WebSocket | 300ms debounced updates |
| Draft Persistence | localStorage | Auto-save/restore |

### Admin Dashboard

| Feature | Route | Description |
|---------|-------|-------------|
| Authentication | `/admin/login` | JWT + refresh tokens, Argon2 |
| Dashboard | `/admin` | Stats overview |
| Users | `/admin/users` | CRUD management |
| Services | `/admin/services` | LED status, start/stop/logs |

### ML Engine

| Model | Algorithm | Performance |
|-------|-----------|-------------|
| Price Prediction | Gradient Boosting | R² 0.82, MAE 8.2% |
| Risk Assessment | Random Forest | 84% accuracy |
| Acceptance | Logistic Regression | 74% baseline |

**Training Data:** 1,100 records with 2026 pricing benchmarks
**Event Types:** 7 (tech_summit, music_festival, vip_protection, etc.)

### CI/CD (GitHub Actions)

| Workflow | Trigger | Runner | Purpose |
|----------|---------|--------|---------|
| `pr-check.yml` | PR/Push | ubuntu-latest | Lint, type check |
| `train-ml.yml` | Weekly/Manual | Pi0 | Retrain models |
| `integration.yml` | Push main | Pi0 | Test vs Pi1 services |

## 🔄 In Progress

### Admin Completion
- [ ] Quote management page (`/admin/quotes`)
- [ ] Client management page (`/admin/clients`)
- [ ] Analytics dashboard (`/admin/analytics`)
- [ ] Settings page (`/admin/settings`)

### ML Pipeline
- [ ] Train models on PostgreSQL (currently MySQL connector in train_models.py)
- [ ] Model versioning with timestamps
- [ ] A/B testing framework for price recommendations

## 📋 Backlog (Prioritized)

### High Priority

| Item | Domain | Effort | Impact |
|------|--------|--------|--------|
| Fix train_models.py DB connector | ML | S | Blocker |
| Add `last_login` to users | Backend | S | Feature |
| Move Pi credentials to env vars | Backend | S | Security |
| Unit tests for quote calculator | Backend | M | Quality |
| Integration tests in CI | DevOps | M | Quality |

### Medium Priority

| Item | Domain | Effort | Impact |
|------|--------|--------|--------|
| PDF quote generation | Backend | M | Feature |
| Email notifications | Backend | M | Feature |
| Client portal with history | Full-stack | L | Feature |
| HTTPS/TLS setup | Infra | M | Security |
| API rate limiting | Backend | S | Security |

### Lower Priority

| Item | Domain | Effort | Impact |
|------|--------|--------|--------|
| Payment integration | Full-stack | L | Revenue |
| Calendar integration | Full-stack | M | Feature |
| Multi-tenant support | Full-stack | XL | Scale |
| Role-based permissions | Backend | M | Feature |
| Mobile responsiveness | Frontend | M | UX |

## 🐛 Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| `last_login` column missing | Low | `ALTER TABLE users ADD COLUMN last_login TIMESTAMP;` |
| Services page ~5s load | Low | SSH parallelization in place |
| train_models.py uses MySQL | Medium | Manually use psycopg2 scripts |

## 🔧 Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Admin pages are stubs | High | Quotes, Clients, Analytics need UI |
| No test coverage | High | Add pytest for ML, bun test for backend |
| Hardcoded credentials | Medium | Extract to env vars in `pi-services.ts` |
| Local dev only (HTTP) | Low | Need TLS for production |
| Mixed DB connectors | Medium | Standardize on psycopg2 for PostgreSQL |

## 🔮 Future Vision (Unscheduled)

**Platform:**
- Kubernetes deployment on Pi cluster
- Auto-scaling based on quote volume
- Geographic load balancing

**ML/AI:**
- Dynamic pricing based on demand
- Competitor price monitoring
- Natural language quote requests
- Anomaly detection for fraud

**Business:**
- White-label solution
- API for third-party integrations
- Marketplace for security providers
- Mobile app (React Native)

## API Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/auth/login` | ✅ | JWT tokens |
| `POST /api/auth/refresh` | ✅ | Token refresh |
| `GET /api/auth/me` | ✅ | Current user |
| `GET /api/admin/stats` | ✅ | Dashboard data |
| `CRUD /api/admin/users` | ⚠️ | Missing last_login |
| `GET /api/admin/services` | ✅ | Pi1 services |
| `CRUD /api/quotes` | ✅ | Quote management |
| `WS /ws` | ✅ | Real-time pricing |
| `POST /api/v1/quote` | ✅ | ML prediction (8000) |
| `POST /api/v1/risk-assessment` | ✅ | Risk scoring (8000) |

---

*Last updated: January 15, 2026*
*Commit: 2439e95*
