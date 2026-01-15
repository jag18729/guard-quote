/**
 * Services Monitor - Centralized health monitoring for all services
 * Provides real-time status for admin dashboard
 */
import { sql, testConnection } from "../db/connection";
import { getCacheStats } from "./cache";
import { getWSStats, broadcastToChannel } from "./websocket";

// Service status types
type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";
type ServiceType =
  | "api"
  | "database"
  | "cache"
  | "websocket"
  | "webhooks"
  | "ml"
  | "backup"
  | "ldap"       // Future: AD/LDAP
  | "gateway"    // Future: API Gateway
  | "siem"       // Future: SIEM
  | "storage";   // Future: Object Storage

interface ServiceHealth {
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  latency?: number;
  message?: string;
  lastCheck: string;
  metrics?: Record<string, any>;
  enabled: boolean;
}

interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: number;
  requestsPerMinute: number;
  errorRate: number;
}

// Request tracking for metrics
const requestMetrics = {
  totalRequests: 0,
  errorCount: 0,
  lastMinuteRequests: [] as number[],
  lastMinuteErrors: [] as number[],
};

// Service registry - extensible for future services
const serviceRegistry: Map<ServiceType, {
  name: string;
  enabled: boolean;
  checkFn: () => Promise<Partial<ServiceHealth>>;
}> = new Map();

// ============================================
// SERVICE HEALTH CHECKS
// ============================================

/**
 * Check API health
 */
