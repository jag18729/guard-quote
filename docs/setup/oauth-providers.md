# OAuth Provider Setup Guide

This guide covers setting up OAuth authentication for GuardQuote with Microsoft, Google, and GitHub.

## Microsoft (Entra ID / Azure AD)

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name:** `GuardQuote`
   - **Supported account types:** `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI:** `Web` → `https://guardquote.vandine.us/api/auth/callback/microsoft`
5. Click **Register**

### 2. Configure Authentication

1. Go to **Authentication** in left sidebar
2. Under **Platform configurations**, verify redirect URI is correct
3. Under **Implicit grant and hybrid flows**:
   - ✅ Access tokens
   - ✅ ID tokens
4. Click **Save**

### 3. Get Credentials

1. Go to **Overview**
2. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`
3. Go to **Certificates & secrets** → **Client secrets**
4. Click **New client secret**
   - Description: `GuardQuote Production`
   - Expires: `24 months`
5. Copy the **Value** (not Secret ID) → `MICROSOFT_CLIENT_SECRET`

### 4. Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add:
   - `email`
   - `openid`
   - `profile`
   - `User.Read`
4. Click **Grant admin consent for [tenant]** (if you have admin rights)

### 5. Environment Variables

```bash
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://guardquote.vandine.us
```

---

## Google

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure consent screen if prompted:
   - User Type: `External`
   - App name: `GuardQuote`
   - User support email: your email
   - Developer contact: your email
6. Create OAuth client:
   - Application type: `Web application`
   - Name: `GuardQuote`
   - Authorized redirect URIs: `https://guardquote.vandine.us/api/auth/callback/google`

### 2. Get Credentials

- Copy **Client ID** → `GOOGLE_CLIENT_ID`
- Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### 3. Enable APIs

1. Go to **APIs & Services** → **Library**
2. Enable **Google+ API** (for user info)

### 4. Environment Variables

```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://guardquote.vandine.us
```

---

## GitHub

### 1. Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Configure:
   - **Application name:** `GuardQuote`
   - **Homepage URL:** `https://guardquote.vandine.us`
   - **Authorization callback URL:** `https://guardquote.vandine.us/api/auth/callback/github`
4. Click **Register application**

### 2. Get Credentials

1. Copy **Client ID** → `GITHUB_CLIENT_ID`
2. Click **Generate a new client secret**
3. Copy the secret → `GITHUB_CLIENT_SECRET`

### 3. Environment Variables

```bash
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://guardquote.vandine.us
```

---

## Testing OAuth Locally

For local development, use `localhost` URLs:

```bash
BASE_URL=http://localhost:3002
```

Update each provider's redirect URI to include localhost:
- Microsoft: Add `http://localhost:3002/api/auth/callback/microsoft`
- Google: Add `http://localhost:3002/api/auth/callback/google`
- GitHub: Update callback URL (only one allowed)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/auth/providers` | List configured providers |
| `GET /api/auth/login/:provider` | Start OAuth flow |
| `GET /api/auth/callback/:provider` | OAuth callback (internal) |

## Flow

1. Frontend calls `GET /api/auth/login/microsoft?returnUrl=/dashboard`
2. User redirected to Microsoft login
3. After auth, redirected to `/api/auth/callback/microsoft`
4. Backend exchanges code for token, fetches user info
5. User created/linked, JWT issued
6. Redirect to `returnUrl` with `?token=<jwt>`
7. Frontend stores token and uses for API calls

## Troubleshooting

### "Provider not configured"
- Check environment variables are set
- Restart the server after changing `.env`

### "Token exchange failed"
- Verify client secret is correct
- Check redirect URI matches exactly (including trailing slash)

### "User info failed"
- Check API permissions are granted
- For Microsoft, ensure admin consent if required

### GitHub email is null
- User may have private email
- We fall back to `username@github.local`
- User can update email in profile settings
