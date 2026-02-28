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
    scheduledBackups?: boolean;
  } = {}
) {
  const {
    cache = true,
    scheduledBackups = false,
  } = options;

  console.log("[Services] Initializing...");

  // Initialize cache
  if (cache) {
    const { initCache } = await import("./cache");
    await initCache();
  }

  // Start scheduled backups
  if (scheduledBackups) {
    const { startScheduledBackups } = await import("./backup");
    startScheduledBackups();
  }

  console.log("[Services] Initialization complete");
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices() {
  console.log("[Services] Shutting down...");

  const { stopScheduledBackups } = await import("./backup");
  stopScheduledBackups();

  console.log("[Services] Shutdown complete");
}
