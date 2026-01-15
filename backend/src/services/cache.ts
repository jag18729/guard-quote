/**
 * Cache Service - Redis-based caching layer
 * Uses Bun's built-in Redis client (Bun 1.3+)
 * Falls back to in-memory cache if Redis unavailable
 */

// Cache configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

// In-memory fallback cache
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

// Redis client (lazy initialization)
let redisClient: any = null;
let redisAvailable = false;

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastError: null as string | null,
  redisConnected: false,
  usingFallback: true,
};

/**
 * Initialize Redis connection
 */
export async function initCache(): Promise<boolean> {
  if (!CACHE_ENABLED) {
    console.log("[Cache] Caching disabled by configuration");
    return false;
  }

  try {
    // Try Bun's native Redis client (Bun 1.3+)
    if (typeof Bun !== "undefined" && "redis" in Bun) {
      redisClient = (Bun as any).redis(REDIS_URL);
      await redisClient.ping();
      redisAvailable = true;
      stats.redisConnected = true;
      stats.usingFallback = false;
      console.log("[Cache] Connected to Redis (Bun native)");
      return true;
    }

    // Fallback: try ioredis
    try {
      const Redis = require("ioredis");
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });
      await redisClient.connect();
      await redisClient.ping();
      redisAvailable = true;
      stats.redisConnected = true;
      stats.usingFallback = false;
      console.log("[Cache] Connected to Redis (ioredis)");
      return true;
    } catch {
      // ioredis not available
    }

    console.log("[Cache] Redis unavailable, using in-memory cache");
    return false;
  } catch (error: any) {
    stats.lastError = error.message;
    stats.errors++;
    console.error("[Cache] Redis connection failed:", error.message);
    console.log("[Cache] Falling back to in-memory cache");
    return false;
  }
}

// ============================================
// CORE CACHE OPERATIONS
// ============================================

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!CACHE_ENABLED) return null;

  try {
    if (redisAvailable && redisClient) {
      const value = await redisClient.get(key);
      if (value) {
        stats.hits++;
        return JSON.parse(value);
      }
      stats.misses++;
      return null;
    }

    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        stats.hits++;
        return JSON.parse(cached.value);
      }
      memoryCache.delete(key);
    }
    stats.misses++;
    return null;
  } catch (error: any) {
    stats.errors++;
    stats.lastError = error.message;
    stats.misses++;
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function set(key: string, value: any, ttlSeconds = 300): Promise<boolean> {
  if (!CACHE_ENABLED) return false;

  try {
    const serialized = JSON.stringify(value);

    if (redisAvailable && redisClient) {
      await redisClient.set(key, serialized, { ex: ttlSeconds });
      stats.sets++;
      return true;
    }

    // Fallback to memory cache
    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
    stats.sets++;
    return true;
  } catch (error: any) {
    stats.errors++;
    stats.lastError = error.message;
    return false;
  }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<boolean> {
  if (!CACHE_ENABLED) return false;

  try {
    if (redisAvailable && redisClient) {
      await redisClient.del(key);
      stats.deletes++;
      return true;
    }

    memoryCache.delete(key);
    stats.deletes++;
    return true;
  } catch (error: any) {
    stats.errors++;
    stats.lastError = error.message;
    return false;
  }
}

/**
 * Delete keys matching pattern
 */
export async function invalidate(pattern: string): Promise<number> {
  if (!CACHE_ENABLED) return 0;

  try {
    if (redisAvailable && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        stats.deletes += keys.length;
        return keys.length;
      }
      return 0;
    }

    // Fallback: pattern matching for memory cache
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        count++;
      }
    }
    stats.deletes += count;
    return count;
  } catch (error: any) {
    stats.errors++;
    stats.lastError = error.message;
    return 0;
  }
}

// ============================================
// SPECIALIZED CACHE FUNCTIONS
// ============================================

/**
 * Cache ML prediction results
 */
