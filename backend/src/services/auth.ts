/**
 * Authentication Service - JWT-based auth with password hashing
 */
import { sql } from "../db/connection";

const JWT_SECRET = process.env.JWT_SECRET || "guardquote_secret_key_change_in_production";
const JWT_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
const REFRESH_EXPIRY = 60 * 60 * 24 * 7; // 7 days

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// Simple base64url encode/decode
function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

// HMAC-SHA256 signing
async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

// Create JWT token
export async function createToken(payload: Omit<JWTPayload, "iat" | "exp">, expiresIn: number = JWT_EXPIRY): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));
  const signature = await sign(`${headerB64}.${payloadB64}`, JWT_SECRET);

  return `${headerB64}.${payloadB64}.${signature}`;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;

    const expectedSignature = await sign(`${headerB64}.${payloadB64}`, JWT_SECRET);
    if (signature !== expectedSignature) return null;

    const payload: JWTPayload = JSON.parse(base64urlDecode(payloadB64));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// Hash password using Bun's native password hashing (Argon2)
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Login user
export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const users = await sql`
      SELECT id, email, password_hash, first_name, last_name, role, is_active
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (users.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const user = users[0];

    if (!user.is_active) {
      return { success: false, error: "Account is disabled" };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Log failed attempt
      await sql`
        INSERT INTO audit_logs (user_id, action, details, ip_address)
        VALUES (${user.id}, 'login_failed', '{"reason": "invalid_password"}'::jsonb, null)
      `.catch(() => {}); // Ignore if audit_logs table doesn't exist

      return { success: false, error: "Invalid email or password" };
    }

    // Create tokens
    const accessToken = await createToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = await createToken({ userId: user.id, email: user.email, role: user.role }, REFRESH_EXPIRY);

    // Log successful login
    await sql`
      INSERT INTO audit_logs (user_id, action, details)
      VALUES (${user.id}, 'login_success', '{"method": "password"}'::jsonb)
    `.catch(() => {});

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`.catch(() => {});

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  const payload = await verifyToken(refreshToken);
  if (!payload) {
    return { success: false, error: "Invalid refresh token" };
  }

  // Verify user still exists and is active
  const users = await sql`
    SELECT id, email, first_name, last_name, role, is_active
    FROM users
    WHERE id = ${payload.userId}
  `;

  if (users.length === 0 || !users[0].is_active) {
    return { success: false, error: "User not found or inactive" };
  }

  const user = users[0];
  const newAccessToken = await createToken({ userId: user.id, email: user.email, role: user.role });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
    accessToken: newAccessToken,
  };
}

// Get user from token
export async function getUserFromToken(token: string): Promise<AuthResult["user"] | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const users = await sql`
    SELECT id, email, first_name, last_name, role
    FROM users
    WHERE id = ${payload.userId} AND is_active = true
  `;

  if (users.length === 0) return null;

  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
  };
}

// Create admin user (for initial setup)
export async function createAdminUser(email: string, password: string, firstName: string, lastName: string): Promise<AuthResult> {
  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      return { success: false, error: "User already exists" };
    }

    const passwordHash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${firstName}, ${lastName}, 'admin', true)
      RETURNING id
    `;

    return { success: true, user: { id: result[0].id, email, firstName, lastName, role: "admin" } };
  } catch (error: any) {
    console.error("Create admin error:", error);
    return { success: false, error: "Failed to create user" };
  }
}
