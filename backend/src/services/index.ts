/**
 * Services Index - Central export for all services
 * Import from here for clean imports
 */

// Backup Service
export {
  type BackupRecord,
  backupConfig,
  cleanupOldBackups,
  createDataExport,
  createFullBackup,
  createRemoteBackup,
  createSchemaBackup,
  getBackupHistory,
  getBackupStats,
  listBackups,
  restoreFromBackup,
  startScheduledBackups,
  stopScheduledBackups,
} from "./backup";

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
// Infrastructure Service
export {
  addNode,
  checkAllNodes,
  discoverNetwork,
  futureInfrastructure,
  getInfrastructureOverview,
  getNodeStatus,
  type InfraNode,
  infrastructure,
  type NodeStatus,
  type NodeType,
  removeNode,
  scanPorts,
  startMonitoring as startInfraMonitoring,
  stopMonitoring as stopInfraMonitoring,
  updateNode,
} from "./infrastructure";
// Logging Service
export {
  apiLogger,
  backupLogger,
  clearLogs,
  dbLogger,
  getLogStats,
  getRecentLogs,
  type LogEntry,
  type LogLevel,
  logger,
  loggingConfig,
  mlLogger,
  requestLogger,
  wsLogger,
} from "./logging";
// Monitoring Service
export {
  disableService,
  enableService,
  getAllServicesHealth,
  getEnabledServicesHealth,
  getOverallStatus,
  getServiceHealth,
  getSystemMetrics,
  registerService,
  type ServiceHealth,
  type ServiceStatus,
  type ServiceType,
  type SystemMetrics,
  startHealthBroadcast,
  stopHealthBroadcast,
  trackRequest,
} from "./monitor";
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
 * Initialize all services
 */
export async function initializeServices(
  options: {
    cache?: boolean;
    healthBroadcast?: boolean;
    scheduledBackups?: boolean;
    infraMonitoring?: boolean;
  } = {}
) {
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
