# GuardQuote v2.0 — Architecture Document

> **Role**: Architect (documentation only — no implementation code)
> **Status**: Proposed changes with examples, rationale, and recommendations
> **Last updated**: 2026-02-18

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [OAuth / SSO Integration](#2-oauth--sso-integration)
3. [Real ML Engine (3-Source Intelligence)](#3-real-ml-engine-3-source-intelligence)
4. [Backend Restructure (Bun 1.3)](#4-backend-restructure-bun-13)
5. [Infrastructure Overlap Removal](#5-infrastructure-overlap-removal)
6. [Frontend Changes](#6-frontend-changes)
7. [Database Schema Evolution](#7-database-schema-evolution)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Migration Strategy](#9-migration-strategy)
10. [Architect's Concerns — Open Questions & Known Gaps](#10-architects-concerns--open-questions--known-gaps)
6. [Frontend Changes](#6-frontend-changes)
7. [Database Schema Evolution](#7-database-schema-evolution)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Current State Analysis

### The Problem

The v1 backend is a 1,450-line monolithic `index.ts` that does everything: routing, auth, CRUD, ML prediction, webhook delivery, Pi SSH management, and WebSocket handling. It's a working prototype, but it's got three structural problems that block the next stage of growth:

1. **The "ML engine" is hardcoded math.** The code says `model_used: "GuardQuote ML v2.0"` and reports `r2_score: 0.89`, but those are **static strings** — there's no model, no training, no inference. The `ml_training_data` table exists and has good feature columns, but nothing reads from it to learn. The entire pricing logic is nested if/else multipliers.

2. **1,900 lines of infrastructure management don't belong here.** `infrastructure.ts` (622L), `monitor.ts` (600L), and `pi-services.ts` (696L) SSH into Raspberry Pis to manage systemd services. This is the same thing OpenClaw, Prometheus, and Grafana already do. It's duplicated effort, and it means a quoting app has SSH credentials and systemd control baked in.

3. **No SSO.** Users can only sign up with email/password. For a B2B security quoting platform, OAuth via GitHub/Google is table stakes — clients expect it, and it removes friction from the signup funnel.

### What Works Well (Keep These)

- **Database schema**: 3NF normalized, 11 tables, clean relationships. The `ml_training_data` table has exactly the right features for real training.
- **Auth service** (`services/auth.ts`): Already uses `Bun.password` with argon2id. Hand-rolled JWT with HMAC-SHA256 via `crypto.subtle` — clean, no deps.
- **WebSocket service** (`services/websocket.ts`): Pub/sub channels, real-time price updates, admin vs client connections. Architecture is sound.
- **Webhook system**: HMAC-signed delivery with retry tracking and logs. Production-grade pattern.
- **S2S auth middleware** (`middleware/s2s-auth.ts`): Pre-shared key for internal service communication. This is exactly what the ML engine will need.
- **Ingest schemas** (`schemas/ingest.ts`): Zod transforms that handle messy AI-generated training data. Smart defensive pattern.
- **Frontend**: React 18, Tailwind, framer-motion, xyflow — solid stack, good component structure.

### What the Codebase Tells Us

Looking at `index.ts` lines ~280-420, the ML prediction endpoint duplicates the same multiplier logic that exists in `services/quote-calculator.ts`. This happened because the monolithic file grew organically — someone needed a `/ml/quote` endpoint and copy-pasted the calculation instead of importing the service. This is the #1 sign it's time to split into modules.

The frontend `admin/ML.tsx` already has UI for model status, training data management, version rollback, and retraining triggers — but the backend endpoints it calls (`/api/admin/ml/status`, `/api/admin/ml/rollback`, `/api/admin/ml/retrain`) don't exist in `index.ts`. The admin ML page is **built for a real ML engine that was never connected**. That's actually good news — the frontend is ready.

---

## 2. OAuth / SSO Integration

### Goal

Let users sign in with GitHub or Google instead of (or in addition to) email/password. Reduce signup friction for B2B clients. Enable future provider expansion (Microsoft, Okta, SAML) without architectural changes.

### Why This Matters

The current flow requires every new client to create a password. For a security company selling to tech-savvy businesses, that's friction. GitHub OAuth is particularly relevant — security teams live in GitHub. Google covers everyone else. The architecture should make adding a new provider a config change, not a code change.

### How It Works

**Authorization Code Flow (OAuth 2.0):**

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────→│ Backend  │────→│ Provider │────→│ Backend  │
│          │     │ /auth/   │     │ (GitHub/ │     │ /auth/   │
│ Click    │     │ github   │     │  Google) │     │ callback │
│ "Login   │     │          │     │          │     │          │
│  with    │     │ Generate │     │ User     │     │ Exchange │
│  GitHub" │     │ state +  │     │ consents │     │ code for │
│          │     │ redirect │     │          │     │ token,   │
│          │     │          │     │          │     │ get user │
│          │◄────│──────────│◄────│──────────│◄────│ info,    │
│ Receive  │     │          │     │          │     │ issue    │
│ JWT      │     │          │     │          │     │ JWT      │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
```

### What Changes in the Backend

**New routes needed:**

```
GET  /api/auth/github          → Generate state, redirect to GitHub authorize URL
GET  /api/auth/github/callback → Exchange code → get user → create/link account → issue JWT
GET  /api/auth/google          → Same pattern for Google
GET  /api/auth/google/callback → Same pattern
GET  /api/auth/providers       → List enabled providers (for frontend to show buttons)
POST /api/auth/link/:provider  → Link OAuth to existing account (authenticated)
DELETE /api/auth/link/:provider → Unlink provider from account
```

**The callback handler is the critical piece.** Here's the thought process for what it needs to do:

1. Verify the `state` parameter matches what we stored (CSRF protection)
2. Exchange the authorization `code` for an access token (HTTP POST to provider)
3. Fetch the user's profile from the provider API (email, name, avatar)
4. **Decision point**: Does this email already exist in our `users` table?
   - **Yes, with this provider linked**: Log them in, issue JWT
   - **Yes, but different provider or password-only**: Link the provider, log them in
   - **No**: Create new user with `provider = 'github'`, no password needed
5. Issue JWT (same `createToken()` we already have in `services/auth.ts`)

**Why no framework**: The OAuth flow is just 3 HTTP requests (redirect, token exchange, profile fetch). Using `fetch()` directly to GitHub/Google APIs is simpler than pulling in passport.js or similar. We already have `crypto.subtle` for HMAC — we can use it to sign/verify the state parameter too.

### What Changes in the Frontend

**Login page** (`Login.tsx`): Currently a single email/password form. Add OAuth buttons above the form with a "— or —" divider:

```
┌─────────────────────────────────┐
│        Admin Login              │
│                                 │
│  [🐙 Continue with GitHub    ]  │
│  [🔵 Continue with Google    ]  │
│                                 │
│  ──────── or ────────          │
│                                 │
│  Email: [_______________]       │
│  Password: [____________]       │
│  [Sign In]                      │
└─────────────────────────────────┘
```

The OAuth buttons just navigate to `/api/auth/github` — the backend handles the redirect chain. On successful callback, the backend redirects back to the frontend with a token (via URL fragment or cookie).

**Profile page** (`admin/Profile.tsx`): Add a "Connected Accounts" section showing which providers are linked, with connect/disconnect buttons.

**AuthContext.tsx**: Extend to handle the OAuth return flow — check for token in URL hash on mount, store it, fetch user profile. The existing `checkSession` useEffect is the right place.

### What Changes in the Database

```sql
-- New table: track OAuth provider links per user
CREATE TABLE user_oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,         -- 'github', 'google'
    provider_user_id VARCHAR(255) NOT NULL, -- Their ID in the provider system
    email VARCHAR(255),                     -- Email from provider (may differ from users.email)
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    access_token TEXT,                      -- For API calls on their behalf
    refresh_token TEXT,                     -- For token renewal
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)      -- One link per provider account
);

CREATE INDEX idx_oauth_provider_user ON user_oauth_providers(provider, provider_user_id);
CREATE INDEX idx_oauth_user_id ON user_oauth_providers(user_id);
```

We do NOT add a `provider` column to the `users` table itself — a user can have multiple providers linked plus a password. The relationship is one-to-many (one user → many providers).

### Recommendation

- **Phase this**: Get GitHub working first (it's the simplest OAuth flow), then add Google.
- **Store tokens encrypted** if we plan to make API calls on behalf of users (e.g., pull their GitHub repos for security assessments).
- **Don't remove password auth** — some enterprise clients won't want OAuth. Both should coexist.
- **State parameter**: Use HMAC-signed JSON (`{nonce, timestamp, redirect}`) rather than random strings in Redis. Stateless, no extra infrastructure.

### Pre-requisites

- Register GitHub OAuth App (Settings → Developer settings → OAuth Apps)
- Register Google OAuth credentials (Google Cloud Console → APIs & Services → Credentials)
- Decide on callback URLs (e.g., `https://gq.vandine.us/api/auth/github/callback`)
- Store client_id/client_secret in K8s secrets

---

## 3. Real ML Engine (3-Source Intelligence)

### Goal

Replace the hardcoded multiplier math with actual machine learning predictions that improve over time, enriched by external data sources. The system should produce quote prices, risk scores, and acceptance probabilities that get smarter as more quotes flow through.

### Why This Matters

The current "ML" is a fixed formula:

```typescript
// Current: index.ts line ~350 (simplified)
const finalPrice = laborCost * eventMultiplier * locationMultiplier * timeMultiplier * crowdFactor;
```

This gives the same price every time for the same inputs. A real model would learn patterns like "concerts in Miami on Saturday nights with 2000+ crowds tend to get rejected at prices above $X" or "corporate events in Beverly Hills accept quotes 30% higher than the base." The `ml_training_data` table already captures these signals — nothing uses them.

### The Three Sources

The idea is to **triangulate** — no single source is the oracle. Combine all three and weight them by confidence.

```
┌─────────────────────────────────────────────────────────┐
│                    Quote Request                         │
│  (event type, location, guards, hours, crowd, date)     │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
             ▼              ▼              ▼
┌────────────────┐ ┌───────────────┐ ┌────────────────────┐
│ SOURCE 1:      │ │ SOURCE 2:     │ │ SOURCE 3:          │
│ Trained Model  │ │ External APIs │ │ Rule Engine         │
│                │ │               │ │                     │
│ XGBoost on     │ │ Crime stats   │ │ Business rules:     │
│ historical     │ │ Weather API   │ │ - Minimums          │
│ quote data     │ │ Local events  │ │ - Client overrides  │
│                │ │ Census/demo   │ │ - Season surcharges │
│ Outputs:       │ │               │ │ - Armed premiums    │
│ - price        │ │ Outputs:      │ │                     │
│ - risk_score   │ │ - risk adj.   │ │ Outputs:            │
│ - accept_prob  │ │ - context     │ │ - floor/ceiling     │
│ - confidence   │ │ - enrichment  │ │ - adjustments       │
└───────┬────────┘ └──────┬────────┘ └──────────┬─────────┘
        │                 │                      │
        └────────┬────────┴──────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Ensemble / Blender                      │
│                                                          │
│  If model confidence > 0.8 AND sample_count > 50:       │
│    weight: model 60%, rules 25%, APIs 15%               │
│  Else:                                                   │
│    weight: rules 50%, model 30%, APIs 20%               │
│                                                          │
│  Output: final_price, risk_score, confidence,            │
│          breakdown (per-source contributions)            │
└─────────────────────────────────────────────────────────┘
```

### Source 1: Trained Model (Python Microservice)

**Why Python**: scikit-learn and XGBoost are the pragmatic choices for tabular data prediction. The `ml_training_data` table has exactly the feature set these models expect: categorical (event type, state, risk zone), numeric (guards, hours, crowd size), boolean (weekend, night, armed). This isn't a deep learning problem — it's classic supervised regression + classification.

**The microservice**:

```
┌─────────────────────────────────────────┐
│  ML Engine (Python, FastAPI or Flask)    │
│                                          │
│  POST /predict                           │
│    Input: feature vector (from quote)    │
│    Output: price, risk_score, accept_prob│
│                                          │
│  POST /predict/batch                     │
│    Input: array of scenarios             │
│    Output: array of predictions          │
│                                          │
│  POST /retrain                           │
│    Trigger: manual or scheduled          │
│    Process:                              │
│      1. Pull latest ml_training_data     │
│      2. Feature engineering              │
│      3. Train XGBoost + cross-validate   │
│      4. Compare with current model       │
│      5. If better → promote, else → keep │
│      6. Webhook → backend                │
│      7. Email report with metrics        │
│                                          │
│  GET /model/info                         │
│    Output: version, metrics, features,   │
│            training date, sample count   │
│                                          │
│  GET /health                             │
│    Output: status, model loaded, latency │
└─────────────────────────────────────────┘
```

**Communication with backend**: The existing `middleware/s2s-auth.ts` already implements PSK (pre-shared key) authentication via `X-Internal-Secret` header. The ML engine validates this on every request. No new auth pattern needed.

**Training pipeline detail**:

When retrain is triggered (manually from admin UI, or via OpenClaw cron):

1. ML engine pulls all rows from `ml_training_data` via Postgres direct connection (same DB, not through the API)
2. Feature engineering: one-hot encode categoricals, scale numerics, create interaction features (e.g., `crowd_per_guard = crowd_size / num_guards`)
3. Train/test split (80/20), cross-validate (5-fold)
4. Train XGBoost regressor (price), XGBoost classifier (acceptance)
5. Evaluate: MAE, RMSE, R² for price; AUC-ROC, precision/recall for acceptance
6. **Champion/challenger**: If new model beats current on held-out test set → promote. Otherwise keep current.
7. **Webhook** to backend: `POST /api/webhooks/internal` with event type `ml.training.completed`:

```json
{
  "event": "ml.training.completed",
  "data": {
    "model_version": "3.1.0",
    "status": "promoted",  // or "rejected" if worse
    "metrics": {
      "price_mae": 142.30,
      "price_rmse": 198.50,
      "price_r2": 0.91,
      "accept_auc": 0.87,
      "sample_count": 1247,
      "training_duration_s": 34
    },
    "previous_version": "3.0.0",
    "improvement": {
      "price_mae_delta": -12.5,
      "accept_auc_delta": 0.03
    }
  }
}
```

8. **Email report** via Resend (the backend already has Resend integration) — send to admin users with training summary, metric comparisons, drift warnings if feature distributions shifted.

**What the frontend `admin/ML.tsx` already expects**: The page has UI for model status, training data table, version history with rollback, and a retrain button. The backend endpoints it calls don't exist yet:

- `GET /api/admin/ml/status` → Model health, current version, performance metrics
- `GET /api/admin/ml/training-data?limit=50` → Browse training data
- `GET /api/admin/ml/training-stats` → Aggregate stats by event type, location
- `POST /api/admin/ml/retrain` → Trigger retrain
- `POST /api/admin/ml/rollback` → Roll back to previous model version

These all become thin proxies to the ML engine, with admin auth middleware wrapping them.

### Source 2: External API Enrichment

**Goal**: Augment predictions with real-world context that the training data can't capture.

| API | What It Provides | How It Affects Pricing |
|-----|------------------|----------------------|
| **Crime stats** (FBI UCR / local PD APIs) | Crime rate by zip code, incident types | Adjust location risk score |
| **Weather** (OpenWeatherMap / NWS) | Forecast for event date/location | Outdoor events in storms → higher risk |
| **Local events** (PredictHQ or Eventbrite) | Concurrent events near venue | Nearby concerts = crowd spillover risk |
| **Census/ACS** | Demographics, median income by zip | Informs client ability to pay, neighborhood risk |

**Implementation thought**: These calls happen at **quote calculation time**, not training time. The Bun backend fetches them in parallel using `Promise.all()` + `dns.prefetch()` (warm connections at startup). Results are cached in Redis (native Bun Redis) with TTL appropriate to data staleness:

- Crime stats: cache 24h (changes slowly)
- Weather: cache 1h for date < 7 days out, skip for dates > 30 days out
- Local events: cache 6h
- Census: cache 7 days

**Enrichment doesn't just affect price** — it enriches the quote response with context the client can see:

```json
{
  "enrichment": {
    "crime_context": "This zip code has 23% higher property crime than state average",
    "weather_warning": "70% chance of thunderstorms on event date — outdoor risk elevated",
    "nearby_events": "Lakers game at Staples Center same evening — expect traffic + crowd spillover",
    "recommendation": "Consider adding vehicle patrol for crowd management"
  }
}
```

This is powerful because it makes the quote **feel intelligent** — the client sees that the system knows about their specific situation, not just generic multipliers.

### Source 3: Rule Engine (Business Logic)

**Goal**: Enforce business constraints that a model shouldn't learn (minimums, client-specific deals, regulatory requirements).

**What the current `quote-calculator.ts` does** is actually a rule engine — it just needs to be labeled and treated as one source instead of the only source.

**Rules that should stay as rules** (not learned by ML):

```
- Minimum price: $500 per event (business decision, not data-driven)
- Armed guard premium: flat $15/hr/guard (regulatory, based on licensing cost)
- K9 unit: flat $75/hr (actual cost of handler + dog)
- Night shift: 1.2x (labor law compliance, not risk-based)
- Weekend: 1.15x (overtime pay requirement)
- Client-specific: "Acme Corp gets 10% discount" (relationship pricing)
- Seasonal: December events +10% (holiday staffing difficulty)
- Minimum guards: crowd_size / 250, rounded up (insurance requirement)
```

**The rule engine should be configurable** — admin UI to adjust multipliers, add/remove rules, set client overrides. Store rules in the database (new `pricing_rules` table) rather than hardcoded in TypeScript. The current code has these as literals like `crowdSize > 5000 ? 1.35 : crowdSize > 2000 ? 1.25 : ...` — that should become a lookup.

### How the Three Sources Combine

The **ensemble/blender** is a simple weighted average, not another ML model. The weights depend on model confidence and data availability:

**Scenario A**: Model has 500+ training samples for this event type + location
- Trained model: 60%, Rules: 25%, APIs: 15%

**Scenario B**: Model has < 50 samples (cold start, new event type)
- Rules: 50%, Trained model: 30%, APIs: 20%

**Scenario C**: External APIs unavailable (timeout, rate limit)
- Trained model: 55%, Rules: 45%

The response always shows the breakdown so the admin (and optionally the client) can see where the number came from:

```json
{
  "final_price": 4250.00,
  "confidence": 0.87,
  "sources": {
    "model": { "price": 4100, "weight": 0.60, "confidence": 0.89 },
    "rules": { "price": 4500, "weight": 0.25, "adjustments": ["night_shift_1.2x", "armed_premium"] },
    "apis":  { "price": 4300, "weight": 0.15, "factors": ["high_crime_zip", "concurrent_event"] }
  },
  "risk_score": 0.72,
  "risk_level": "high",
  "acceptance_probability": 0.68
}
```

### Recommendation

- **Start with rules + external APIs** (Sources 2+3) — these can ship before the Python model is trained. The rule engine is basically already written.
- **Train initial model on synthetic + seeded data** — the `seed-training-data.ts` file exists for this. Generate 500-1000 realistic training records to bootstrap.
- **Python service is a separate K3s pod** — ClusterIP (internal only), not exposed externally. Backend is the only caller via S2S auth.
- **Retrain weekly via OpenClaw cron** — use `sessions_spawn` to trigger retrain, get results, notify admin.

---

## 4. Backend Restructure (Bun 1.3)

### Goal

Port the monolithic Hono-based `index.ts` to native `Bun.serve()` with modular route files. Reduce total backend from ~6,650 lines to ~3,000 by removing infra overlap and consolidating duplicated ML logic.

### Why Native Bun.serve (No Framework)

We proved this works with MarketPulse. The v1 backend has ~35 routes. With native `Bun.serve()` routing, each route is a function in a module — no middleware chain, no magic. The performance difference is measurable on Pi hardware (Bun.serve handles routing at C++ level, not JavaScript middleware chains).

**Current pattern** (Hono):

```typescript
// v1: index.ts — everything in one file, Hono framework
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();
app.use("*", logger());
app.use("*", cors());

app.get("/api/quotes", async (c) => {
  const quotes = await sql`SELECT q.*, c.company_name ...`;
  return c.json(quotes);
});

app.post("/api/quotes", async (c) => {
  const body = await c.req.json();
  // ... 30 lines of insert logic
});

// ... 1,400 more lines
```

**Proposed pattern** (native Bun.serve):

```typescript
// v2: src/server.ts — thin entry, delegates to route modules
import { authRoutes } from "./routes/auth";
import { quoteRoutes } from "./routes/quotes";
import { clientRoutes } from "./routes/clients";
import { adminRoutes } from "./routes/admin";
import { mlRoutes } from "./routes/ml";
import { webhookRoutes } from "./routes/webhooks";
import { handleWsOpen, handleWsMessage, handleWsClose } from "./services/websocket";

// Warm external API connections at startup
Bun.dns.prefetch("api.github.com", 443);
Bun.dns.prefetch("oauth2.googleapis.com", 443);
Bun.dns.prefetch("api.openweathermap.org", 443);

const CORS_ORIGINS = new Set(["https://gq.vandine.us", "http://localhost:5173"]);

Bun.serve({
  port: 3000,
  idleTimeout: 30,

  routes: {
    // Health
    "/health": () => Response.json({ status: "ok" }),

    // Auth (including OAuth)
    "/api/auth/login":    { POST: authRoutes.login },
    "/api/auth/register": { POST: authRoutes.register },
    "/api/auth/refresh":  { POST: authRoutes.refresh },
    "/api/auth/me":       { GET:  authRoutes.me },
    "/api/auth/github":          { GET: authRoutes.githubRedirect },
    "/api/auth/github/callback": { GET: authRoutes.githubCallback },
    "/api/auth/google":          { GET: authRoutes.googleRedirect },
    "/api/auth/google/callback": { GET: authRoutes.googleCallback },

    // Quotes
    "/api/quotes":     { GET: quoteRoutes.list, POST: quoteRoutes.create },
    "/api/quotes/:id": { GET: quoteRoutes.get, PATCH: quoteRoutes.update },

    // ML
    "/api/ml/predict":       { POST: mlRoutes.predict },
    "/api/ml/predict/batch": { POST: mlRoutes.batchPredict },
    "/api/ml/stats":         { GET:  mlRoutes.stats },

    // ... etc
  },

  // CORS + static + WS upgrade in fetch fallback
  fetch(req, server) {
    const origin = req.headers.get("Origin");
    if (req.method === "OPTIONS" && origin && CORS_ORIGINS.has(origin)) {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization,X-CSRF-Token",
        },
      });
    }

    // WebSocket upgrade
    const url = new URL(req.url);
    if (url.pathname.startsWith("/ws")) {
      const type = url.pathname === "/ws/admin" ? "admin" : "client";
      if (server.upgrade(req, { data: { type } })) return;
      return new Response("Upgrade failed", { status: 400 });
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open: handleWsOpen,
    message: handleWsMessage,
    close: handleWsClose,
    perMessageDeflate: true,
    maxPayloadLength: 64 * 1024,
    idleTimeout: 120,
  },
});
```

### Route Module Pattern

Each route module exports handler functions. Here's the thought process for structuring `routes/auth.ts`:

```typescript
// v2: src/routes/auth.ts
//
// THOUGHT: Auth is the most complex route module because it handles:
// 1. Traditional email/password login
// 2. OAuth redirects + callbacks (GitHub, Google)
// 3. Account linking (add OAuth to existing account)
// 4. Token refresh
// 5. Registration
//
// Each handler is a standalone function that receives Request, returns Response.
// No framework context object — just Web Standards.

import { createToken, verifyPassword, hashPassword, getUserFromToken } from "../services/auth";
import { exchangeGithubCode, getGithubUser } from "../services/oauth-github";
import { exchangeGoogleCode, getGoogleUser } from "../services/oauth-google";
import { withDb } from "../db/connection";

export const authRoutes = {

  async login(req: Request): Promise<Response> {
    const { email, password } = await req.json();
    // ... validate, verify, issue tokens
  },

  async githubRedirect(req: Request): Promise<Response> {
    // Generate HMAC-signed state, redirect to GitHub authorize URL
    // State contains: { nonce, timestamp, redirect_uri }
    // Signed with HMAC-SHA256 using our JWT secret (reuse existing crypto)
  },

  async githubCallback(req: Request): Promise<Response> {
    // 1. Verify state signature (CSRF protection)
    // 2. Exchange code for access token (fetch to github.com/login/oauth/access_token)
    // 3. Fetch user profile (fetch to api.github.com/user)
    // 4. Find or create user in DB
    // 5. Link provider in user_oauth_providers
    // 6. Issue JWT
    // 7. Redirect to frontend with token
  },

  // ... google equivalents follow same pattern
};
```

### The withDb() Helper

MarketPulse taught us this pattern — a helper that gets a connection from the pool, runs your query, and handles errors:

```typescript
// THOUGHT: Every route handler needs DB access. Rather than importing `sql` globally
// and hoping connections get released, wrap it in a helper that guarantees cleanup.
// This is especially important on Pi where we have max 5 connections (memory-constrained).

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 });

export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  return fn(sql);
}

// Usage in a route:
async function listQuotes(req: Request): Promise<Response> {
  const quotes = await withDb(sql =>
    sql`SELECT q.*, c.company_name FROM quotes q LEFT JOIN clients c ON q.client_id = c.id`
  );
  return Response.json(quotes);
}
```

### Password Hashing — Already Correct

The v1 `services/auth.ts` already does this right:

```typescript
// v1 auth.ts (line 70) — already uses Bun.password with argon2id
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}
```

**No change needed** for the hashing. The MarketPulse lesson about SHA-256 → argon2id doesn't apply here because GuardQuote already made the right call. The only change: when an OAuth user has no password, their `password_hash` is `NULL` — the login endpoint needs to handle this (suggest OAuth login instead of "invalid password").

### Redis — Native Bun Client

The current `services/cache.ts` (448 lines) implements a custom Redis client using `Bun.connect` TCP sockets with manual RESP protocol parsing. Bun 1.3 has a native Redis client:

```typescript
// v1: cache.ts — 448 lines of custom Redis protocol implementation
class RedisClient {
  private socket: any = null;
  async connect(): Promise<void> {
    this.socket = await Bun.connect({
      hostname: REDIS_HOST,
      port: REDIS_PORT,
      socket: { data: () => {}, error: () => { ... } }
    });
    // ... manual RESP parsing, AUTH command, reconnection logic
  }
}

// v2: ~10 lines using native Bun Redis
import { redis } from "bun";

const cache = redis(process.env.REDIS_URL || "redis://localhost:6379");

// Cache a quote prediction
await cache.set(`quote:${quoteId}:prediction`, JSON.stringify(result), "EX", 3600);

// Rate limiting
const key = `ratelimit:${ip}:${endpoint}`;
const count = await cache.incr(key);
if (count === 1) await cache.expire(key, 60);
```

This eliminates ~440 lines and the entire `middleware/rate-limit.ts` custom Redis client (274 lines). **~714 lines removed**.

### Proposed File Structure

```
src/
├── server.ts                 # Bun.serve() entry — routes + WS + CORS (~80 lines)
├── routes/
│   ├── auth.ts               # Login, register, OAuth flows, refresh (~200 lines)
│   ├── quotes.ts             # CRUD, status transitions (~150 lines)
│   ├── clients.ts            # CRUD (~80 lines)
│   ├── admin.ts              # Dashboard stats, user management, quote requests (~200 lines)
│   ├── ml.ts                 # Predict, batch, stats — proxies to Python ML engine (~100 lines)
│   └── webhooks.ts           # CRUD + delivery (~80 lines)
├── services/
│   ├── auth.ts               # JWT creation/verification, password hashing (KEEP from v1)
│   ├── oauth-github.ts       # GitHub OAuth token exchange + profile fetch (~60 lines)
│   ├── oauth-google.ts       # Google OAuth token exchange + profile fetch (~60 lines)
│   ├── ml-client.ts          # HTTP client to Python ML service + S2S auth (~80 lines)
│   ├── rule-engine.ts        # Business rules + pricing rules from DB (~120 lines)
│   ├── enrichment.ts         # External API calls (crime, weather, events) (~150 lines)
│   ├── ensemble.ts           # Combine 3 sources into final prediction (~80 lines)
│   ├── websocket.ts          # Pub/sub, real-time price updates (KEEP from v1, minor port)
│   └── webhook-delivery.ts   # HMAC signing + delivery (EXTRACT from v1 index.ts)
├── middleware/
│   ├── auth.ts               # JWT verification helper (~30 lines)
│   └── s2s.ts                # PSK for ML engine (KEEP from v1)
├── db/
│   ├── connection.ts         # postgres.js + withDb helper (~30 lines)
│   └── schema.sql            # DDL source of truth
└── schemas/
    └── ingest.ts             # Zod transforms for training data (KEEP from v1)
```

**Estimated total: ~1,500 lines** (down from 6,650). That's a 77% reduction, and every line that's removed either moved to the ML engine, got replaced by native Bun, or was infrastructure that OpenClaw already handles.

### Recommendation

- **Port auth.ts first** — it's the most critical and already well-structured. Add OAuth routes.
- **Port quote routes second** — these are the bread and butter.
- **The ML proxy routes are thin** — they just forward to the Python service with S2S auth. Write these after the ML engine exists.
- **Don't rewrite websocket.ts from scratch** — the pub/sub architecture is sound. Just adapt it to use Bun.serve's native websocket handlers (which it's 90% already doing via the v1 `export default { websocket: { ... } }` pattern).

---

## 5. Infrastructure Overlap Removal

### Goal

Remove ~2,350 lines of infrastructure management code from GuardQuote. A quoting application should not SSH into Raspberry Pis to restart systemd services.

### Why This Is Important

This isn't just about line count. Having SSH credentials (`pi-services.ts` line 8: `const PI_PASS = process.env.PI_PASS` (previously had hardcoded fallback)) and systemd control inside a web application is a **security surface area problem**. If GuardQuote gets compromised, the attacker gets SSH access to the Pi fleet. Separation of concerns isn't just clean architecture — it's defense in depth.

### What Gets Removed

| File | Lines | What It Does | Why Remove |
|------|-------|-------------|------------|
| `services/infrastructure.ts` | 622 | SSH health checks on Pi nodes, latency tracking, service discovery | Prometheus node_exporter + blackbox already do this. Grafana dashboards already display it. |
| `services/monitor.ts` | 600 | Polls DB, cache, WS, webhooks, ML engine health. Broadcasts to admin WS. | The **internal** health checks (DB, cache) should stay as a simple `/health` endpoint. The **external** monitoring (are other services alive?) is Prometheus's job. |
| `services/pi-services.ts` | 696 | SSH into Pi, run `systemctl`, read `journalctl`, restart services. Has demo mode fallback. | OpenClaw pi-fleet skill does this interactively. No web app should have this capability. |
| `services/logging.ts` | 438 | Syslog RFC 5424 shipping, remote log aggregation | Vector on pi0/pi2 already ships all logs to Loki. Adding another log shipper creates duplicate entries and confusion about which is the source of truth. |

**Total removed: 2,356 lines**

### What Stays (Simplified)

The `monitor.ts` concept isn't entirely wrong — the admin dashboard should show "is the DB connected? is the ML engine responding?" But that's a 20-line health endpoint, not a 600-line monitoring service:

```typescript
// v2: Just a health endpoint in routes/admin.ts
// THOUGHT: Admin dashboard needs to know if dependencies are alive.
// But it asks the BACKEND for its OWN health, not for the health of
// infrastructure it shouldn't know about.

async function systemHealth(req: Request): Promise<Response> {
  const [dbOk, mlOk, redisOk] = await Promise.all([
    withDb(sql => sql`SELECT 1`).then(() => true).catch(() => false),
    fetch(`${ML_ENGINE_URL}/health`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.ok).catch(() => false),
    cache.ping().then(() => true).catch(() => false),
  ]);

  return Response.json({
    database: dbOk,
    ml_engine: mlOk,
    cache: redisOk,
    status: dbOk && mlOk && redisOk ? "healthy" : "degraded",
  });
}
```

### Frontend Pages Affected

| Page | Action | Rationale |
|------|--------|-----------|
| `admin/Services.tsx` | **Remove or repurpose** | Currently shows Pi systemd services with start/stop/restart buttons. This is OpenClaw's domain. Could be repurposed to show GuardQuote's own service health (DB, ML, Redis, WebSocket). |
| `admin/Network.tsx` | **Remove** | Shows network topology and node health. This is exactly what the Grafana "Network & Firewall" dashboard does. Link to Grafana instead. |
| `admin/Logs.tsx` | **Remove** | Log viewer that uses the custom syslog service. Grafana + Loki provides a far superior log exploration experience with query language. |

**Replace with**: A single "Infrastructure" link in the admin sidebar that opens Grafana in a new tab (`https://grafana.vandine.us`). One line of UI replaces three pages and 2,356 lines of backend.

### Recommendation

- **Remove infrastructure code in the first commit of the Bun port** — don't port it, don't refactor it, just don't include it. Clean break.
- **Keep the `health` endpoint simple** — backend reports its own health, not the world's health.
- **Add a Grafana iframe or link** on the admin dashboard for users who want infra visibility without leaving GuardQuote. But don't rebuild Grafana inside GuardQuote.

---

## 6. Frontend Changes

### Goal

Update the React frontend to support OAuth login, show real ML intelligence, and remove pages that duplicate Grafana/OpenClaw functionality.

### Login Page Redesign

**Current** (`Login.tsx`): Email/password only, "Admin Login" title, no registration link.

**Proposed**:

```
┌────────────────────────────────────────┐
│                                        │
│         [Shield Icon]                  │
│         Welcome to GuardQuote          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  🐙  Continue with GitHub        │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  🔵  Continue with Google        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ──────────── or ─────────────         │
│                                        │
│  Email    [________________________]   │
│  Password [________________________]   │
│  ☐ Remember me for 30 days            │
│                                        │
│  [         Sign In              ]      │
│                                        │
│  Don't have an account? Sign up →      │
│                                        │
└────────────────────────────────────────┘
```

**Key changes**:
- Title changes from "Admin Login" to "Welcome to GuardQuote" — not just admins log in, clients do too
- OAuth buttons are **above** the email form (preferred path)
- "Sign up" link for new client registration
- The OAuth buttons are just `<a href="/api/auth/github">` links — the backend handles the redirect chain
- Error handling: If OAuth callback fails, redirect to login with `?error=oauth_failed` query param, show error banner

### AuthContext Changes

**Current** (`AuthContext.tsx`): Checks `localStorage.getItem("token")` on mount, falls back to cookie-based auth.

**Proposed additions**:

```typescript
// THOUGHT: After OAuth callback, the backend redirects to something like:
//   /auth/callback#token=eyJ...
// The frontend needs to catch this on mount.

useEffect(() => {
  // Check for OAuth callback token in URL hash
  const hash = window.location.hash;
  if (hash.startsWith("#token=")) {
    const token = hash.slice(7);
    localStorage.setItem("token", token);
    setToken(token);
    window.history.replaceState(null, "", window.location.pathname); // Clean URL
    // Then fetch /api/auth/me to get user profile
  }

  // Check for OAuth error
  const params = new URLSearchParams(window.location.search);
  if (params.get("error") === "oauth_failed") {
    setOAuthError(params.get("message") || "OAuth login failed");
    window.history.replaceState(null, "", window.location.pathname);
  }

  checkSession();
}, []);
```

**User interface change**: Add `provider` field:

```typescript
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  // New:
  avatarUrl?: string;           // From OAuth provider
  linkedProviders?: string[];   // ['github', 'google']
}
```

### Admin ML Dashboard Enhancement

**Current** (`admin/ML.tsx`): Has the UI structure but backend endpoints don't exist. Shows tabs for Overview, Data, Versions.

**What to add once ML engine is real**:

- **Model performance chart**: Line chart showing MAE/RMSE over time (each training run)
- **Feature importance**: Bar chart from XGBoost feature importances (the model tells you which features matter most)
- **Prediction vs actual scatter plot**: When quotes get accepted/rejected, compare predicted price vs actual outcome
- **Drift detection panel**: Show when feature distributions shift (e.g., suddenly getting more night events than the model was trained on)
- **Training trigger with progress**: Real-time training progress via WebSocket (the ML engine can broadcast training steps to the WS service)

**The "3 Source" breakdown in quote detail view**:

When viewing a specific quote, show a stacked bar or pie showing how much each source contributed:

```
Quote #GQ-2026-0342 — Final Price: $4,250

Price Sources:
  ML Model (60%)     ████████████████████  $4,100 (confidence: 89%)
  Rule Engine (25%)   ████████             $4,500 (night shift, armed premium)
  API Enrichment (15%) ████               $4,300 (high-crime zip, Lakers game nearby)

Risk Assessment:
  Risk Score: 72/100 (HIGH)
  Factors: Night shift, armed, crowd 2500, high-crime zip
  Acceptance Probability: 68%
```

### Admin Sidebar Simplification

**Current sidebar** (inferred from routes):
- Dashboard
- Users
- Quote Requests
- ML
- Services ← **remove**
- Network ← **remove**
- Logs ← **remove**
- Blog
- Features
- Profile

**Proposed sidebar**:
- Dashboard
- Quotes (combine Quotes + Quote Requests)
- Clients
- Users
- ML Intelligence (rename from "ML" — sounds better)
- Blog
- Settings (combine Features + Profile)
- 🔗 Infrastructure (link to Grafana, opens new tab)

### Recommendation

- **Frontend changes are the LAST phase** — they depend on backend OAuth + ML engine being ready
- **Don't redesign everything** — the current Tailwind dark theme looks good. Just add OAuth buttons, remove dead pages, enhance ML page.
- **The DataFlowDiagram.tsx (xyflow)** should be updated to show the 3-source architecture. It's already using xyflow for flow diagrams — add nodes for ML Engine, External APIs, Rule Engine.

---

## 7. Database Schema Evolution

### New Tables

```sql
-- 1. OAuth provider links (see Section 2 for detail)
CREATE TABLE user_oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- 2. ML model versions (track training runs)
CREATE TABLE ml_models (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'training'
        CHECK (status IN ('training', 'evaluating', 'active', 'retired', 'failed')),
    artifact_path VARCHAR(500),          -- Path to serialized model file
    training_samples INT,
    metrics JSONB,                        -- { mae, rmse, r2, auc, ... }
    feature_importances JSONB,            -- { event_type: 0.23, crowd_size: 0.18, ... }
    training_duration_s INT,
    promoted_at TIMESTAMP,                -- When it became the active model
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Configurable pricing rules (replace hardcoded multipliers)
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(30) NOT NULL
        CHECK (rule_type IN ('multiplier', 'flat_fee', 'minimum', 'maximum', 'discount')),
    condition JSONB NOT NULL,             -- { "field": "is_night_shift", "op": "eq", "value": true }
    value DECIMAL(10, 4) NOT NULL,        -- The multiplier, fee amount, or percentage
    priority INT DEFAULT 0,               -- Higher priority rules apply first
    applies_to VARCHAR(50),               -- NULL = all, or specific client_id, event_type, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. API enrichment cache (avoid hitting external APIs repeatedly)
CREATE TABLE enrichment_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "crime:90001" or "weather:90001:2026-03-15"
    data JSONB NOT NULL,
    source VARCHAR(50) NOT NULL,              -- 'fbi_ucr', 'openweathermap', 'predicthq'
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_enrichment_cache_key ON enrichment_cache(cache_key);
CREATE INDEX idx_enrichment_expires ON enrichment_cache(expires_at);
```

### Schema Modifications

```sql
-- Users: allow nullable password_hash (OAuth-only users have no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Users: add avatar URL (from OAuth provider)
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);

-- Quotes: add source breakdown (which sources contributed to the price)
ALTER TABLE quotes ADD COLUMN price_sources JSONB;
-- Example: { "model": { "price": 4100, "weight": 0.6 }, "rules": { ... }, "apis": { ... } }

-- Quotes: add acceptance_probability from ML
ALTER TABLE quotes ADD COLUMN acceptance_probability DECIMAL(4, 3);

-- Quotes: add enrichment context
ALTER TABLE quotes ADD COLUMN enrichment_context JSONB;
-- Example: { "crime_rate": "23% above average", "weather": "thunderstorms", "nearby_events": [...] }
```

### What to Delete

```sql
-- Remove stale Drizzle/MySQL schema file
-- DELETE FILE: backend/src/db/schema.ts (253 lines of dead code)
-- It's a MySQL/Drizzle ORM definition for a Postgres database using raw queries.
-- Confuses anyone reading the codebase.
```

### Recommendation

- **Run migrations incrementally** — don't drop and recreate. Use `ALTER TABLE` for existing tables.
- **The `pricing_rules` table is powerful** — it means admins can adjust multipliers without code changes. The rule engine reads from this table at query time (cache in Redis for performance).
- **`enrichment_cache` can be Redis-only** if we don't need persistence across restarts. But Postgres gives us queryability (e.g., "show me all crime data we've cached for California").

---

## 8. Deployment Architecture

### K8s Layout on pi2

```
Namespace: guardquote
┌──────────────────────────────────────────────────┐
│                                                   │
│  ┌─────────────────┐    ┌──────────────────────┐ │
│  │ guardquote-api   │    │ guardquote-ml        │ │
│  │ (Bun 1.3)       │───→│ (Python/FastAPI)     │ │
│  │                  │S2S │                      │ │
│  │ Port: 305XX     │PSK │ ClusterIP only       │ │
│  │ NodePort        │    │ (not exposed)        │ │
│  │                  │    │                      │ │
│  │ HTTP + WS       │    │ Predict, train,      │ │
│  │ OAuth, CRUD,    │    │ model management     │ │
│  │ ML proxy        │    │                      │ │
│  └────────┬────────┘    └──────────┬───────────┘ │
│           │                        │              │
│           ▼                        ▼              │
│  ┌─────────────────┐    ┌──────────────────────┐ │
│  │ Redis            │    │ PostgreSQL           │ │
│  │ ClusterIP        │    │ External: [DB host]   │ │
│  │                  │    │ 2.70:5432            │ │
│  │ Cache, sessions, │    │                      │ │
│  │ rate limiting    │    │ OR K8s pod (future)  │ │
│  └─────────────────┘    └──────────────────────┘ │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Docker Images

**Bun API** (same pattern as MarketPulse):
```dockerfile
FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY src/ ./src/
EXPOSE 3000
CMD ["bun", "run", "--smol", "src/server.ts"]
```

**Python ML Engine**:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ml_engine/ ./ml_engine/
COPY models/ ./models/
EXPOSE 8000
CMD ["uvicorn", "ml_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Note on ARM64**: Both `oven/bun:1.3-alpine` and `python:3.12-slim` have ARM64 images. XGBoost also has ARM64 wheels. No cross-compilation needed.

### Network Access

| From | To | Port | Rule |
|------|----|------|------|
| pi1 (CF tunnel) | pi2 (guardquote-api) | 305XX | PA-220 rule (new, same pattern as MarketPulse) |
| guardquote-api | guardquote-ml | 8000 | K8s ClusterIP (same namespace, no firewall) |
| guardquote-api | PostgreSQL | 5432 | Direct DB connection ([see .env] or K8s service) |
| guardquote-api | Redis | 6379 | K8s ClusterIP |
| guardquote-api | External APIs | 443 | Outbound HTTPS (crime, weather, events APIs) |

### Recommendation

- **Use the exact same K8s manifest pattern from MarketPulse** — Deployment + Service + Secret. It's proven.
- **ML engine starts as a single pod** — no need for replicas, training is infrequent, predictions are fast (sub-100ms for XGBoost on tabular data).
- **Redis can be a simple single-pod deployment** — no need for Sentinel/Cluster. If Redis dies, the app falls back gracefully (cache miss = query DB directly).

---

## 9. Migration Strategy

### Phase Sequence

```
Phase 1: OAuth + Backend Port (can be parallel-dispatched)
├── 1a: Register GitHub/Google OAuth apps
├── 1b: Port backend to Bun.serve (routes, auth, webhooks)
├── 1c: Add OAuth routes + user_oauth_providers table
└── 1d: Deploy to pi2 K3s (test NodePort, side-by-side with v1)

Phase 2: ML Engine
├── 2a: Python microservice (predict, retrain, model management)
├── 2b: Seed training data (synthetic + any real data in DB)
├── 2c: External API integrations (crime, weather)
├── 2d: Ensemble/blender in Bun backend
├── 2e: Deploy ML pod to K3s (ClusterIP)
└── 2f: Connect admin/ML.tsx to real endpoints

Phase 3: Frontend
├── 3a: Login page (add OAuth buttons)
├── 3b: Profile page (linked accounts)
├── 3c: ML dashboard (real metrics, source breakdown)
├── 3d: Remove infra pages (Services, Network, Logs)
└── 3e: Update DataFlowDiagram for 3-source architecture

Phase 4: Cutover
├── 4a: PA-220 firewall rule for CF tunnel → pi2
├── 4b: Point gq.vandine.us at v2
├── 4c: Monitor for 48h
├── 4d: Decommission v1 on pi1
└── 4e: OpenClaw cron for weekly ML retrain
```

### Parallel Opportunities

Phases 1b and 2a are independent — the backend port and the ML engine can be built simultaneously by subagents. Phase 3 depends on both completing.

### Rollback Plan

At every phase, v1 remains running on pi1. If v2 has issues:
1. Point CF tunnel back to pi1
2. No data migration needed (same PostgreSQL DB)
3. No user impact beyond a brief DNS switch

### Recommendation

- **Use our skills for every phase**: infra-brainstorming for Phase 4a (firewall), task-decomposition for each phase, parallel-dispatch for 1b+2a, agent-review-gates for all subagent output.
- **Don't rush Phase 4** — let v2 bake on a test port with real traffic (mirror or canary) before cutting over.
- **The ML engine can ship with synthetic data** — it doesn't need 1000 real quotes to be useful. Even 200 synthetic samples give it better predictions than hardcoded multipliers.

---

## 10. Architect's Concerns — Open Questions & Known Gaps

> This section is an honest assessment of where the above architecture is weakest, where I'm making assumptions I can't fully validate, and where decisions need more input before implementation. These are the things I'd raise in a design review.

### 10.1 The Synthetic Data Trap (ML Engine)

I said the ML engine "can ship with synthetic data" and that "200 synthetic samples give better predictions than hardcoded multipliers." **I'm not confident that's true.**

The problem: when you generate synthetic training data, the model learns the patterns **you embedded in the generator**, not real-world patterns. If the synthetic data generator uses the same multiplier logic that's in `quote-calculator.ts`, the "ML model" is just a fancy regression that reproduces the existing formula — with added noise from randomization. You'd have a model that says `r2 = 0.91` but is actually just re-deriving the rules you already have.

**What would actually make synthetic data useful**: If the synthetic generator incorporates patterns the rule engine *doesn't* — like "acceptance rate drops above $5000 for private events" or "Miami quotes close 20% more than Chicago quotes at the same price point." But that requires domain knowledge about the private security industry that I don't have.

**My recommendation is weaker than I stated**: The honest path is:
1. Ship with rules + external APIs (Sources 2+3) first
2. Collect **real** quote data as users interact with the system
3. Only train a model once you have 200+ *real* records with outcomes (`was_accepted`)
4. Until then, the "ML" column on quotes says "insufficient data — rule-based estimate"

**Question for you**: How much real quote data exists in the current production database? If there are already hundreds of completed quotes with outcomes, we can train immediately. If it's mostly empty test data, the model needs to wait.

### 10.2 OAuth Token in URL Fragment — Security Leak

In Section 6 (Frontend Changes), I proposed the OAuth callback returns a JWT via URL fragment:

```
/auth/callback#token=eyJ...
```

This is a common pattern but has a known weakness: if the user clicks any external link on the page before the fragment is cleaned from the URL, the full URL (including token) can leak via the `Referer` header. Some browsers strip fragments from Referer, but not all do reliably.

**The current codebase already supports httpOnly cookies** — `AuthContext.tsx` has both cookie-based and localStorage-based auth, with CSRF token handling. The safer approach for OAuth returns:

1. Backend sets an httpOnly session cookie on the callback response
2. Redirects to the frontend (no token in URL at all)
3. Frontend's `checkSession` useEffect hits `/api/auth/me` with `credentials: "include"` — picks up the cookie automatically
4. No token exposure in URL, Referer headers, or browser history

**I should have recommended this from the start.** The URL fragment approach is a shortcut that trades security for simplicity. For a security company's product, that tradeoff is wrong.

### 10.3 PKCE — Did I Skip It?

The OAuth flow I described (authorization code grant, backend-mediated) is the **confidential client** pattern — the SPA never handles the authorization code directly, the backend does. This is correct and PKCE isn't strictly required for confidential clients.

However, adding PKCE (Proof Key for Code Exchange) anyway is defense-in-depth. It prevents authorization code interception attacks even if HTTPS is somehow compromised. Google now recommends PKCE for all OAuth flows. The implementation cost is trivial — generate a `code_verifier` (random string), SHA-256 hash it into `code_challenge`, send the challenge on the initial redirect, send the verifier on the code exchange.

**Recommendation**: Add PKCE. The added implementation is ~10 lines. The security benefit is real. I should have included it in the flow diagram.

### 10.4 WebSocket Authentication — Currently Missing

The v1 `services/websocket.ts` accepts connections without authentication:

```typescript
// v1: websocket.ts — handleOpen takes a type but no auth check
export function handleOpen(ws, type, userId?, role?) {
  // userId and role are optional — and in index.ts, they're never passed for client connections
```

In `index.ts`, the WebSocket upgrade happens without checking JWT:

```typescript
// v1: index.ts — no token validation before upgrade
if (url.pathname.startsWith("/ws/")) {
  const connectionType = pathParts[2] === "admin" ? "admin" : "client";
  server.upgrade(req, { data: { connectionType } });  // No auth!
}
```

**Anyone can connect to `/ws/admin` and receive system events.** This is a security bug in v1 that I didn't flag prominently enough. The v2 architecture must:

1. Require JWT in the WebSocket upgrade request (via `?token=` query param or `Sec-WebSocket-Protocol` header — cookies don't work reliably with WebSocket upgrades cross-origin)
2. Verify the token before calling `server.upgrade()`
3. Reject upgrade if token is invalid or expired
4. For admin connections, verify `role === "admin"` before granting admin channel subscriptions

### 10.5 Middleware Without a Framework — The Repetition Problem

I positioned "no middleware chain" as a feature of native Bun.serve. But middleware exists for a reason. Consider the admin routes — every single one needs:

```typescript
// This pattern repeats in EVERY admin handler
async function adminEndpoint(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  // ... actual logic
}
```

With Hono, this was `app.use("/api/admin/*", authMiddleware)` — one line for all admin routes. Without a framework, we either:

**Option A**: Accept the repetition (explicit, no magic, but verbose)
**Option B**: Write a `wrapAdmin(handler)` higher-order function:

```typescript
function wrapAdmin(handler: (req: Request, user: AuthUser) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const user = await requireAuth(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    return handler(req, user);
  };
}

// Usage in routes:
"/api/admin/stats": { GET: wrapAdmin(adminRoutes.stats) },
"/api/admin/users": { GET: wrapAdmin(adminRoutes.listUsers), POST: wrapAdmin(adminRoutes.createUser) },
```

**Option C**: Reintroduce a minimal middleware layer (but then why did we drop Hono?)

I recommended Option A in the architecture but should have flagged this tradeoff. For 35 routes, 15 of which are admin-only, the repetition is noticeable. **Option B is probably the right answer** — we get the explicitness of no framework while eliminating the auth boilerplate.

### 10.6 Python ML Engine on Pi2 — Resource Concerns

I said "deploy Python FastAPI + XGBoost as a K3s pod on pi2." But I don't know pi2's actual RAM:

- Pi 5 comes in 4GB and 8GB variants
- Pi2 already runs: K3s control plane, Suricata, Wazuh, SentinelNet, MarketPulse (Deno + Bun test pods)
- Python + scikit-learn + XGBoost + FastAPI + uvicorn ≈ 300-500MB at idle
- During **training** (not just inference), XGBoost can spike to 1-2GB depending on dataset size and tree depth

**If pi2 is 4GB total**, adding a Python ML service may cause OOM kills. K3s itself uses ~500MB, Suricata is memory-hungry (1-2GB for deep packet inspection), and we've already got multiple pods running.

**Alternatives if pi2 can't handle it**:
1. **Run ML training on ThinkStation, inference on pi2**: Train weekly via OpenClaw cron on the ThinkStation (plenty of resources), export the model artifact, deploy a lightweight inference-only Python container on pi2 (much smaller memory footprint — just loads a serialized model and does predict)
2. **Run the entire ML service on ThinkStation**: Expose via Tailscale, backend calls it over the network. Adds ~10ms latency per prediction but removes all resource concerns.
3. **Replace Python with a Bun-native ML approach**: Use a lightweight decision tree library in JavaScript (less optimal than XGBoost but zero new runtime). Only viable if the model complexity stays low.

**I need to know pi2's RAM before committing to the deployment plan.** This is a hard constraint, not a preference.

### 10.7 EVENT_TYPE_MAP Data Integrity Bug

The current `index.ts` (and `quote-calculator.ts`) has this mapping:

```typescript
const EVENT_TYPE_MAP: Record<string, string> = {
  corporate: "CORPORATE",
  concert: "CONCERT",
  sports: "SPORT",
  private: "WEDDING",      // ← WRONG: private events aren't weddings
  construction: "RETAIL",   // ← WRONG: construction sites aren't retail
  retail: "RETAIL",
  residential: "EXECUTIVE", // ← WRONG: residential security isn't executive protection
  festival: "FESTIVAL",
  nightclub: "NIGHTCLUB",
};
```

But `schema.sql` seeds these event types:

```sql
INSERT INTO event_types (code, name, base_hourly_rate, risk_weight) VALUES
    ('corporate', 'Corporate Event', 35.00, 0.20),
    ('concert', 'Concert / Festival', 45.00, 0.70),
    ('sports', 'Sporting Event', 42.00, 0.60),
    ('private', 'Private Event', 30.00, 0.30),
    ('construction', 'Construction Site', 32.00, 0.40),
    ('retail', 'Retail Security', 28.00, 0.35),
    ('residential', 'Residential', 25.00, 0.25);
```

The schema uses **lowercase** codes (`corporate`, `concert`), but the map converts to **uppercase** (`CORPORATE`, `CONCERT`). And three mappings point to codes that **don't exist in the seed data** (`WEDDING`, `EXECUTIVE`, `NIGHTCLUB`).

**This means**: If someone selects "private" event type, the backend maps it to `WEDDING`, queries `SELECT * FROM event_types WHERE code = 'WEDDING'`, gets zero rows, and falls back to `{ base_rate: 35, risk_multiplier: 1.0 }`. The event type selection is **silently broken** for private, construction, and residential events.

**This is a v1 bug that needs fixing regardless of v2.** The v2 architecture should:
1. Make `event_types.code` the canonical identifier (lowercase, stored in DB)
2. Remove the mapping entirely — frontend sends the code as-is
3. Validate against the DB on every quote request

### 10.8 The `pricing_rules` JSONB Condition Engine — Scope Creep Risk

In Section 7, I proposed:

```sql
CREATE TABLE pricing_rules (
    condition JSONB NOT NULL,  -- { "field": "is_night_shift", "op": "eq", "value": true }
    ...
);
```

This sounds elegant but means building a **rule evaluation engine** that parses JSON conditions, supports operators (`eq`, `gt`, `lt`, `in`, `between`), handles type coercion, and supports compound conditions (`AND`/`OR`). That's a non-trivial piece of code — easily 200+ lines to do correctly, with edge cases around null handling, type mismatches, and operator precedence.

**Simpler alternative for v2.0**: Instead of a generic rule DSL, use typed rule categories:

```sql
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(30) NOT NULL,
    -- For multiplier rules: which field and threshold
    trigger_field VARCHAR(50),   -- 'crowd_size', 'is_night_shift', 'event_type', etc.
    trigger_value VARCHAR(100),  -- '5000', 'true', 'concert', etc.
    trigger_op VARCHAR(10) DEFAULT 'eq', -- 'eq', 'gt', 'gte', 'lt', 'in'
    -- What it does
    adjustment_type VARCHAR(20), -- 'multiply', 'add_flat', 'add_per_guard', 'minimum', 'maximum'
    adjustment_value DECIMAL(10, 4),
    priority INT DEFAULT 0,
    client_id INT REFERENCES clients(id),  -- NULL = applies to all
    is_active BOOLEAN DEFAULT true
);
```

No JSONB parsing needed. The rule engine is a simple loop: query active rules, check each condition against the quote input, apply adjustments in priority order. This covers 95% of real pricing rules. Save the generic DSL for v3.0 when you actually need compound conditions.

### 10.9 `enrichment_cache` — Just Use Redis

I proposed a PostgreSQL `enrichment_cache` table and then noted "Redis might be better." Having thought about it more: **just use Redis.** 

- Cache entries have TTL (Redis does this natively with `EX`)
- We don't need to query cache entries (we never ask "show me all cached crime data for California")
- Postgres insert + select for cache is slower than Redis get/set
- We're already deploying Redis for rate limiting and session cache

One store for all caching. Don't split it across Redis and Postgres for no reason. Remove the `enrichment_cache` table from the schema proposal.

### 10.10 No Testing Strategy

The v1 codebase has three test files (`health.test.ts`, `auth.test.ts`, `quote.test.ts`). I didn't mention testing anywhere in the v2 architecture. That's a gap.

**What needs testing in v2:**

- **Auth**: Login, registration, OAuth flows (mock provider responses), token refresh, account linking
- **ML predictions**: Given known inputs, verify the ensemble produces reasonable outputs. Boundary tests: what happens with zero training data? What if the ML engine is down?
- **Rate limiting**: Verify limits are enforced, Redis failure gracefully degrades
- **Webhook delivery**: HMAC signatures are correct, retries work, timeouts handled
- **Rule engine**: Priority ordering, client-specific overrides, edge cases (no matching rules, conflicting rules)

**For the ML engine specifically**: We need "sanity tests" — not unit tests of internal functions, but integration tests that say "for a 10-guard, armed, night concert in a high-crime zip code with 3000 attendees, the predicted price should be between $X and $Y." These catch regressions when the model is retrained.

**Recommendation**: Use `bun test` (built-in test runner). Each route module gets a test file. ML engine gets its own pytest suite. Add testing as an explicit phase in the migration plan (probably Phase 3.5, between frontend and cutover).

### 10.11 The Demo Mode Question

`pi-services.ts` has a `checkDemoMode()` function that returns mock data when the Pi is unreachable. This suggests the app was designed to be demoed without real infrastructure — maybe for sales presentations or local development.

I recommended removing all infra code. But if GuardQuote needs a demo mode for trade shows, sales calls, or local dev, we lose that capability.

**Question for you**: Is demo mode important? If so, the v2 architecture needs a `DEMO_MODE=true` environment variable that makes the ML engine return plausible mock predictions, and the backend returns seed data instead of querying the real DB. This is a different concern from "managing Pi services" — it's about the app being self-contained when disconnected from infrastructure.

### 10.12 The `quote_requests` Table — Inline Migration Antipattern

In `index.ts` (around line 800), there's this:

```typescript
// Create quote_requests table if not exists
sql`CREATE TABLE IF NOT EXISTS quote_requests (...)`.catch(() => {});
```

The app creates its own database table at import time. This works for a single-process development setup, but in K3s with multiple pod replicas, you'd have a race condition — two pods starting simultaneously both try to create the table. `CREATE TABLE IF NOT EXISTS` handles this for table creation specifically, but this pattern doesn't scale to schema modifications (what happens when you need to `ALTER TABLE quote_requests ADD COLUMN ...`?).

**v2 should use explicit migrations**: A `migrations/` directory with numbered SQL files (`001_initial.sql`, `002_add_oauth_providers.sql`, etc.), run by a one-shot K8s Job before the app pods start. Or use a lightweight migration tool (`dbmate`, `golang-migrate`, or even a Bun script that runs SQL files in order and tracks state in a `schema_migrations` table).

### 10.13 Resend Email Integration — Underspecified

The user specifically mentioned email reports and assessments. The backend has Resend as a dependency (`re_ekCeyEnv_FKJb6GN2hXWoq6URnnuiWtLk` — though this key is for whale-watcher, GuardQuote needs its own). I didn't detail:

1. **Quote emails to clients**: When a quote status changes to `sent`, email the client a formatted quote with the 3-source breakdown. What does that email look like? It should show the price, risk assessment, and enrichment context (weather warning, nearby events) — this is a competitive differentiator that makes the quote feel intelligent.

2. **ML training report emails**: When the model retrains, email admins with: new model version, metric comparisons vs previous version, feature importance changes, drift warnings. This is the webhook payload formatted for humans.

3. **Quote acceptance notifications**: When a client accepts/rejects a quote, notify the account manager via email.

These are user-facing features that affect the product experience. The architecture should specify the email templates conceptually (not HTML, but what data they contain and when they're triggered).

### 10.14 Confidence Score Calibration

In the ensemble design (Section 3), I wrote:

> If model confidence > 0.8 AND sample_count > 50: model gets 60% weight

ML model confidence scores (probability estimates) are notoriously **uncalibrated**. An XGBoost model saying "0.85 confidence" might empirically be correct only 60% of the time. The raw probability output from tree-based models doesn't map linearly to actual accuracy.

**This matters because**: If we weight the ensemble based on uncalibrated confidence, we might over-trust the model when it shouldn't be trusted, or under-trust it when it's actually reliable.

**Fix**: After training, run calibration (Platt scaling or isotonic regression) on the held-out test set. scikit-learn has `CalibratedClassifierCV` for this. Store the calibrated probabilities, not the raw ones. This is a ~5 line addition to the training pipeline but significantly improves the ensemble weighting.

### Summary: What I'd Want Answered Before Building

| # | Question | Blocks |
|---|----------|--------|
| 1 | How much real quote data exists in production DB? | ML engine approach (real vs synthetic vs wait) |
| 2 | What is pi2's RAM? (`free -h`) | ML engine deployment target |
| 3 | Is demo mode needed for sales/dev? | Whether to remove or redesign infra code |
| 4 | Should OAuth tokens be encrypted at rest? | Database schema for `user_oauth_providers` |
| 5 | Which external APIs are accessible/affordable? (Crime, weather, events) | Source 2 design |
| 6 | Is the EVENT_TYPE_MAP bug known? Has it affected real quotes? | Data integrity assessment |
| 7 | What email workflows matter most? (Client quotes, ML reports, notifications) | Resend integration priority |

---

## Appendix: Files to Reference

| File | Why |
|------|-----|
| `docs/bun-reference.md` | Bun 1.3 API patterns, all proven in MarketPulse |
| `reference/superpowers/` | Skill patterns from obra/superpowers framework |
| `/tmp/guard-quote/` | v1 codebase (cloned, dev branch) |
| `skills/` (20 skills) | Our full skill suite for executing this plan |

---

*This is a living document. Update as decisions are made and phases complete.*
