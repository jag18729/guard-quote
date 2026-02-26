/**
 * OAuth Service - Handles OAuth 2.0 flows with PKCE
 */
import { getProvider } from "./oauth-config";

// In-memory state store (use Redis in production for horizontal scaling)
const stateStore = new Map<
  string,
  { provider: string; codeVerifier?: string; returnUrl?: string; expiresAt: number }
>();

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

// Clean expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (value.expiresAt < now) {
      stateStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

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
  const stateData: {
    provider: string;
    codeVerifier?: string;
    returnUrl?: string;
    expiresAt: number;
  } = {
    provider: providerName,
    returnUrl,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
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
  if (!stateData) {
    console.warn("[OAuth] Invalid or expired state");
    return null;
  }

  stateStore.delete(state);

  if (stateData.expiresAt < Date.now()) {
    console.warn("[OAuth] State expired");
    return null;
  }

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

  try {
    const response = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OAuth] Token exchange failed: ${response.status} ${errorText}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string };
    return {
      accessToken: data.access_token,
      provider: stateData.provider,
      returnUrl: stateData.returnUrl,
    };
  } catch (err) {
    console.error(`[OAuth] Token exchange error: ${err}`);
    return null;
  }
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

  try {
    const response = await fetch(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[OAuth] User info fetch failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as Record<string, any>;

    // Normalize user data across providers
    if (providerName === "microsoft") {
      return {
        email: data.mail || data.userPrincipalName || "",
        name: data.displayName || "",
        providerId: data.id,
      };
    } else if (providerName === "google") {
      return {
        email: data.email || "",
        name: data.name || "",
        providerId: data.id,
      };
    } else if (providerName === "github") {
      // GitHub may return null email if private - would need separate API call
      let email = data.email as string | null;
      if (!email) {
        // Try to fetch email from emails endpoint
        try {
          const emailsResponse = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });
          if (emailsResponse.ok) {
            const emails = (await emailsResponse.json()) as Array<{ email: string; primary: boolean }>;
            const primary = emails.find((e) => e.primary) || emails[0];
            email = primary?.email || null;
          }
        } catch {
          // Ignore email fetch errors
        }
      }
      return {
        email: email || `${data.login}@github.local`,
        name: data.name || data.login || "",
        providerId: String(data.id),
      };
    }

    return null;
  } catch (err) {
    console.error(`[OAuth] User info error: ${err}`);
    return null;
  }
}
