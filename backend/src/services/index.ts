/**
 * Services Index - Central export for all services
 * 
 * Infrastructure management removed — use Grafana/OpenClaw instead:
 *   - Grafana: https://grafana.vandine.us
 *   - Prometheus: Metrics collection
 *   - Loki: Log aggregation
 *   - OpenClaw: Service control
 */

// Auth Service
export {
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
  login,
  refreshAccessToken,
  getUserFromToken,
  createAdminUser,
  type JWTPayload,
  type AuthResult,
} from "./auth";

// Cache Service
export {
  cacheDashboardStats,
  cacheEventTypes,
  cacheLocations,
  cacheMLPrediction,
  cacheSession,
  checkRateLimit,
  clearAll as cacheClearAll,
  del as cacheDel,
  get as cacheGet,
  getCachedDashboardStats,
  getCachedEventTypes,
  getCachedLocations,
  getCachedMLPrediction,
  getCachedSession,
  getCacheStats,
  initCache,
  invalidate as cacheInvalidate,
  invalidateSession,
  set as cacheSet,
} from "./cache";

// Demo Service
export {
  DEMO_MODE,
  DEMO_STATS,
  DEMO_QUOTES,
  DEMO_CLIENTS,
  DEMO_ML_MODEL,
  DEMO_ADMIN_USER,
  DEMO_USERS,
  DEMO_EVENT_TYPES,
  DEMO_LOCATIONS,
  calculateDemoQuote,
} from "./demo";

// ML Client Service
export {
  checkMLHealth,
  generateQuoteML,
  getMLClientStatus,
  initMLClient,
  type MLQuoteRequest,
  type MLQuoteResponse,
} from "./ml-client";

// OAuth Services
export { getAuthorizationUrl, exchangeCode, getUserInfo } from "./oauth";
export { getConfiguredProviders, isProviderConfigured, getProvider } from "./oauth-config";

// Quote Calculator Service
export {
  calculateQuote,
  type QuoteInput,
  type QuoteResult,
} from "./quote-calculator";

// WebSocket Service
export {
  broadcastToAdmins,
  broadcastToChannel,
  broadcastToType,
  type ConnectionType,
  cleanupStaleConnections,
  getWSStats,
  handleClose as wsHandleClose,
  handleMessage as wsHandleMessage,
  handleOpen as wsHandleOpen,
  type SubscriptionChannel,
  sendToClient,
  type WSClient,
} from "./websocket";

// ============================================
// SERVICE INITIALIZATION
// ============================================

/**
 * Initialize core services (cache only now — monitoring moved to Grafana/Prometheus)
 */
export async function initializeServices(
  options: {
    cache?: boolean;
  } = {}
) {
  const { cache = true } = options;

  console.log("[Services] Initializing...");

  if (cache) {
    const { initCache } = await import("./cache");
    await initCache();
  }

  console.log("[Services] Initialization complete");
}

/**
 * Shutdown services gracefully
 */
export async function shutdownServices() {
  console.log("[Services] Shutting down...");
  // Cache cleanup handled by Redis connection pool
  console.log("[Services] Shutdown complete");
}
