# Windows OAuth (Microsoft Entra ID) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Microsoft/Azure AD OAuth SSO to GuardQuote alongside existing password auth

**Architecture:** OAuth 2.0 Authorization Code flow with PKCE. Users can sign in with Microsoft account, which creates/links a local user record. Existing password auth remains available.

**Tech Stack:** Hono, OAuth 2.0, Microsoft Identity Platform (Entra ID)

---

## Prerequisites

- Microsoft Entra ID (Azure AD) app registration
- Redirect URI configured: `https://guardquote.vandine.us/api/auth/callback/microsoft`

---

### Task 1: Create OAuth Configuration

**Files:**
- Create: `backend/src/services/oauth-config.ts`

**Step 1: Write OAuth provider configuration**

```typescript
/**
 * OAuth Provider Configuration
 * Supports Microsoft, Google, GitHub
 */

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  pkce: boolean;
}

export const providers: Record<string, OAuthProvider> = {
  microsoft: {
    name: "Microsoft",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scopes: ["openid", "email", "profile", "User.Read"],
    pkce: true,
  },
  google: {
    name: "Google",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"],
    pkce: true,
  },
  github: {
    name: "GitHub",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email"],
    pkce: false,
  },
};

export function getProvider(name: string): OAuthProvider | null {
  return providers[name] || null;
}

export function isProviderConfigured(name: string): boolean {
  const provider = providers[name];
  return !!(provider?.clientId && provider?.clientSecret);
}

export function getConfiguredProviders(): string[] {
  return Object.keys(providers).filter(isProviderConfigured);
}
```

**Step 2: Commit**

```bash
git add src/services/oauth-config.ts
git commit -m "feat(auth): add OAuth provider configuration"
```

---

### Task 2: Create OAuth Service

**Files:**
- Create: `backend/src/services/oauth.ts`

**Step 1: Write OAuth service with PKCE support**