async function checkAPIHealth(): Promise<Partial<ServiceHealth>> {
  const start = performance.now();
  try {
    // Simple self-check
    const latency = Math.round(performance.now() - start);
    return {
      status: "healthy",
      latency,
      message: "API responding normally",
      metrics: {
        uptime: process.uptime(),
        requestsPerMinute: getRequestsPerMinute(),
        errorRate: getErrorRate(),
      },
    };
  } catch (error: any) {
    return {
      status: "down",
      message: error.message,
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<Partial<ServiceHealth>> {
  const start = performance.now();
  try {
    const isConnected = await testConnection();
    const latency = Math.round(performance.now() - start);

    if (!isConnected) {
      return {
        status: "down",
        latency,
        message: "Database connection failed",
      };
    }

    // Get connection pool stats
    const poolStats = await sql`
      SELECT
        numbackends as active_connections,
        xact_commit as transactions,
        blks_hit as cache_hits,
        blks_read as disk_reads
      FROM pg_stat_database
      WHERE datname = current_database()
    `;

    return {
      status: latency > 100 ? "degraded" : "healthy",
      latency,
      message: latency > 100 ? "High latency detected" : "Database connected",
      metrics: poolStats[0] || {},
    };
  } catch (error: any) {
    return {
      status: "down",
      message: error.message,
    };
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth(): Promise<Partial<ServiceHealth>> {
  const start = performance.now();
  try {
    const stats = getCacheStats();
    const latency = Math.round(performance.now() - start);

    return {
      status: stats.redisConnected ? "healthy" : (stats.usingFallback ? "degraded" : "down"),
      latency,
      message: stats.redisConnected
        ? "Redis connected"
        : (stats.usingFallback ? "Using in-memory fallback" : "Cache unavailable"),
      metrics: stats,
    };
  } catch (error: any) {
    return {
      status: "down",
      message: error.message,
    };
  }
}

/**
 * Check WebSocket health
 */
async function checkWebSocketHealth(): Promise<Partial<ServiceHealth>> {
  try {
    const stats = getWSStats();
    return {
      status: "healthy",
      message: `${stats.total} active connections`,
      metrics: stats,
    };
  } catch (error: any) {
    return {
      status: "down",
      message: error.message,
    };
  }
}

/**
 * Check webhook service health
 */
async function checkWebhookHealth(): Promise<Partial<ServiceHealth>> {
  const start = performance.now();
  try {
    const stats = await sql`
      SELECT
        COUNT(*) as total_webhooks,
        COUNT(*) FILTER (WHERE is_active = true) as active_webhooks,
        (SELECT COUNT(*) FROM webhook_logs WHERE created_at > NOW() - INTERVAL '1 hour') as recent_deliveries,
        (SELECT COUNT(*) FROM webhook_logs WHERE response_status >= 200 AND response_status < 300 AND created_at > NOW() - INTERVAL '1 hour') as successful_deliveries
      FROM webhooks
    `;
    const latency = Math.round(performance.now() - start);

    const total = parseInt(stats[0].recent_deliveries) || 0;
    const successful = parseInt(stats[0].successful_deliveries) || 0;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;

    return {
      status: successRate >= 95 ? "healthy" : (successRate >= 80 ? "degraded" : "down"),
      latency,
      message: `${successRate}% delivery success rate`,
      metrics: {
        totalWebhooks: parseInt(stats[0].total_webhooks) || 0,
        activeWebhooks: parseInt(stats[0].active_webhooks) || 0,
        recentDeliveries: total,
        successfulDeliveries: successful,
        successRate: `${successRate}%`,
      },
    };
  } catch (error: any) {
    return {
      status: "unknown",
      message: error.message,
    };
  }
}

/**
 * Check ML service health
 */
async function checkMLHealth(): Promise<Partial<ServiceHealth>> {
  const start = performance.now();
  try {
    const stats = await sql`
      SELECT
        COUNT(*) as total_samples,
        COUNT(DISTINCT event_type_code) as event_types,
        AVG(final_price) as avg_price,
        MAX(created_at) as last_sample
      FROM ml_training_data
    `;
    const latency = Math.round(performance.now() - start);

    const sampleCount = parseInt(stats[0].total_samples) || 0;
    const isHealthy = sampleCount >= 100; // Need at least 100 samples for decent predictions

    return {
      status: isHealthy ? "healthy" : "degraded",
      latency,
      message: isHealthy ? `${sampleCount} training samples` : "Insufficient training data",
      metrics: {
        totalSamples: sampleCount,
        eventTypes: parseInt(stats[0].event_types) || 0,
        avgPrice: Math.round(parseFloat(stats[0].avg_price) || 0),
        lastSample: stats[0].last_sample,
      },
    };
  } catch (error: any) {
    return {
      status: "unknown",
      message: error.message,
    };
  }
}

/**
 * Check backup service health (placeholder for future)
 */
async function checkBackupHealth(): Promise<Partial<ServiceHealth>> {
  // This will be implemented when backup service is added
  return {
    status: "unknown",
    message: "Backup service not configured",
    metrics: {
      lastBackup: null,
      nextScheduled: null,
      backupSize: null,
    },
  };
}

/**
 * Placeholder for future LDAP/AD integration
 */
async function checkLDAPHealth(): Promise<Partial<ServiceHealth>> {
  return {
    status: "unknown",
    message: "AD/LDAP integration pending",
  };
}

/**
 * Placeholder for future API Gateway
 */
async function checkGatewayHealth(): Promise<Partial<ServiceHealth>> {
  return {
    status: "unknown",
    message: "API Gateway integration pending",
  };
}

/**
 * Placeholder for future SIEM integration
 */
async function checkSIEMHealth(): Promise<Partial<ServiceHealth>> {
  return {
    status: "unknown",
    message: "SIEM integration pending",
  };
}

// ============================================
// SERVICE REGISTRY
// ============================================

// Register all services
serviceRegistry.set("api", { name: "API Server", enabled: true, checkFn: checkAPIHealth });
serviceRegistry.set("database", { name: "PostgreSQL", enabled: true, checkFn: checkDatabaseHealth });
serviceRegistry.set("cache", { name: "Redis Cache", enabled: true, checkFn: checkCacheHealth });
serviceRegistry.set("websocket", { name: "WebSocket", enabled: true, checkFn: checkWebSocketHealth });
serviceRegistry.set("webhooks", { name: "Webhooks", enabled: true, checkFn: checkWebhookHealth });
serviceRegistry.set("ml", { name: "ML Service", enabled: true, checkFn: checkMLHealth });
serviceRegistry.set("backup", { name: "Backup Service", enabled: false, checkFn: checkBackupHealth });
serviceRegistry.set("ldap", { name: "AD/LDAP", enabled: false, checkFn: checkLDAPHealth });
serviceRegistry.set("gateway", { name: "API Gateway", enabled: false, checkFn: checkGatewayHealth });
serviceRegistry.set("siem", { name: "SIEM", enabled: false, checkFn: checkSIEMHealth });

// ============================================
// MAIN MONITORING FUNCTIONS
// ============================================

/**
 * Get health of a specific service
 */
export async function getServiceHealth(type: ServiceType): Promise<ServiceHealth> {
  const service = serviceRegistry.get(type);
  if (!service) {
    return {
      name: type,
      type,
      status: "unknown",
      message: "Service not registered",
      lastCheck: new Date().toISOString(),
      enabled: false,
    };
  }

  const health = await service.checkFn();
  return {
    name: service.name,
    type,
    status: health.status || "unknown",
    latency: health.latency,
    message: health.message,
    lastCheck: new Date().toISOString(),
    metrics: health.metrics,
    enabled: service.enabled,
  };
}

/**
 * Get health of all services
 */
export async function getAllServicesHealth(): Promise<ServiceHealth[]> {
  const results: ServiceHealth[] = [];

  for (const [type, service] of serviceRegistry) {
    const health = await service.checkFn();
    results.push({
      name: service.name,
      type,
      status: health.status || "unknown",
      latency: health.latency,
      message: health.message,
      lastCheck: new Date().toISOString(),
      metrics: health.metrics,
      enabled: service.enabled,
    });
  }

  return results;
}

/**
 * Get only enabled services health
 */
export async function getEnabledServicesHealth(): Promise<ServiceHealth[]> {
  const results: ServiceHealth[] = [];

  for (const [type, service] of serviceRegistry) {
    if (service.enabled) {
      const health = await service.checkFn();
      results.push({
        name: service.name,
        type,
        status: health.status || "unknown",
        latency: health.latency,
        message: health.message,
        lastCheck: new Date().toISOString(),
        metrics: health.metrics,
        enabled: service.enabled,
      });
    }
  }

  return results;
}

/**
 * Get system-wide metrics
 */
export function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();

  return {
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    requestsPerMinute: getRequestsPerMinute(),
    errorRate: getErrorRate(),
  };
}

/**
 * Get overall system status
 */
export async function getOverallStatus(): Promise<{
  status: ServiceStatus;
  services: ServiceHealth[];
  metrics: SystemMetrics;
  summary: { healthy: number; degraded: number; down: number; unknown: number };
}> {
  const services = await getEnabledServicesHealth();
  const metrics = getSystemMetrics();

  const summary = {
    healthy: services.filter(s => s.status === "healthy").length,
    degraded: services.filter(s => s.status === "degraded").length,
    down: services.filter(s => s.status === "down").length,
    unknown: services.filter(s => s.status === "unknown").length,
  };

  // Overall status is the worst status
  let overallStatus: ServiceStatus = "healthy";
  if (summary.down > 0) overallStatus = "down";
  else if (summary.degraded > 0) overallStatus = "degraded";
  else if (summary.unknown > 0 && summary.healthy === 0) overallStatus = "unknown";

  return {
    status: overallStatus,
    services,
    metrics,
    summary,
  };
}

// ============================================
// REQUEST TRACKING
// ============================================

/**
 * Track incoming request
 */
export function trackRequest(isError = false) {
  const now = Date.now();
  requestMetrics.totalRequests++;
  requestMetrics.lastMinuteRequests.push(now);

  if (isError) {
    requestMetrics.errorCount++;
    requestMetrics.lastMinuteErrors.push(now);
  }

  // Clean up old entries (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  requestMetrics.lastMinuteRequests = requestMetrics.lastMinuteRequests.filter(t => t > oneMinuteAgo);
  requestMetrics.lastMinuteErrors = requestMetrics.lastMinuteErrors.filter(t => t > oneMinuteAgo);
}

function getRequestsPerMinute(): number {
  return requestMetrics.lastMinuteRequests.length;
}

function getErrorRate(): number {
  const rpm = getRequestsPerMinute();
  if (rpm === 0) return 0;
  return Math.round((requestMetrics.lastMinuteErrors.length / rpm) * 100);
}

// ============================================
// PERIODIC HEALTH BROADCAST
// ============================================

let healthBroadcastInterval: Timer | null = null;

/**
 * Start periodic health broadcasts to admin dashboard
 */
export function startHealthBroadcast(intervalMs = 5000) {
  if (healthBroadcastInterval) {
    clearInterval(healthBroadcastInterval);
  }

  healthBroadcastInterval = setInterval(async () => {
    try {
      const status = await getOverallStatus();
      broadcastToChannel("services", "system.health", status);

      // Send alerts if any service is down
      for (const service of status.services) {
        if (service.status === "down") {
          broadcastToChannel("alerts", "alert", {
            level: "error",
            service: service.name,
            message: `${service.name} is down: ${service.message}`,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error("[Monitor] Health broadcast failed:", error);
    }
  }, intervalMs);

  console.log(`[Monitor] Health broadcast started (every ${intervalMs}ms)`);
}

/**
 * Stop health broadcasts
 */
export function stopHealthBroadcast() {
  if (healthBroadcastInterval) {
    clearInterval(healthBroadcastInterval);
    healthBroadcastInterval = null;
    console.log("[Monitor] Health broadcast stopped");
  }
}

// ============================================
// SERVICE MANAGEMENT
// ============================================

/**
 * Enable a service in the registry
 */
export function enableService(type: ServiceType) {
  const service = serviceRegistry.get(type);
  if (service) {
    service.enabled = true;
    console.log(`[Monitor] Enabled service: ${service.name}`);
  }
}

/**
 * Disable a service in the registry
 */
export function disableService(type: ServiceType) {
  const service = serviceRegistry.get(type);
  if (service) {
    service.enabled = false;
    console.log(`[Monitor] Disabled service: ${service.name}`);
  }
}

/**
 * Register a custom service
 */
export function registerService(
  type: ServiceType,
  name: string,
  checkFn: () => Promise<Partial<ServiceHealth>>,
  enabled = true
) {
  serviceRegistry.set(type, { name, enabled, checkFn });
  console.log(`[Monitor] Registered service: ${name}`);
}

export {
  ServiceStatus,
  ServiceType,
  ServiceHealth,
  SystemMetrics,
  trackRequest,
};
