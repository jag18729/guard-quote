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
