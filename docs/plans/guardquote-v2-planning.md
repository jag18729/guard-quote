# GuardQuote v2.0 — Planning Document

> **Status**: Codebase audit complete, proposed changes documented
> **Target runtime**: Bun 1.3+ (see `docs/bun-reference.md`)
> **Target deployment**: pi2 K3s (same as MarketPulse)
> **Current repos**: `jag18729/guard-quote` (backend, dev branch), `jag18729/guardquote-frontend` (React, master)
> **Current deployment**: pi1 Docker, port 3002
> **Approach**: Crawl → Walk → Run (skills-driven: infra-brainstorming → task-decomposition → parallel-dispatch)

---

## Codebase Audit (2026-02-18)

### Backend (6,650 lines, 16 files)

| File | Lines | Purpose | v2 Status |
|------|-------|---------|-----------|
| `src/index.ts` | 1,450 | Monolithic Hono router — all CRUD, ML, admin, webhooks | **Split into route modules** |
| `services/auth.ts` | 200 | Hand-rolled JWT (HMAC-SHA256), `Bun.password` argon2id | **Keep + add OAuth SSO** |
| `services/quote-calculator.ts` | 200 | Rule-based pricing (multipliers, not ML) | **Replace with real ML engine** |
| `services/websocket.ts` | 300 | Pub/sub channels, real-time price calc, admin commands | **Port to native Bun.serve WS** |
| `services/infrastructure.ts` | 622 | SSH-based Pi cluster management | **Remove — OpenClaw handles infra** |
| `services/monitor.ts` | 600 | Health monitoring for admin dashboard | **Simplify — Grafana/Prometheus exist** |
| `services/pi-services.ts` | 696 | SSH into Pi, systemd control, demo mode | **Remove — out of scope for quote app** |
| `services/cache.ts` | 448 | Redis + in-memory fallback | **Replace with native Bun Redis** |
| `services/backup.ts` | 598 | pg_dump scheduler | **Simplify — K8s CronJob or OpenClaw cron** |
| `services/logging.ts` | 438 | Syslog RFC 5424 | **Replace — Vector handles log shipping** |
| `services/index.ts` | 179 | Barrel exports | Keep |
| `middleware/rate-limit.ts` | 274 | Redis sliding window | **Port — use native Bun Redis** |
| `middleware/s2s-auth.ts` | 105 | PSK for ML engine communication | **Keep — needed for ML microservice** |
| `schemas/ingest.ts` | 276 | Zod transforms for AI-generated training data | **Keep — useful for data pipeline** |
| `db/connection.ts` | 29 | postgres.js connection | Keep (or evaluate `Bun.sql`) |
| `db/schema.ts` | 253 | **DEAD CODE** — Drizzle/MySQL ORM, not used | **Delete** |
| `db/schema.sql` | 170 | PostgreSQL DDL — the actual schema | **Keep as source of truth** |
| `seed-training-data.ts` | — | Synthetic ML training data | **Expand for ML bootstrap** |

### Frontend (5,620 lines, 21 files)

| Page/Component | Purpose | v2 Status |
|----------------|---------|-----------|
| `Landing.tsx` | Marketing page | Keep/refresh |
| `Login.tsx` | Email/password auth | **Add OAuth buttons (GitHub, Google)** |
| `QuoteForm.tsx` | Public quote request | Keep — core feature |
| `TechStack.tsx` | Architecture showcase | Update for v2 stack |
| `DataFlowDiagram.tsx` | xyflow visualization | Update for ML pipeline |
| `admin/Dashboard.tsx` | Admin overview | Simplify (remove infra) |
| `admin/ML.tsx` | ML training data management | **Expand — real model status/metrics** |
| `admin/Services.tsx` | Pi service management | **Remove or repurpose** |
| `admin/Network.tsx` | Network status | **Remove — Grafana does this** |
| `admin/Users.tsx` | User management | **Add SSO provider column** |
| `admin/QuoteRequests.tsx` | Incoming quote requests | Keep |
| `admin/Logs.tsx` | Log viewer | **Remove — Grafana/Loki does this** |
| `admin/Blog.tsx` | Blog management | Keep |
| `admin/Features.tsx` | Feature flags | Keep |
| `admin/Profile.tsx` | User profile | **Add linked SSO accounts** |
| `context/AuthContext.tsx` | React auth state | **Extend for OAuth flows** |

### Database Schema (PostgreSQL)

11 tables — well-normalized (3NF):
- `users` — auth, roles (admin/manager/user)
- `locations` — zip, city, state, risk_zone, base_multiplier
- `event_types` — code, base_hourly_rate, risk_weight
- `service_options` — add-on pricing (armed, vehicle, K9, supervisor)
- `clients` — company info, credit limits, payment terms
- `quotes` — main header, event details, ML fields (risk_score, confidence_score)
- `quote_line_items` — itemized breakdown
- `quote_status_history` — audit trail
- `ml_training_data` — denormalized features + targets (final_price, risk_score, was_accepted)
- `webhooks` — event notification config
- `webhook_logs` — delivery tracking

