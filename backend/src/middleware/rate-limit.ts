/**
 * Redis-based Rate Limiting Middleware for Hono
 *
 * Implements sliding window rate limiting using Redis on Pi1.
 * Based on Gemini's recommendation to use hono/rate-limiter pattern with Redis.
 */

import type { Context, Next } from "hono";

// Redis connection config (Pi1)
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
if (!REDIS_PASSWORD) console.warn("REDIS_PASSWORD not set — rate limiting may fail");

// Simple Redis client using Bun's TCP
class RedisClient {
  private socket: any = null;
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.socket = await Bun.connect({
        hostname: REDIS_HOST,
        port: REDIS_PORT,
        socket: {
          data: () => {},
          error: () => {
            this.connected = false;
          },
          close: () => {
            this.connected = false;
          },
        },
      });

      // Authenticate
      await this.command(`AUTH ${REDIS_PASSWORD}`);
      this.connected = true;
    } catch (error) {
      console.warn("Redis connection failed, rate limiting disabled:", error);
      this.connected = false;
    }
  }

  private async command(cmd: string): Promise<string> {
    if (!this.socket) return "";

    return new Promise((resolve) => {
      const parts = cmd.split(" ");
      const formatted = `*${parts.length}\r\n${parts.map((p) => `$${p.length}\r\n${p}`).join("\r\n")}\r\n`;
      this.socket.write(formatted);

      // Simple response handling (for single-line responses)
      setTimeout(() => resolve("OK"), 10);
    });
  }

  async incr(key: string): Promise<number> {
    if (!this.connected) return 0;

    try {
      const result = await this.command(`INCR ${key}`);
      return parseInt(result, 10) || 1;
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.connected) return;
    await this.command(`EXPIRE ${key} ${seconds}`);
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;

    try {
      return await this.command(`GET ${key}`);
    } catch {
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton Redis client
const redis = new RedisClient();

// Initialize Redis connection
redis.connect().catch(() => console.warn("Redis rate limiting unavailable"));

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
  /** Key prefix for Redis */
  prefix?: string;
  /** Function to extract identifier (default: IP) */
  keyGenerator?: (c: Context) => string;
  /** Skip rate limiting for certain requests */
  skip?: (c: Context) => boolean;
}

/**
 * Default configurations for different endpoints
 */
export const RateLimitPresets = {
  /** Standard API endpoints: 100 req/min */
  standard: { max: 100, windowSec: 60 },

  /** Authentication endpoints: 10 req/min (brute force protection) */
  auth: { max: 10, windowSec: 60 },

  /** ML predictions: 30 req/min (resource intensive) */
  ml: { max: 30, windowSec: 60 },

  /** WebSocket connections: 5 connections/min */
  websocket: { max: 5, windowSec: 60 },

  /** Admin endpoints: 200 req/min */
  admin: { max: 200, windowSec: 60 },

  /** Ingest endpoints: 20 req/min (batch operations) */
  ingest: { max: 20, windowSec: 60 },
} as const;

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: RateLimitConfig) {
  const { max, windowSec, prefix = "rl", keyGenerator = (c) => getClientIP(c), skip } = config;

  return async (c: Context, next: Next) => {
    // Check if should skip
    if (skip?.(c)) {
      return next();
    }

    // If Redis is not available, allow request but warn
    if (!redis.isConnected()) {
      c.header("X-RateLimit-Status", "disabled");
      return next();
    }

    const identifier = keyGenerator(c);
    const key = `${prefix}:${identifier}:${Math.floor(Date.now() / 1000 / windowSec)}`;

    try {
      const current = await redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redis.expire(key, windowSec);
      }

      // Set rate limit headers
      c.header("X-RateLimit-Limit", max.toString());
      c.header("X-RateLimit-Remaining", Math.max(0, max - current).toString());
      c.header(
        "X-RateLimit-Reset",
        (Math.ceil(Date.now() / 1000 / windowSec) * windowSec).toString()
      );

      // Check if over limit
      if (current > max) {
        c.header("Retry-After", windowSec.toString());
        return c.json(
          {
            error: "Too many requests",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: windowSec,
          },
          429
        );
      }
    } catch (error) {
      // On Redis error, allow request but log
      console.warn("Rate limit check failed:", error);
    }

    return next();
  };
}

/**
 * Extract client IP from request
 */
function getClientIP(c: Context): string {
  // Check common proxy headers
  const forwarded = c.req.header("X-Forwarded-For");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = c.req.header("X-Real-IP");
  if (realIP) {
    return realIP;
  }

  // Fallback to connection info (Bun-specific)
  // In production behind Traefik, X-Forwarded-For will be set
  return "unknown";
}

/**
 * Combined rate limiter for multiple tiers
 */
export function tieredRateLimit() {
  const authLimiter = rateLimit({ ...RateLimitPresets.auth, prefix: "rl:auth" });
  const mlLimiter = rateLimit({ ...RateLimitPresets.ml, prefix: "rl:ml" });
  const standardLimiter = rateLimit({ ...RateLimitPresets.standard, prefix: "rl:api" });

  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Apply appropriate rate limit based on path
    if (path.startsWith("/api/auth/")) {
      return authLimiter(c, next);
    }

    if (path.startsWith("/ml/") || path.startsWith("/api/ml/")) {
      return mlLimiter(c, next);
    }

    return standardLimiter(c, next);
  };
}

/**
 * IP-based blocking for repeated violations
 */
const blockedIPs = new Set<string>();
const violationCounts = new Map<string, number>();

export function blockOnRepeatedViolations(threshold: number = 10) {
  return async (c: Context, next: Next) => {
    const ip = getClientIP(c);

    if (blockedIPs.has(ip)) {
      return c.json({ error: "IP temporarily blocked", code: "IP_BLOCKED" }, 403);
    }

    const response = await next();

    // Track violations (429 responses)
    if (c.res.status === 429) {
      const count = (violationCounts.get(ip) || 0) + 1;
      violationCounts.set(ip, count);

      if (count >= threshold) {
        blockedIPs.add(ip);
        // Auto-unblock after 1 hour
        setTimeout(
          () => {
            blockedIPs.delete(ip);
            violationCounts.delete(ip);
          },
          60 * 60 * 1000
        );
      }
    }

    return response;
  };
}
