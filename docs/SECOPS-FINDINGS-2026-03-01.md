# SecOps Findings, 2026-03-01

**Analyst:** Isaiah Bernal (@ibernal1815)
**Role:** Security Operations
**Scope:** Grey-hat review of GuardQuote backend, middleware, infrastructure docs
**Status:** Initial findings, remediation in progress

---

## Summary

Performed an initial walkthrough of the codebase and infrastructure docs as part of ongoing SecOps responsibilities. Found 4 vulnerabilities and 1 configuration gap worth addressing. Nothing is on fire, but a couple of these deserve attention before the capstone demo.

| # | Title | Severity | File | Status |
|---|-------|----------|------|--------|
| 1 | Timing attack in S2S auth | High | `backend/src/middleware/s2s-auth.ts` | Open |
| 2 | Plaintext credentials in repo | High | `docs/BASTION.md` | Open |
| 3 | IP spoofing via X-Forwarded-For | Medium | `backend/src/middleware/rate-limit.ts` | Open |
| 4 | Overly permissive CORS | Medium | `backend/src/index.ts` | Open |
| 5 | Missing SIEM ingest endpoint | Gap | `scripts/siem/log-shipper.py` | Open |

---

## Finding 1, Timing Attack in S2S Auth

**Severity:** High
**File:** `backend/src/middleware/s2s-auth.ts`

### What's happening

The `requireS2SAuth()` middleware validates the pre-shared key using JavaScript's `===` operator:

```ts
if (secret !== ML_ENGINE_SECRET) {
  return c.json({ error: "Invalid S2S credentials" }, 403);
}
```

String comparison in JS short-circuits, it returns `false` the moment it finds a mismatched character. An attacker with enough requests can measure response-time deltas to guess the secret one byte at a time (classic timing oracle attack).

### Fix

Replace with a constant-time comparison using the Web Crypto API:

```ts
import { timingSafeEqual } from "node:crypto";

const secretBytes = Buffer.from(secret);
const expectedBytes = Buffer.from(ML_ENGINE_SECRET);

if (
  secretBytes.length !== expectedBytes.length ||
  !timingSafeEqual(secretBytes, expectedBytes)
) {
  return c.json({ error: "Invalid S2S credentials" }, 403);
}
```

Alternatively, use `crypto.subtle` HMAC comparison if staying Web API native. Either way, no `===` on secrets.

---

## Finding 2, Plaintext Credentials Committed to Repo

**Severity:** High
**File:** `docs/BASTION.md`

### What's happening

The bastion host credentials table is committed directly in the repo:

```md
| Isaiah  | `isaiah`  | `Welcome123!` | security  |
| Milkias | `milkias` | `Welcome123!` | developer |
| Xavier  | `xavier`  | `Welcome123!` | developer |
```

These are LDAP credentials for a live bastion with SSH access to pi0 and pi1. Anyone with repo read access has them.

### Fix

- Remove passwords from the doc (replace with `(see team vault / ask Rafa)`)
- Rotate the affected LDAP accounts
- Going forward: credential references belong in 1Password / team secrets manager, not markdown

---

## Finding 3, IP Spoofing via X-Forwarded-For

**Severity:** Medium
**File:** `backend/src/middleware/rate-limit.ts`

### What's happening

The `getClientIP()` function reads `X-Forwarded-For` and takes the first value without validating that the request actually came through a trusted proxy:

```ts
const forwarded = c.req.header("X-Forwarded-For");
if (forwarded) {
  return forwarded.split(",")[0].trim();
}
```

If the backend is ever reachable directly (not via Cloudflare/Traefik), an attacker can spoof `X-Forwarded-For: 1.2.3.4` to cycle through fake IPs and bypass the rate limiter entirely.

### Fix

The backend should only trust `X-Forwarded-For` when it's behind a known proxy. Either:
- Strip all but the **rightmost** IP (the last hop the proxy appended, which can't be spoofed)
- Or whitelist the known proxy CIDR (Cloudflare's published ranges) and reject requests outside it

Since Cloudflare sits in front, using the `CF-Connecting-IP` header is more reliable here, Cloudflare sets it, clients can't override it.

```ts
const cfIP = c.req.header("CF-Connecting-IP");
if (cfIP) return cfIP;
```

---

## Finding 4, Overly Permissive CORS

**Severity:** Medium
**File:** `backend/src/index.ts`, line 36

### What's happening

CORS is applied globally with no origin restrictions:

```ts
app.use("*", cors());
```

This allows any origin to make credentialed cross-origin requests to the API, which widens the attack surface for CSRF-style attacks against authenticated sessions.

### Fix

Lock `origin` to known-good values. For GuardQuote, that's the Cloudflare Pages domain and localhost for dev:

```ts
app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      "https://guardquote.vandine.us",
      "http://localhost:5173",
    ];
    return allowed.includes(origin) ? origin : null;
  },
  credentials: true,
}));
```

---

## Finding 5, SIEM Ingest Endpoint Missing

**Severity:** Gap (not a vulnerability)
**File:** `scripts/siem/log-shipper.py`

### What's happening

The log-shipper is configured to POST HMAC-signed batches to a `webhook_url`, but there's no corresponding `/api/siem/ingest` endpoint in the backend. The shipper would 404 on every request.

This isn't a security risk on its own, but it means the SIEM pipeline isn't actually delivering logs anywhere. Wazuh and Suricata data stays in Loki, but application-layer events (API calls, auth attempts, quote requests) never make it to the SIEM.

### Fix

Add a `/api/siem/ingest` endpoint that:
1. Validates the `X-Signature` HMAC header
2. Parses and stores the log batch (or forwards to Loki/Elasticsearch)
3. Returns 202 Accepted

This is the next SecOps build task, will open a separate issue for it.

---

## Next Steps

- [ ] Fix Finding 1 (`timingSafeEqual`), low effort, high value
- [ ] Fix Finding 2 (rotate creds, scrub doc), needs Rafa + team
- [ ] Fix Finding 3 (CF-Connecting-IP), one-liner swap
- [ ] Fix Finding 4 (CORS allowlist), quick config change
- [ ] Build SIEM ingest endpoint, tracked separately

---

*All findings were identified through static analysis and architecture review. No active exploitation was performed against production systems.*