export async function cacheMLPrediction(
  eventType: string,
  zipCode: string,
  numGuards: number,
  hours: number,
  result: any
): Promise<void> {
  const key = `ml:quote:${eventType}:${zipCode}:${numGuards}:${hours}`;
  await set(key, result, 300); // 5 minute TTL
}

/**
 * Get cached ML prediction
 */
export async function getCachedMLPrediction(
  eventType: string,
  zipCode: string,
  numGuards: number,
  hours: number
): Promise<any | null> {
  const key = `ml:quote:${eventType}:${zipCode}:${numGuards}:${hours}`;
  return get(key);
}

/**
 * Cache event types (rarely changes)
 */
export async function cacheEventTypes(types: any[]): Promise<void> {
  await set("ml:event-types", types, 3600); // 1 hour TTL
}

/**
 * Get cached event types
 */
export async function getCachedEventTypes(): Promise<any[] | null> {
  return get("ml:event-types");
}

/**
 * Cache locations (rarely changes)
 */
export async function cacheLocations(locations: any[]): Promise<void> {
  await set("ml:locations", locations, 3600); // 1 hour TTL
}

/**
 * Get cached locations
 */
export async function getCachedLocations(): Promise<any[] | null> {
  return get("ml:locations");
}

/**
 * Cache dashboard stats
 */
export async function cacheDashboardStats(stats: any): Promise<void> {
  await set("dashboard:stats", stats, 60); // 1 minute TTL
}

/**
 * Get cached dashboard stats
 */
export async function getCachedDashboardStats(): Promise<any | null> {
  return get("dashboard:stats");
}

/**
 * Cache user session
 */
export async function cacheSession(token: string, session: any): Promise<void> {
  await set(`session:${token}`, session, 86400); // 24 hour TTL
}

/**
 * Get cached session
 */
export async function getCachedSession(token: string): Promise<any | null> {
  return get(`session:${token}`);
}

/**
 * Invalidate session
 */
export async function invalidateSession(token: string): Promise<void> {
  await del(`session:${token}`);
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check and increment rate limit
 * Returns true if within limit, false if exceeded
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}:${endpoint}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    if (redisAvailable && redisClient) {
      // Use Redis INCR with EXPIRE
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      const ttl = await redisClient.ttl(key);
      const resetAt = now + (ttl * 1000);

      return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt,
      };
    }

    // Fallback: memory-based rate limiting
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > now) {
      const data = JSON.parse(cached.value);
      data.count++;
      memoryCache.set(key, {
        value: JSON.stringify(data),
        expiresAt: cached.expiresAt,
      });

      return {
        allowed: data.count <= maxRequests,
        remaining: Math.max(0, maxRequests - data.count),
        resetAt: cached.expiresAt,
      };
    }

    // New window
    const resetAt = now + windowMs;
    memoryCache.set(key, {
      value: JSON.stringify({ count: 1 }),
      expiresAt: resetAt,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  } catch (error) {
    // On error, allow the request
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: now + windowMs,
    };
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const hitRate = stats.hits + stats.misses > 0
    ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
    : 0;

  return {
    ...stats,
    hitRate: `${hitRate}%`,
    memorySize: memoryCache.size,
    enabled: CACHE_ENABLED,
  };
}

/**
 * Clear all cache
 */
export async function clearAll(): Promise<void> {
  if (redisAvailable && redisClient) {
    await redisClient.flushdb();
  }
  memoryCache.clear();
  console.log("[Cache] Cleared all cache");
}

/**
 * Clean up expired memory cache entries
 */
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache) {
    if (value.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupMemoryCache, 5 * 60 * 1000);

// Initialize on module load
initCache().catch(console.error);

export default {
  get,
  set,
  del,
  invalidate,
  getCacheStats,
  clearAll,
  checkRateLimit,
  // ML specific
  cacheMLPrediction,
  getCachedMLPrediction,
  cacheEventTypes,
  getCachedEventTypes,
  cacheLocations,
  getCachedLocations,
  // Dashboard
  cacheDashboardStats,
  getCachedDashboardStats,
  // Sessions
  cacheSession,
  getCachedSession,
  invalidateSession,
};
