# IAM & Access Control Documentation

**Project:** GuardQuote v3.0
**Writer:** Milkias Kassa (@Malachizirgod)
**Last Updated:** 2026-03-27
**Status:** Active

---

## Table of Contents

1. [Overview](#1-overview)
2. [Identity Model](#2-identity-model)
3. [Authentication](#3-authentication)
  - 3.1 [Password-Based Login](#31-password-based-login)
  - 3.2 [OAuth 2.0 / SSO](#32-oauth-20--sso)
  - 3.3 [Token Management](#33-token-management)
4. [Authorization (RBAC)](#4-authorization-rbac)
  - 4.1 [Roles](#41-roles)
  - 4.2 [Permission Matrix](#42-permission-matrix)
  - 4.3 [Route Access Control](#43-route-access-control)
5. [User Lifecycle](#5-user-lifecycle)
  - 5.1 [Provisioning](#51-provisioning)
  - 5.2 [Modification](#52-modification)
  - 5.3 [Deprovisioning](#53-deprovisioning)
6. [Service-to-Service Authentication](#6-service-to-service-authentication)
7. [Rate Limiting & Brute Force Protection](#7-rate-limiting--brute-force-protection)
8. [Audit Logging](#8-audit-logging)
9. [Infrastructure Access Control](#9-infrastructure-access-control)
10. [Secrets & Credential Management](#10-secrets--credential-management)
11. [Security Controls Summary](#11-security-controls-summary)
12. [Known Gaps & Roadmap](#12-known-gaps--roadmap)
13. [Code Reference](#13-code-reference)

---

## 1. Overview

GuardQuote implements a layered Identity and Access Management (IAM) system covering application-level authentication and authorization, infrastructure network access, and service-to-service security.

### Scope

| Layer | Mechanism | Covered In |
|-------|-----------|------------|
| Application authentication | Argon2id + JWT, OAuth 2.0 | §3 |
| Application authorization | RBAC (4 roles) | §4 |
| User lifecycle | Admin API + soft-delete | §5 |
| Internal service auth | Pre-shared key (PSK) | §6 |
| Abuse prevention | Redis rate limiting | §7 |
| Compliance trail | audit_logs table | §8 |
| Infrastructure access | Tailscale VPN + Cloudflare Access | §9 |
| Secrets | K8s Secrets + .env | §10 |

### Guiding Principles

- **Least privilege**, users receive only the permissions required for their role.
- **Defense in depth**, authentication, authorization, rate limiting, and audit logging are independent layers.
- **Stateless tokens**, JWTs enable horizontal scaling without shared session state.
- **Immutable audit trail**, all security events are persisted to `audit_logs` and cannot be modified by application users.

---

## 2. Identity Model

### User Record (PostgreSQL)

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,         -- Argon2id
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  DEFAULT 'user'
                  CHECK (role IN ('admin', 'iam', 'manager', 'user')),
    is_active     BOOLEAN      DEFAULT true,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    last_login    TIMESTAMP
);
```

### Linked OAuth Accounts

```sql
CREATE TABLE oauth_accounts (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         VARCHAR(50)  NOT NULL,  -- 'microsoft' | 'google' | 'github'
    provider_id      VARCHAR(255) NOT NULL,  -- Provider-assigned unique ID
    email            VARCHAR(255),
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);
```

An application user may have zero or more linked OAuth accounts. Email is used as the linking key: if an OAuth login returns an email that matches an existing `users.email`, the OAuth account is linked rather than creating a duplicate user.

---

## 3. Authentication

### 3.1 Password-Based Login

#### Credential Storage

Passwords are never stored in plaintext. The `Bun.password.hash` API applies **Argon2id** before storage.

| Parameter | Value |
|-----------|-------|
| Algorithm | Argon2id |
| Memory cost | 65,536 KiB (64 MB) |
| Time cost (iterations) | 3 |
| Column | `users.password_hash` |

**Implementation:** [backend/src/services/auth.ts](../backend/src/services/auth.ts)

```typescript
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}
```

#### Login Flow

```
POST /api/auth/login
  │
  ├─ 1. Clock sanity check (year must be 2026–2030)
  ├─ 2. Lookup user by email
  ├─ 3. Check is_active = true
  ├─ 4. Bun.password.verify(submitted, stored_hash)
  ├─ 5. On success:
  │      a. Generate access token  (JWT, 24h)
  │      b. Generate refresh token (JWT, 7d)
  │      c. Update users.last_login
  │      d. Write LOGIN_SUCCESS to audit_logs
  │      e. Return { user, accessToken, refreshToken }
  └─ 6. On failure:
         a. Write LOGIN_FAILURE to audit_logs (with email attempted)
         b. Return 401 Unauthorized
```

**Rate limit:** 10 requests / minute / IP (auth preset, see §7).

---

### 3.2 OAuth 2.0 / SSO

#### Supported Providers

| Provider | PKCE | Scopes | Config Env Vars |
|----------|------|--------|-----------------|
| Microsoft Entra ID | Yes | `openid email profile` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Google | Yes | `openid email profile` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub | No | `read:user user:email` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

> PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks on public clients.

#### OAuth Flow

```
1. Client  → GET /api/auth/login/:provider?returnUrl=/dashboard
2. Backend → Generate PKCE code_verifier + code_challenge (SHA-256)
             Store { state, code_verifier, returnUrl } in memory (TTL: 10 min)
3. Backend → 302 redirect to provider authorization URL
4. User    → Authenticates at provider
5. Provider→ 302 redirect to GET /api/auth/callback/:provider?code=...&state=...
6. Backend → Validate state parameter (prevents CSRF)
             Exchange code for access token (with PKCE verifier if applicable)
             Fetch user profile from provider's userinfo endpoint
7. Backend → Upsert user in `users` + upsert `oauth_accounts`
             Generate GuardQuote JWT pair (access + refresh)
8. Backend → 302 redirect to returnUrl?token=<access_token>
9. Frontend→ Store token, call /api/auth/me to populate session
```

**State expiry cleanup** runs every 60 seconds. Expired states are automatically removed from the in-memory store.

**Implementation:** [backend/src/services/oauth.ts](../backend/src/services/oauth.ts), [backend/src/services/oauth-config.ts](../backend/src/services/oauth-config.ts)

---

### 3.3 Token Management

#### JWT Structure

**Algorithm:** HS256 (HMAC-SHA256)
**Secret:** `JWT_SECRET` env var (minimum 32 characters)

```json
{
  "userId": 42,
  "email": "user@example.com",
  "role": "manager",
  "iat": 1742000000,
  "exp": 1742086400
}
```

> The payload intentionally avoids sensitive data. Role is included to avoid a DB round-trip on every request while still being verifiable via signature.

#### Token Lifetimes

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access token | 24 hours | API authentication |
| Refresh token | 7 days | Obtain new access token |

#### Token Refresh

```
POST /api/auth/refresh
  Body: { refreshToken }
  Response: { accessToken, refreshToken }
```

The refresh endpoint validates the refresh token's signature and expiry, then issues a fresh token pair. The old refresh token is invalidated upon reuse (rotation).

#### Frontend Token Storage

Tokens are stored in `localStorage` with a fallback to `httpOnly` cookies.
State-changing requests include a `X-CSRF-Token` header for CSRF protection.

**Implementation:** [frontend/src/context/AuthContext.tsx](../frontend/src/context/AuthContext.tsx)

---

## 4. Authorization (RBAC)

### 4.1 Roles

GuardQuote uses a flat four-tier role hierarchy. Roles are stored in `users.role` and embedded in the JWT at login.

| Role | Description | Typical Users |
|------|-------------|---------------|
| `admin` | Full system access, user management | System administrator |
| `iam` | User management + IAM configuration | Identity & Access lead |
| `manager` | Quote + client management | Sales/Operations |
| `user` | Read/create own quotes and clients | Clients, field staff |

> The `admin` role is the only role that can create other `admin` accounts.
> The `iam` role is the only other role with access to `/api/admin/users` endpoints.

### 4.2 Permission Matrix

| Capability | admin | iam | manager | user |
|-----------|:-----:|:---:|:-------:|:----:|
| View own profile | | | | |
| Change own password | | | | |
| Create quotes | | | | |
| View all quotes | | | | |
| Update quotes | | | | |
| View clients | | | | |
| Create clients | | | | |
| **List all users** | | | | |
| **Create users** | | | | |
| **Modify user roles** | | | | |
| **Deactivate users** | | | | |
| **View admin stats** | | | | |
| **View all quote requests** | | | | |
| **Approve quote requests** | | | | |

### 4.3 Route Access Control

#### Authorization Middleware

Every protected handler calls one of the following helpers before processing the request:

```typescript
// Verify any valid JWT → returns JWTPayload or Response(401)
const auth = await requireAuth(c);

// Verify JWT + assert role membership → returns JWTPayload or Response(403)
const auth = await requireRole(c, "admin", "iam");

// Shorthand for admin-only
const auth = await requireAdmin(c);
```

**Implementation:** [backend/src/index.ts](../backend/src/index.ts) lines 1620–1647

#### Public Routes (No Token Required)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/`, `/health`, `/live` | Health/liveness probes |
| GET | `/api/health`, `/api/status` | Status endpoints |
| GET | `/api/public/stats` | Aggregate stats only |
| POST | `/api/predict` | Simplified quote estimate |
| POST | `/api/quote-requests` | Public quote submission |
| GET | `/api/quotes/lookup` | Lookup by quote# + email |
| GET | `/ml/*` | ML health, model info |
| POST | `/ml/quote`, `/ml/risk-assessment` | ML prediction |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Self-registration |
| POST | `/api/auth/setup` | Initial admin setup (once) |
| GET | `/api/auth/providers` | Configured OAuth providers |
| GET | `/api/auth/login/:provider` | Initiate OAuth |
| GET | `/api/auth/callback/:provider` | OAuth callback |

#### Authenticated Routes (Bearer Token Required, All Roles)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/refresh` | Token refresh |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/change-password` | Change own password |
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/quotes/:id` | Quote detail |
| PATCH | `/api/quotes/:id` | Update quote |
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id` | Client detail |

#### Admin/IAM Routes (admin or iam role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Deactivate user |

#### Admin-Only Routes (admin role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/quote-requests` | All quote requests |
| GET | `/api/admin/quote-requests/:id` | Single quote request |
| PATCH | `/api/admin/quote-requests/:id` | Update quote request |

---

## 5. User Lifecycle

### 5.1 Provisioning

#### Self-Registration (Public)

```
POST /api/auth/register
Body: { email, password, firstName, lastName, phone?, companyName? }
```

- New accounts are assigned `role: 'user'` automatically.
- If `companyName` is provided, a linked `clients` record is created.
- Email must be unique across `users.email`.

#### Admin-Created User

```
POST /api/admin/users
Headers: Authorization: Bearer <admin_or_iam_token>
Body: { email, password, firstName, lastName, role }
```

- Admin or IAM users can create accounts with any role including `manager`.
- Only `admin` users can create other `admin` accounts.

#### Initial System Setup

```
POST /api/auth/setup
Body: { email, password, firstName, lastName }
```

- Available only if **no admin account exists** in the database.
- Creates the first admin account and is subsequently rejected (403).

#### OAuth Account Linking

When a user authenticates via OAuth:
1. GuardQuote queries `oauth_accounts` by `(provider, provider_id)`.
2. If not found, queries `users` by the OAuth-returned email.
3. If matched → link the new OAuth account to the existing user.
4. If no match → create a new `users` record with `role: 'user'`, then link.

---

### 5.2 Modification

```
PATCH /api/admin/users/:id
Headers: Authorization: Bearer <admin_or_iam_token>
Body: { firstName?, lastName?, role?, isActive? }
```

- Role changes take effect on the user's **next login** (new JWT issued).
- A running access token retains the old role until expiry (24h max).
- Password changes via admin are not supported; users must use `POST /api/auth/change-password`.

---

### 5.3 Deprovisioning

GuardQuote uses **soft delete**. Accounts are never hard-deleted from the database.

```
DELETE /api/admin/users/:id
→ Sets users.is_active = false
```

Effect:
- Login is rejected at step 3 of the login flow (active check).
- Existing valid JWTs for the deactivated user will still pass signature verification until expiry (max 24h). For immediate effect, see §12 (session revocation gap).
- All historical records (quotes, audit logs) remain intact and associated with the user ID.

#### Off-Boarding Checklist

When a team member leaves, complete all of the following:

- [ ] Set `is_active = false` via `PATCH /api/admin/users/:id`
- [ ] Remove from Tailscale network (Tailscale admin console)
- [ ] Remove from Cloudflare Access policies
- [ ] Remove from GitHub collaborators
- [ ] Remove SSH public key from `~/.ssh/authorized_keys` on target hosts
- [ ] Rotate any PSKs or secrets the user had knowledge of
- [ ] Verify `audit_logs` for any anomalous activity before departure

---

## 6. Service-to-Service Authentication

The Backend and ML Engine communicate internally using a **Pre-Shared Key (PSK)** passed in a custom HTTP header.

### Header

```
X-Internal-Secret: <ML_ENGINE_SECRET>
```

### Middleware (ML Engine, FastAPI)

The ML Engine validates every inbound request with `requireS2SAuth()`:

```typescript
export function requireS2SAuth() {
  return async (c: Context, next: Next) => {
    const secret = c.req.header(S2S_HEADER);          // "X-Internal-Secret"
    if (!secret || secret !== ML_ENGINE_SECRET) {
      return c.json({ error: "Invalid S2S credentials" }, 403);
    }
    await next();
  };
}
```

### Outbound Helper (Backend)

```typescript
export async function mlEngineRequest(path: string, body: object) {
  return fetch(`${ML_ENGINE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": ML_ENGINE_SECRET,
    },
    body: JSON.stringify(body),
  });
}
```

**Implementation:** [backend/src/middleware/s2s-auth.ts](../backend/src/middleware/s2s-auth.ts)

### S2S Secret Rotation

1. Generate a new random secret: `openssl rand -hex 32`
2. Update `ML_ENGINE_SECRET` in the K8s secret: `kubectl edit secret guardquote-secrets -n guardquote`
3. Restart both Backend and ML Engine deployments to pick up the new value.

---

## 7. Rate Limiting & Brute Force Protection

Rate limiting is implemented as Redis-backed sliding window middleware, applied per IP address.

**Implementation:** [backend/src/middleware/rate-limit.ts](../backend/src/middleware/rate-limit.ts)

### Tier Configuration

| Tier | Limit | Window | Applied To |
|------|-------|--------|------------|
| auth | 10 req | 1 min | `/api/auth/*` |
| ml | 30 req | 1 min | `/ml/*` |
| standard | 100 req | 1 min | General API |
| admin | 200 req | 1 min | `/api/admin/*` |
| websocket | 5 conn | 1 min | WS upgrade |
| ingest | 20 req | 1 min | Ingest endpoints |

### Response Headers

Every rate-limited response includes:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1742000060
```

When the limit is exceeded, the response is `429 Too Many Requests`.

### IP Blocking

After **10 rate-limit violations** within a window, the offending IP is blocked for **1 hour**. Blocked IPs receive `403 Forbidden` on all requests.

### Graceful Degradation

If Redis is unavailable, rate limiting is bypassed and a warning is logged. The application continues serving requests rather than failing closed.

---

## 8. Audit Logging

### audit_logs Table

```sql
CREATE TABLE audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id),  -- NULL for unauthenticated events
    action     VARCHAR(50),
    details    JSONB,                      -- Structured event data
    ip_address VARCHAR(45),                -- IPv4 or IPv6
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Logged Events

| Action | Trigger | user_id | Details Example |
|--------|---------|---------|-----------------|
| `LOGIN_SUCCESS` | Successful password or OAuth login | User's ID | `{ method: "password" }` |
| `LOGIN_FAILURE` | Bad credentials | NULL | `{ email: "attempted@..." }` |
| `LOGOUT` | `POST /api/auth/logout` | User's ID | `{}` |
| `PASSWORD_CHANGE` | `POST /api/auth/change-password` | User's ID | `{}` |
| `USER_CREATED` | Admin creates user | Admin's ID | `{ targetUserId, role }` |
| `USER_DEACTIVATED` | Admin deactivates user | Admin's ID | `{ targetUserId }` |
| `ROLE_CHANGED` | Admin modifies role | Admin's ID | `{ targetUserId, from, to }` |
| `QUOTE_STATUS_CHANGE` | Quote lifecycle | User's ID | `{ quoteId, from, to }` |

### Quote Status History

Separate table for granular quote lifecycle tracking:

```sql
CREATE TABLE quote_status_history (
    id          SERIAL PRIMARY KEY,
    quote_id    INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status   VARCHAR(50) NOT NULL,
    changed_by  INT REFERENCES users(id),
    reason      TEXT,
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Log Integrity

Audit records are insert-only. The application provides no API endpoint to update or delete `audit_logs` rows. Direct database access is restricted to the admin user on Pi1 via Tailscale (see §9).

---

## 9. Infrastructure Access Control

### Access Matrix, Team Members

| Resource | Rafael (Admin) | Isaiah (SecOps) | Milkias (IAM) | Xavier (UX) |
|----------|:--------------:|:---------------:|:-------------:|:-----------:|
| GuardQuote Dashboard | | | | |
| GuardQuote Admin Panel | | | | |
| Grafana / Prometheus / Loki | | | | |
| GitHub Repository | | | | |
| Tailscale VPN | Full | SIEM only | | |
| SSH to Pi0 / Pi1 / Pi2 | | | | |
| PostgreSQL direct access | | | | |
| K8s kubectl access | | | | |

### Access Methods

#### GuardQuote Application (Email + Password)
Used for the admin dashboard and API.
Default initial password: `Welcome123!`, must be changed on first login.

#### Cloudflare Access (Email OTP)
Used for: Grafana, Prometheus, Loki monitoring dashboards.
Flow: Enter `@guardquote.com` email → receive one-time passcode → enter code.
Token validity: 24 hours.

#### Tailscale VPN
Used for: SSH to servers, direct database access, SIEM syslog forwarding.

| Member | Tailscale Access | Restriction |
|--------|-----------------|-------------|
| Rafael | Full mesh | None |
| Isaiah | Restricted | Pi0 port 514 (syslog) only |

Isaiah's Tailscale ACL:
```hcl
{ "action": "accept", "src": ["tag:isaiah"], "dst": ["pi0:514"] }
```

#### SSH Access (Tailscale Required)
```bash
ssh rafaeljg@pi0       # Pi0, DNS/AdGuard/SNMP/rsyslog
ssh johnmarston@pi1    # Pi1, PostgreSQL/Monitoring
ssh rafaeljg@100.111.113.35  # Pi2, K3s workloads
```

SSH keys are managed in `~/.ssh/authorized_keys` on each host.

#### Database Access (Tailscale + psql)
```bash
psql -h 100.77.26.41 -U postgres -d guardquote
```

Direct database access is restricted to Rafael. Application pods connect using the `DATABASE_URL` K8s secret.

---

## 10. Secrets & Credential Management

### Environment Variables (Auth/Security)

| Variable | Description | Minimum Requirement |
|----------|-------------|---------------------|
| `JWT_SECRET` | Signs all JWTs | ≥32 characters, cryptographically random |
| `ML_ENGINE_SECRET` | Backend ↔ ML Engine PSK | ≥32 characters, cryptographically random |
| `GITHUB_CLIENT_ID` / `_SECRET` | GitHub OAuth app | From GitHub Developer Settings |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Google OAuth app | From Google Cloud Console |
| `MICROSOFT_CLIENT_ID` / `_SECRET` | Microsoft Entra ID | From Azure App Registration |
| `DATABASE_URL` | PostgreSQL connection string | Must use Tailscale IP for Pi1 |
| `REDIS_HOST` / `_PORT` / `_PASSWORD` | Rate limit store | |

### Production Storage

Secrets are stored as a Kubernetes Secret in the `guardquote` namespace:

```bash
# View secret names
kubectl get secret guardquote-secrets -n guardquote

# Retrieve a value
kubectl get secret guardquote-secrets -n guardquote \
  -o jsonpath='{.data.jwt-secret}' | base64 -d
```

The `.env` file is **gitignored** and must never be committed. Use `.env.example` as a template.

### Secret Rotation Procedure

1. Generate new value: `openssl rand -hex 32`
2. Update K8s secret: `kubectl edit secret guardquote-secrets -n guardquote`
3. Restart affected deployments: `kubectl rollout restart deployment/<name> -n guardquote`
4. For `JWT_SECRET` rotation: all existing sessions are immediately invalidated.

---

## 11. Security Controls Summary

| Control | Implementation | Standard |
|---------|---------------|----------|
| Password hashing | Argon2id (64MB memory, 3 iterations) | OWASP ASVS 2.4 |
| Password verification timing | Constant-time via `Bun.password.verify` | Prevents timing attacks |
| JWT algorithm | HS256 with secret ≥32 chars | RFC 7519 |
| Token expiry | 24h access / 7d refresh | OWASP ASVS 3.2 |
| OAuth PKCE | SHA-256 code challenge | RFC 7636 |
| OAuth state | In-memory, 10-min TTL | CSRF prevention |
| CSRF protection | `X-CSRF-Token` header | OWASP ASVS 4.2 |
| Rate limiting | Redis sliding window, tiered | Brute-force protection |
| IP blocking | Auto-block after 10 violations | Abuse prevention |
| RBAC | 4 roles, checked per route | Least privilege |
| Soft delete | `is_active` flag | Data integrity |
| Audit trail | `audit_logs` table, insert-only | Non-repudiation |
| S2S authentication | Pre-shared key header | Internal API security |
| Database encryption-in-transit | TLS via Tailscale mesh | Network security |
| Infrastructure access | Tailscale + Cloudflare Access | Zero-trust perimeter |

---

## 12. Known Gaps & Roadmap

The following items have been identified through the ICAM review and are tracked for implementation.

### High Priority

| Gap | Risk | Proposed Fix |
|-----|------|--------------|
| No password complexity rules | Weak passwords accepted | Enforce min 8 chars, mixed case, digit, special char |
| No account lockout | Brute force on individual accounts possible | Lock after 5 failures, 15-min duration, log event |
| JWT revocation not possible | Deactivated user JWTs valid up to 24h | Add Redis blocklist or server-side session store |

### Medium Priority

| Gap | Risk | Proposed Fix |
|-----|------|--------------|
| OAuth state stored in memory | State lost on pod restart | Move to Redis |
| No "log out everywhere" | Compromised token can't be remotely invalidated | Session store + revocation endpoint |
| Access tokens are 24h | Long window for stolen token abuse | Reduce to 15m with silent refresh |

### Low Priority

| Gap | Risk | Proposed Fix |
|-----|------|--------------|
| No MFA | Single factor only | TOTP via authenticator app (RFC 6238) |
| No password history | Users can re-use old passwords | Track last 5 hashes in `password_history` table |
| Permission denied not logged | Incomplete audit trail | Log 403 responses to `audit_logs` |
| Profile update not logged | Missing audit event | Add `PROFILE_UPDATED` action |

### Compliance Target

GuardQuote is working toward **OWASP ASVS Level 1** compliance. High-priority gaps above are the remaining blockers.

---

## 13. Code Reference

### Backend Authentication & Authorization

| Component | File | Notes |
|-----------|------|-------|
| Password hashing / JWT signing | [backend/src/services/auth.ts](../backend/src/services/auth.ts) | `hashPassword`, `generateToken`, `verifyToken` |
| Login / refresh / change-password logic | [backend/src/services/auth.ts](../backend/src/services/auth.ts) | `loginUser`, `refreshToken` |
| OAuth 2.0 flow with PKCE | [backend/src/services/oauth.ts](../backend/src/services/oauth.ts) | `initiateOAuth`, `handleCallback` |
| OAuth provider configuration | [backend/src/services/oauth-config.ts](../backend/src/services/oauth-config.ts) | Microsoft, Google, GitHub configs |
| `requireAuth` / `requireRole` helpers | [backend/src/index.ts](../backend/src/index.ts) | Lines 1620–1647 |
| All API route handlers | [backend/src/index.ts](../backend/src/index.ts) | ~1900 lines |
| Rate limiting middleware | [backend/src/middleware/rate-limit.ts](../backend/src/middleware/rate-limit.ts) | Redis sliding window |
| Service-to-service auth | [backend/src/middleware/s2s-auth.ts](../backend/src/middleware/s2s-auth.ts) | PSK header validation |

### Frontend

| Component | File | Notes |
|-----------|------|-------|
| Auth context & token management | [frontend/src/context/AuthContext.tsx](../frontend/src/context/AuthContext.tsx) | `useAuth` hook |

### Database

| Component | File | Notes |
|-----------|------|-------|
| Full schema (users, audit_logs, etc.) | [backend/src/db/schema.sql](../backend/src/db/schema.sql) | |
| OAuth accounts migration | [backend/src/db/migrations/001_oauth_accounts.sql](../backend/src/db/migrations/001_oauth_accounts.sql) | |

### Related Documentation

| Document | Location |
|----------|----------|
| ICAM Review Checklist | [docs/ICAM-REVIEW.md](ICAM-REVIEW.md) |
| Team Access Matrix | [docs/team/ACCESS-MATRIX.md](team/ACCESS-MATRIX.md) |
| OAuth Provider Setup Guide | [docs/setup/oauth-providers.md](setup/oauth-providers.md) |
| Infrastructure Host Inventory | [docs/infrastructure/HOSTS.md](infrastructure/HOSTS.md) |
| Tailscale Network Setup | [docs/infrastructure/tailscale/README.md](infrastructure/tailscale/README.md) |
| K8s Runbook | [docs/runbooks/K3S.md](runbooks/K3S.md) |
| SecOps Findings | [docs/SECOPS-FINDINGS-2026-03-01.md](SECOPS-FINDINGS-2026-03-01.md) |

---

*This document reflects the state of GuardQuote v3.0 as of 2026-03-27.*
*For questions, contact the IAM owner: Milkias Kassa (@Malachizirgod).*