**Schema changes for v2:**
- Add `oauth_providers` table (user_id, provider, provider_user_id, access_token, refresh_token)
- Add `provider` column to `users` (local, github, google, etc.)
- Add `ml_models` table (version, metrics, trained_at, status, artifact_path)
- Consider `sessions` table for refresh token management (vs stateless JWT)

---

## Proposed Changes

### 1. SSO / OAuth Integration (HIGH PRIORITY)

**Providers**: GitHub, Google (others TBD)

**Flow**:
- Frontend: OAuth buttons → redirect to provider → callback with code
- Backend: Exchange code for tokens, create/link user, issue JWT
- Account linking: Existing email/password users can link OAuth accounts
- New signups via OAuth skip password entirely

**Implementation approach**:
- OAuth 2.0 / OIDC standard flows (authorization code grant)
- Store provider tokens for API access if needed
- Map provider roles → GuardQuote roles (or default to `user`)
- No framework dependency — raw HTTP to OAuth endpoints from Bun

### 2. Real ML Engine (HIGH PRIORITY)

**Current state**: `quote-calculator.ts` is rule-based math pretending to be ML. The `ml_training_data` table exists but nothing trains on it.

**Proposed architecture — 3-source intelligence**:

| Source | What | How |
|--------|------|-----|
| **Trained model** | XGBoost/scikit-learn on `ml_training_data` | Python microservice on pi2 K3s |
| **External APIs** | Crime stats, weather, local events, demographic data | Bun `fetch()` + `dns.prefetch` at startup |
| **Rule engine** | Business rules, minimums, overrides, client-specific pricing | Bun-native, configurable |

**ML microservice** (Python, separate K3s pod):
- Train on `ml_training_data` (features: event type, location, guards, hours, crowd, time, armed, vehicle)
- Predict: `final_price`, `risk_score`, `acceptance_probability`
- Expose REST API (predict, batch predict, model stats, retrain trigger)
- S2S auth via existing PSK middleware
- **Webhook when training completes** → notify backend → broadcast via WS to admin dashboard
- **Email report** with model metrics, drift detection, training summary

**Data pipeline**:
- Every completed quote feeds back into `ml_training_data`
- `schemas/ingest.ts` Zod transforms already handle messy input
- Periodic retrain (cron or manual trigger from admin UI)
- Model versioning in `ml_models` table

### 3. Backend Restructure (Bun 1.3 Port)

**From**: Monolithic Hono `index.ts` (1,450 lines)
**To**: Native `Bun.serve()` with route modules

```
src/
  server.ts          — single Bun.serve() entry (HTTP + WS)
  routes/
    auth.ts          — login, signup, OAuth callbacks, refresh
    quotes.ts        — CRUD, calculate, status transitions
    clients.ts       — CRUD
    admin.ts         — dashboard, users, ML management
    webhooks.ts      — CRUD + delivery
    ml.ts            — predict, batch, retrain trigger
  services/
    auth.ts          — JWT, password hashing, OAuth token exchange
    quote-calculator.ts — rule engine (one of 3 sources)
    ml-client.ts     — HTTP client to Python ML service
    cache.ts         — native Bun Redis
    webhook.ts       — delivery + HMAC signing
  middleware/
    auth.ts          — JWT verification
    rate-limit.ts    — Redis sliding window
    s2s.ts           — PSK for ML service
  db/
    connection.ts    — postgres.js (or Bun.sql)
    schema.sql       — DDL source of truth
```

**Key changes**:
- Drop Hono → native routes (proven in MarketPulse)
- Drop ~1,900 lines of infra/Pi management code (OpenClaw + Grafana handle this)
- Drop custom syslog logging (Vector handles log shipping)
- Native Bun Redis replaces custom Redis client
- `Bun.password` argon2id already in use ✅
- `--smol` flag for Pi deployment
- `perMessageDeflate` on WebSocket
- `dns.prefetch` for external APIs at startup

### 4. Remove Overlap with Infrastructure Stack

**What to remove from GuardQuote** (handled by existing infra):

| GuardQuote feature | Already handled by |
|--------------------|--------------------|
| `infrastructure.ts` (622L) — Pi cluster SSH monitoring | OpenClaw pi-fleet skill + Prometheus |
| `monitor.ts` (600L) — service health checks | Prometheus blackbox + node_exporter |
| `pi-services.ts` (696L) — systemd control via SSH | OpenClaw + direct SSH |
| `logging.ts` (438L) — syslog shipping | Vector on pi0/pi2 → Loki |
| `admin/Network.tsx` — network status | Grafana Network & Firewall dashboard |
| `admin/Logs.tsx` — log viewer | Grafana + Loki |
| `admin/Services.tsx` — Pi service control | OpenClaw |

