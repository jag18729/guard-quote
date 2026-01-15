/**
 * Services Index - Central export for all services
 * Import from here for clean imports
 */

// WebSocket Service
export {
  handleOpen as wsHandleOpen,
  handleMessage as wsHandleMessage,
  handleClose as wsHandleClose,
  broadcastToChannel,
  broadcastToAdmins,
  sendToClient,
  broadcastToType,
  getWSStats,
  cleanupStaleConnections,
  type WSClient,
  type ConnectionType,
  type SubscriptionChannel,
} from "./websocket";

// Cache Service
export {
  get as cacheGet,
  set as cacheSet,
  del as cacheDel,
  invalidate as cacheInvalidate,
  getCacheStats,
  clearAll as cacheClearAll,
  checkRateLimit,
  cacheMLPrediction,
  getCachedMLPrediction,
  cacheEventTypes,
  getCachedEventTypes,
  cacheLocations,
  getCachedLocations,
  cacheDashboardStats,
  getCachedDashboardStats,
  cacheSession,
  getCachedSession,
  invalidateSession,
  initCache,
} from "./cache";

// Monitoring Service
export {
  getServiceHealth,
  getAllServicesHealth,
  getEnabledServicesHealth,
  getSystemMetrics,
  getOverallStatus,
  trackRequest,
  startHealthBroadcast,
  stopHealthBroadcast,
  enableService,
  disableService,
  registerService,
  type ServiceStatus,
  type ServiceType,
  type ServiceHealth,
  type SystemMetrics,
} from "./monitor";

// Backup Service
export {
  createFullBackup,
  createSchemaBackup,
  createDataExport,
  createRemoteBackup,
  restoreFromBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
  getBackupHistory,
  startScheduledBackups,
  stopScheduledBackups,
  backupConfig,
  type BackupRecord,
} from "./backup";

// Logging Service
export {
  logger,
  requestLogger,
  getRecentLogs,
  getLogStats,
  clearLogs,
  apiLogger,
  dbLogger,
  wsLogger,
  mlLogger,
  backupLogger,
  loggingConfig,
  type LogLevel,
  type LogEntry,
} from "./logging";

// Infrastructure Service
export {
  checkAllNodes,
  getInfrastructureOverview,
  getNodeStatus,
  addNode,
  removeNode,
  updateNode,
  startMonitoring as startInfraMonitoring,
  stopMonitoring as stopInfraMonitoring,
  scanPorts,
  discoverNetwork,
  infrastructure,
  futureInfrastructure,
  type NodeType,
  type NodeStatus,
  type InfraNode,
} from "./infrastructure";

// ============================================
// SERVICE INITIALIZATION
// ============================================

/**
 * Initialize all services
 */
export async function initializeServices(options: {
  cache?: boolean;
  healthBroadcast?: boolean;
  scheduledBackups?: boolean;
  infraMonitoring?: boolean;
} = {}) {
  const {
    cache = true,
    healthBroadcast = true,
    scheduledBackups = false,
    infraMonitoring = true,
  } = options;

  console.log("[Services] Initializing...");

  // Initialize cache
  if (cache) {
    const { initCache } = await import("./cache");
    await initCache();
  }

  // Start health broadcasts
  if (healthBroadcast) {
    const { startHealthBroadcast } = await import("./monitor");
    startHealthBroadcast(5000); // Every 5 seconds
  }

  // Start scheduled backups
  if (scheduledBackups) {
    const { startScheduledBackups } = await import("./backup");
    startScheduledBackups();
  }

  // Start infrastructure monitoring
  if (infraMonitoring) {
    const { startMonitoring } = await import("./infrastructure");
    startMonitoring(30000); // Every 30 seconds
  }

  console.log("[Services] Initialization complete");
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices() {
  console.log("[Services] Shutting down...");

  const { stopHealthBroadcast } = await import("./monitor");
  const { stopScheduledBackups } = await import("./backup");
  const { stopMonitoring } = await import("./infrastructure");

  stopHealthBroadcast();
  stopScheduledBackups();
  stopMonitoring();

  console.log("[Services] Shutdown complete");
}
