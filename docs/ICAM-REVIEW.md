# ICAM Review Checklist

**Owner:** Milkias Kassa (@Malachizirgod)  
**Status:** 🟡 Pending Review  
**Last Updated:** 2026-02-06

## Overview

This document outlines the Identity, Credential, and Access Management (ICAM) implementation in GuardQuote for security review and best practices certification.

---

## Current Implementation

### 1. Authentication System

#### Login Flow
```
User → POST /api/auth/login
     → Validate email/password (bcrypt)
     → Generate JWT (HS256, 8h expiry)
     → Set HttpOnly cookie (gq_session)
     → Set CSRF cookie (gq_csrf)
     → Log activity to user_activity table
     → Return user profile
```

#### Cookies
| Cookie | Purpose | Flags | Expiry |
|--------|---------|-------|--------|
| `gq_session` | JWT session token | HttpOnly, SameSite=Lax, Secure | 8 hours |
| `gq_csrf` | CSRF protection token | SameSite=Strict | Session |
| `gq_remember` | Remember-me indicator | SameSite=Lax | 30 days |

#### Password Storage
- **Algorithm:** bcrypt
- **Salt Rounds:** 10 (default)
- **Location:** `users.password_hash` column

### 2. Authorization (RBAC)

#### Roles Defined
| Role | Description | Users |
|------|-------------|-------|
| `admin` | Full system access | admin@guardquote.com |
| `developer` | Limited dev access | isaiah, milkias, xavier @guardquote.com |

#### Permission Matrix
```typescript
const ROLE_PERMISSIONS = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'ml:read', 'ml:write', 'ml:train',
    'quotes:read', 'quotes:write', 'quotes:delete',
    'clients:read', 'clients:write', 'clients:delete',
    'blog:read', 'blog:write', 'blog:delete',
    'features:read', 'features:write', 'features:delete'
  ],
  developer: [
    'ml:read', 'ml:write',
    'quotes:read',
    'clients:read',
    'blog:read',
    'features:read', 'features:write'
  ]
};
```

#### Permission Check Flow
```
Request → Extract JWT from cookie
        → Verify signature + expiry
        → Get user role from DB
        → Check role has required permission
        → Allow or deny (403)
```

### 3. Session Management

#### JWT Claims
```json
{
  "sub": "user-uuid",
  "email": "user@guardquote.com",
  "role": "developer",
  "iat": 1707282000,
  "exp": 1707310800
}
```

#### Session Termination
- **Logout:** Clears all cookies, returns success
- **Expiry:** JWT rejected after 8h (or 30d with remember-me)
- **No server-side session store** (stateless JWT)

### 4. Audit Logging

#### user_activity Table
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50),      -- 'login', 'logout', 'password_change', etc.
  details JSONB,           -- Additional context
  ip_address VARCHAR(45),  -- IPv4 or IPv6
  user_agent TEXT,         -- Browser/client info
  created_at TIMESTAMPTZ
);
```

#### Events Logged
- [x] Login success
- [x] Login failure (with email attempted)
- [x] Logout
- [x] Password change
- [ ] Permission denied (TODO)
- [ ] Profile update (TODO)

---

## Review Checklist

### ✅ Authentication
- [ ] Passwords hashed with bcrypt (verify salt rounds ≥10)
- [ ] JWT secret is cryptographically random (≥256 bits)
- [ ] JWT expiry is reasonable (8h default)
- [ ] HttpOnly flag prevents XSS token theft
- [ ] Secure flag enabled in production
- [ ] SameSite attribute prevents CSRF

### ✅ Authorization
- [ ] All protected routes check permissions
- [ ] Role-permission mapping is least-privilege
- [ ] No permission escalation vulnerabilities
- [ ] Admin-only routes verified (users management)

### ✅ Session Security
- [ ] Tokens cannot be forged (signature verified)
- [ ] Expired tokens properly rejected
- [ ] Logout clears all session cookies
- [ ] Remember-me extends session safely

### ✅ Credential Management
- [ ] No plaintext passwords in logs
- [ ] Password change requires current password
- [ ] Password complexity rules enforced (TODO)
- [ ] Account lockout after failed attempts (TODO)

### ✅ Audit Trail
- [ ] All auth events logged
- [ ] IP addresses captured
- [ ] User agent captured
- [ ] Logs protected from tampering

### ✅ Best Practices
- [ ] OWASP ASVS Level 1 compliance
- [ ] No sensitive data in JWT payload
- [ ] CSRF protection on state-changing requests
- [ ] Rate limiting on auth endpoints (TODO)

---

## Recommendations

### High Priority
1. **Add password complexity rules**
   - Minimum 8 characters
   - Mix of upper/lower/number/special
   - Check against common passwords list

2. **Implement account lockout**
   - Lock after 5 failed attempts
   - 15-minute lockout duration
   - Log lockout events

3. **Add rate limiting**
   - 5 login attempts per minute per IP
   - Use sliding window algorithm

### Medium Priority
4. **JWT refresh tokens**
   - Short-lived access tokens (15m)
   - Long-lived refresh tokens (7d)
   - Rotate refresh on use

5. **Session revocation**
   - Server-side session store (Redis)
   - Ability to revoke all sessions
   - "Log out everywhere" feature

### Low Priority
6. **MFA support**
   - TOTP (Google Authenticator)
   - Email OTP backup

7. **Password history**
   - Prevent reuse of last 5 passwords

---

## Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Login handler | `server.ts` | ~220-280 |
| JWT verification | `server.ts` | ~150-180 |
| Permission check | `server.ts` | ~180-220 |
| RBAC matrix | `server.ts` | ~100-130 |
| Activity logging | `server.ts` | ~280-310 |
| Frontend auth | `AuthContext.tsx` | Full file |
| Login page | `Login.tsx` | Full file |
| Profile page | `Profile.tsx` | Full file |

---

## Testing Commands

```bash
# Test login
curl -X POST https://guardquote.vandine.us/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"milkias@guardquote.com","password":"Welcome123!"}' \
  -c cookies.txt

# Test protected route with cookie
curl https://guardquote.vandine.us/api/auth/me \
  -b cookies.txt

# Test permission denied
curl https://guardquote.vandine.us/api/admin/users \
  -b cookies.txt  # Should return 403 for developer role
```

---

## Sign-Off

| Reviewer | Date | Status |
|----------|------|--------|
| Milkias Kassa | ______ | ⬜ Pending |
| Rafa Garcia | ______ | ⬜ Pending |

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