```typescript
/**
 * OAuth Service - Handles OAuth 2.0 flows with PKCE
 */
import { getProvider, type OAuthProvider } from "./oauth-config";

// In-memory state store (use Redis in production)
const stateStore = new Map<string, { provider: string; codeVerifier?: string; returnUrl?: string }>();

// Generate random string for state/verifier
function generateRandom(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate PKCE code verifier and challenge
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandom(32);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

/**
 * Generate authorization URL for OAuth provider
 */
export async function getAuthorizationUrl(
  providerName: string,
  redirectUri: string,
  returnUrl?: string
): Promise<string | null> {
  const provider = getProvider(providerName);
  if (!provider || !provider.clientId) return null;

  const state = generateRandom(16);
  const stateData: { provider: string; codeVerifier?: string; returnUrl?: string } = {
    provider: providerName,
    returnUrl,
  };

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider.scopes.join(" "),
    state,
  });

  if (provider.pkce) {
    const { verifier, challenge } = await generatePKCE();
    stateData.codeVerifier = verifier;
    params.set("code_challenge", challenge);
    params.set("code_challenge_method", "S256");
  }

  stateStore.set(state, stateData);
  
  // Clean up old states after 10 minutes
  setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

  return `${provider.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(
  state: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; provider: string; returnUrl?: string } | null> {
  const stateData = stateStore.get(state);
  if (!stateData) return null;
  
  stateStore.delete(state);
  
  const provider = getProvider(stateData.provider);
  if (!provider) return null;

  const params = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  if (provider.pkce && stateData.codeVerifier) {
    params.set("code_verifier", stateData.codeVerifier);
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    console.error(`OAuth token exchange failed: ${await response.text()}`);
    return null;
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    provider: stateData.provider,
    returnUrl: stateData.returnUrl,
  };
}

/**
 * Fetch user info from OAuth provider
 */
export async function getUserInfo(
  providerName: string,
  accessToken: string
): Promise<{ email: string; name: string; providerId: string } | null> {
  const provider = getProvider(providerName);
  if (!provider) return null;

  const response = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const data = await response.json();

  // Normalize user data across providers
  if (providerName === "microsoft") {
    return {
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      providerId: data.id,
    };
  } else if (providerName === "google") {
    return {
      email: data.email,
      name: data.name,
      providerId: data.id,
    };
  } else if (providerName === "github") {
    // GitHub may need separate email API call
    return {
      email: data.email || `${data.login}@github.local`,
      name: data.name || data.login,
      providerId: String(data.id),
    };
  }

  return null;
}
```

**Step 2: Commit**

```bash
git add src/services/oauth.ts
git commit -m "feat(auth): add OAuth service with PKCE support"
```

---

### Task 3: Add OAuth Routes

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Add OAuth endpoints**

Add after existing auth routes:

```typescript
import { getAuthorizationUrl, exchangeCode, getUserInfo } from "./services/oauth";
import { getConfiguredProviders, isProviderConfigured } from "./services/oauth-config";
import { createToken, type AuthResult } from "./services/auth";

// Get available OAuth providers
app.get("/api/auth/providers", (c) => {
  return c.json({
    providers: getConfiguredProviders(),
  });
});

// Start OAuth flow
app.get("/api/auth/login/:provider", async (c) => {
  const provider = c.req.param("provider");
  const returnUrl = c.req.query("returnUrl") || "/";
  
  if (!isProviderConfigured(provider)) {
    return c.json({ error: "Provider not configured" }, 400);
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3002";
  const redirectUri = `${baseUrl}/api/auth/callback/${provider}`;
  
  const authUrl = await getAuthorizationUrl(provider, redirectUri, returnUrl);
  if (!authUrl) {
    return c.json({ error: "Failed to generate auth URL" }, 500);
  }

  return c.redirect(authUrl);
});

// OAuth callback
app.get("/api/auth/callback/:provider", async (c) => {
  const provider = c.req.param("provider");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect("/login?error=missing_params");
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3002";
  const redirectUri = `${baseUrl}/api/auth/callback/${provider}`;

  // Exchange code for token
  const tokenResult = await exchangeCode(state, code, redirectUri);
  if (!tokenResult) {
    return c.redirect("/login?error=token_exchange_failed");
  }

  // Get user info
  const userInfo = await getUserInfo(provider, tokenResult.accessToken);
  if (!userInfo) {
    return c.redirect("/login?error=user_info_failed");
  }

  // Find or create user
  let user = await sql`
    SELECT u.* FROM users u
    JOIN oauth_accounts oa ON oa.user_id = u.id
    WHERE oa.provider = ${provider} AND oa.provider_id = ${userInfo.providerId}
  `.then(rows => rows[0]);

  if (!user) {
    // Check if email already exists
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${userInfo.email}
    `.then(rows => rows[0]);

    if (existingUser) {
      // Link OAuth to existing account
      await sql`
        INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
        VALUES (${existingUser.id}, ${provider}, ${userInfo.providerId}, ${userInfo.email})
      `;
      user = existingUser;
    } else {
      // Create new user
      const [firstName, ...lastParts] = userInfo.name.split(" ");
      const lastName = lastParts.join(" ") || "";
      
      const newUser = await sql`
        INSERT INTO users (email, first_name, last_name, role, password_hash)
        VALUES (${userInfo.email}, ${firstName}, ${lastName}, 'user', 'oauth-only')
        RETURNING *
      `.then(rows => rows[0]);

      await sql`
        INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
        VALUES (${newUser.id}, ${provider}, ${userInfo.providerId}, ${userInfo.email})
      `;
      user = newUser;
    }
  }

  // Create JWT
  const accessToken = await createToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Redirect with token (in production, use httpOnly cookie)
  const returnUrl = tokenResult.returnUrl || "/";
  return c.redirect(`${returnUrl}?token=${accessToken}`);
});
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat(auth): add OAuth login and callback routes"
```

---

### Task 4: Create OAuth Database Migration

**Files:**
- Create: `backend/src/db/migrations/003_oauth_accounts.sql`

**Step 1: Write migration**

```sql
-- OAuth accounts table for linking providers to users
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_id);
```

**Step 2: Commit**

```bash
git add src/db/migrations/
git commit -m "feat(auth): add OAuth accounts database migration"
```

---

### Task 5: Update Environment Variables

**Files:**
- Modify: `backend/.env.example`

**Step 1: Add OAuth configuration**

```bash
# OAuth Providers
# Microsoft (Azure AD / Entra ID)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Application
BASE_URL=http://localhost:3002
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add OAuth environment variables"
```

---

### Task 6: Create Microsoft Entra ID App Registration Guide

**Files:**
- Create: `docs/setup/microsoft-oauth.md`

**Step 1: Write setup guide**

```markdown
# Microsoft OAuth Setup (Entra ID)

## 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name:** GuardQuote
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** Web - `https://guardquote.vandine.us/api/auth/callback/microsoft`
5. Click **Register**

## 2. Configure Authentication

1. Go to **Authentication**
2. Under **Platform configurations**, verify redirect URI
3. Enable **Access tokens** and **ID tokens** under Implicit grant
4. Save

## 3. Get Credentials

1. Go to **Overview**
2. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`
3. Go to **Certificates & secrets**
4. Click **New client secret**
5. Copy the **Value** → `MICROSOFT_CLIENT_SECRET`

## 4. Configure Permissions

1. Go to **API permissions**
2. Add permissions:
   - Microsoft Graph > Delegated > `email`
   - Microsoft Graph > Delegated > `openid`
   - Microsoft Graph > Delegated > `profile`
   - Microsoft Graph > Delegated > `User.Read`
3. Click **Grant admin consent** (if admin)

## 5. Environment Variables

```bash
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://guardquote.vandine.us
```

## Testing

1. Navigate to `/api/auth/login/microsoft`
2. Should redirect to Microsoft login
3. After auth, redirects back with JWT token
```

**Step 2: Commit**

```bash
git add docs/setup/microsoft-oauth.md
git commit -m "docs: add Microsoft OAuth setup guide"
```

---

## Rollback Plan

1. Remove OAuth routes from index.ts
2. Drop oauth_accounts table
3. Remove OAuth env vars

## Success Criteria

- [ ] `/api/auth/providers` returns configured providers
- [ ] `/api/auth/login/microsoft` redirects to Microsoft
- [ ] Callback creates/links user and returns JWT
- [ ] Existing password auth still works