**~2,350 lines of backend + 3 admin pages removed.** GuardQuote focuses on what it does: quoting.

### 5. Frontend Updates

- **OAuth login buttons** (GitHub, Google) on Login page
- **Linked accounts** section on Profile page
- **ML dashboard** upgrade — real model metrics, training history, drift charts
- **Remove infra pages** (Services, Network, Logs) — link to Grafana instead
- **Update DataFlowDiagram** to show 3-source ML architecture
- Keep React 18, React Router 7, Tailwind, framer-motion, xyflow

### 6. Deployment & Migration

**Target**: pi2 K3s (namespace `guardquote`)

| Component | K3s Resource | Port |
|-----------|-------------|------|
| Bun API+WS | Deployment + Service | NodePort 305XX |
| ML Engine (Python) | Deployment + Service | ClusterIP (internal only) |
| PostgreSQL | External ([see .env]) or K8s pod | 5432 |
| Redis | Deployment + Service | ClusterIP |

**Migration path** (from MarketPulse lessons):
1. Deploy v2 on separate NodePort alongside v1
2. PA-220 firewall rule (if needed for tunnel routing)
3. Test side-by-side
4. Cut over CF tunnel / DNS
5. Decommission v1 on pi1

**Password migration**: Existing bcrypt hashes work with `Bun.password.verify` (auto-detects algorithm). New passwords hashed with argon2id. No forced resets needed.

---

## Pre-Planning Checklist

- [x] **Codebase audit** — backend + frontend fully inventoried
- [x] **API surface inventory** — all routes cataloged from `index.ts`
- [x] **Data model review** — PostgreSQL schema documented, v2 changes proposed
- [x] **ML assessment** — rule-based, not real ML. Real engine proposed.
- [x] **Frontend audit** — 21 files, pages categorized
- [x] **Dependency inventory** — Hono (drop), postgres (keep), bcrypt (Bun.password), resend (keep), zod (keep for ingest)
- [x] **Deployment target** — pi2 K3s confirmed
- [ ] **UAT findings** — pending full testing
- [ ] **OAuth provider registration** — GitHub OAuth app, Google OAuth credentials
- [ ] **External APIs for ML** — identify crime stats, weather, events APIs
- [ ] **Training data volume** — how much is in `ml_training_data` currently?

---

## Skills to Apply

| Phase | Skill | Purpose |
|-------|-------|---------|
| Design | `infra-brainstorming` | Validate architecture before implementation |
| Planning | `task-decomposition` | Break into verifiable subtasks |
| Implementation | `parallel-dispatch` | Subagents for independent workstreams |
| Code review | `agent-review-gates` | Two-stage review on subagent output |
| Testing | `verification-before-completion` | Verify each change works |
| Docs | `change-documentation` | Track all changes |
| Rollback | `rollback-patterns` | If anything goes sideways |

---

## Timeline (Proposed Phases)

| Phase | Description | Dependencies |
|-------|-------------|-------------|
| 0 | ✅ Codebase audit + planning doc | — |
| 1 | OAuth provider setup (GitHub, Google apps) | Account access |
| 2 | Design review (infra-brainstorming) | Phase 0 |
| 3 | Task decomposition + implementation plan | Phase 2 approval |
| 4 | Backend port to Bun 1.3 (routes, auth, OAuth) | Phase 3 |
| 5 | ML engine (Python microservice + training pipeline) | Phase 3 |
| 6 | Frontend updates (OAuth, ML dashboard, cleanup) | Phase 4+5 |
| 7 | Deploy to pi2 K3s (test namespace) | Phase 4+5+6 |
| 8 | Integration testing + UAT | Phase 7 |
| 9 | Cutover + monitoring | Phase 8 sign-off |

---

## Key Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun 1.3 | Proven in MarketPulse, native WS, password hashing, Redis |
| Framework | None (native `Bun.serve`) | Zero deps, proven pattern |
| ML engine | Python microservice | Tabular data → scikit-learn/XGBoost is pragmatic |
| ML communication | REST + S2S PSK + webhook on completion | S2S middleware already exists |
| Intelligence sources | 3: trained model + external APIs + rule engine | User request: "leverage APIs and own trained data, maybe add a third" |
| SSO | OAuth 2.0 (GitHub, Google) | User request: important upgrade |
| Infra monitoring | Remove from app → OpenClaw/Grafana | Eliminate 2,350 lines of overlap |
| Deployment | pi2 K3s | User confirmed: "p3 k3 forsure" |
| Password migration | Auto-detect on verify, argon2id for new | No forced resets |
| Approach | Skills-driven crawl-walk-run | Use all 20 skills built today |

---

*Last updated: 2026-02-18*
*Reference: `docs/bun-reference.md` for Bun patterns and API cheat sheet*
