/**
 * Backup Service - Database backup and restore operations
 * Supports local and remote backup destinations
 */
import { sql } from "../db/connection";
import { broadcastToChannel } from "./websocket";

// Backup configuration
const config = {
  enabled: process.env.BACKUP_ENABLED === "true",
  dbHost: process.env.DB_HOST || "192.168.2.70",
  dbName: process.env.DB_NAME || "guardquote",
  dbUser: process.env.DB_USER || "guardquote",
  dbPassword: process.env.DB_PASSWORD || "WPU8bj3nbwFyZFEtHZQz",
  backupDir: process.env.BACKUP_DIR || "/tmp/guardquote-backups",
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "7"),
  scheduleHour: parseInt(process.env.BACKUP_SCHEDULE_HOUR || "2"), // 2 AM
};

// Backup status tracking
interface BackupRecord {
  id: string;
  filename: string;
  size: number;
  status: "pending" | "running" | "completed" | "failed";
  type: "full" | "incremental" | "schema" | "data";
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  destination: "local" | "s3" | "gcs" | "ssh";
}

const backupHistory: BackupRecord[] = [];
let scheduledBackupTimer: Timer | null = null;

// ============================================
// BACKUP OPERATIONS
// ============================================

/**
 * Create a full database backup using pg_dump
 */
export async function createFullBackup(): Promise<BackupRecord> {
  const id = `backup_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `guardquote_full_${timestamp}.sql`;

  const record: BackupRecord = {
    id,
    filename,
    size: 0,
    status: "pending",
    type: "full",
    startedAt: new Date(),
    destination: "local",
  };

  backupHistory.unshift(record);
  broadcastToChannel("services", "backup.started", { id, type: "full" });

  try {
    record.status = "running";

    // Use Bun's shell to run pg_dump
    const proc = Bun.spawn([
      "pg_dump",
      "-h", config.dbHost,
      "-U", config.dbUser,
      "-d", config.dbName,
      "-F", "c", // Custom format (compressed)
      "-f", `${config.backupDir}/${filename}`,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.dbPassword,
      },
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`pg_dump exited with code ${exitCode}`);
    }

    // Get file size
    const file = Bun.file(`${config.backupDir}/${filename}`);
    record.size = file.size;
    record.status = "completed";
    record.completedAt = new Date();

    broadcastToChannel("services", "backup.completed", {
      id,
      filename,
      size: record.size,
      duration: record.completedAt.getTime() - record.startedAt.getTime(),
    });

    console.log(`[Backup] Full backup completed: ${filename} (${formatBytes(record.size)})`);
    return record;
  } catch (error: any) {
    record.status = "failed";
    record.error = error.message;
    record.completedAt = new Date();

    broadcastToChannel("alerts", "alert", {
      level: "error",
      service: "Backup",
      message: `Backup failed: ${error.message}`,
      timestamp: Date.now(),
    });

    console.error(`[Backup] Full backup failed:`, error);
    return record;
  }
}

/**
 * Create a schema-only backup
 */
export async function createSchemaBackup(): Promise<BackupRecord> {
  const id = `backup_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `guardquote_schema_${timestamp}.sql`;

  const record: BackupRecord = {
    id,
    filename,
    size: 0,
    status: "pending",
    type: "schema",
    startedAt: new Date(),
    destination: "local",
  };

  backupHistory.unshift(record);

  try {
    record.status = "running";

    const proc = Bun.spawn([
      "pg_dump",
      "-h", config.dbHost,
      "-U", config.dbUser,
      "-d", config.dbName,
      "-s", // Schema only
      "-f", `${config.backupDir}/${filename}`,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.dbPassword,
      },
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`pg_dump exited with code ${exitCode}`);
    }

    const file = Bun.file(`${config.backupDir}/${filename}`);
    record.size = file.size;
    record.status = "completed";
    record.completedAt = new Date();

    console.log(`[Backup] Schema backup completed: ${filename}`);
    return record;
  } catch (error: any) {
    record.status = "failed";
    record.error = error.message;
    record.completedAt = new Date();
    console.error(`[Backup] Schema backup failed:`, error);
    return record;
  }
}

/**
 * Create a data-only backup (training data export)
 */
export async function createDataExport(tableName?: string): Promise<BackupRecord> {
  const id = `export_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const table = tableName || "ml_training_data";
  const filename = `guardquote_${table}_${timestamp}.csv`;

  const record: BackupRecord = {
    id,
    filename,
    size: 0,
    status: "pending",
    type: "data",
    startedAt: new Date(),
    destination: "local",
  };

  backupHistory.unshift(record);

  try {
    record.status = "running";

    // Use COPY command for CSV export
    const copyCmd = `\\COPY ${table} TO '${config.backupDir}/${filename}' WITH CSV HEADER`;

    const proc = Bun.spawn([
      "psql",
      "-h", config.dbHost,
      "-U", config.dbUser,
      "-d", config.dbName,
      "-c", copyCmd,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.dbPassword,
      },
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`psql COPY exited with code ${exitCode}`);
    }

    const file = Bun.file(`${config.backupDir}/${filename}`);
    record.size = file.size;
    record.status = "completed";
    record.completedAt = new Date();

    console.log(`[Backup] Data export completed: ${filename}`);
    return record;
  } catch (error: any) {
    record.status = "failed";
    record.error = error.message;
    record.completedAt = new Date();
    console.error(`[Backup] Data export failed:`, error);
    return record;
  }
}

/**
 * Create backup via SSH to Raspberry Pi
 */
export async function createRemoteBackup(): Promise<BackupRecord> {
  const id = `backup_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `guardquote_full_${timestamp}.sql`;

  const record: BackupRecord = {
    id,
    filename,
    size: 0,
    status: "pending",
    type: "full",
    startedAt: new Date(),
    destination: "ssh",
  };

  backupHistory.unshift(record);
  broadcastToChannel("services", "backup.started", { id, type: "full", destination: "ssh" });

  try {
    record.status = "running";

    // SSH to Pi and run pg_dump locally
    const sshCmd = `PGPASSWORD='${config.dbPassword}' pg_dump -h localhost -U ${config.dbUser} ${config.dbName} -F c -f /tmp/${filename}`;

    const proc = Bun.spawn([
      "ssh",
      `johnmarston@${config.dbHost}`,
      sshCmd,
    ]);

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`SSH pg_dump exited with code ${exitCode}`);
    }

    // Copy backup file from Pi to local
    const scpProc = Bun.spawn([
      "scp",
      `johnmarston@${config.dbHost}:/tmp/${filename}`,
      `${config.backupDir}/${filename}`,
    ]);

    const scpExit = await scpProc.exited;
    if (scpExit !== 0) {
      throw new Error(`SCP failed with code ${scpExit}`);
    }

    const file = Bun.file(`${config.backupDir}/${filename}`);
    record.size = file.size;
    record.status = "completed";
    record.completedAt = new Date();

    broadcastToChannel("services", "backup.completed", {
      id,
      filename,
      size: record.size,
      duration: record.completedAt.getTime() - record.startedAt.getTime(),
    });

    console.log(`[Backup] Remote backup completed: ${filename} (${formatBytes(record.size)})`);
    return record;
  } catch (error: any) {
    record.status = "failed";
    record.error = error.message;
    record.completedAt = new Date();

    broadcastToChannel("alerts", "alert", {
      level: "error",
      service: "Backup",
      message: `Remote backup failed: ${error.message}`,
      timestamp: Date.now(),
    });

    console.error(`[Backup] Remote backup failed:`, error);
    return record;
  }
}

// ============================================
// RESTORE OPERATIONS
// ============================================

/**
 * Restore database from backup
 */
export async function restoreFromBackup(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    const backupPath = `${config.backupDir}/${filename}`;

    // Check if file exists
    const file = Bun.file(backupPath);
    if (!await file.exists()) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    broadcastToChannel("services", "restore.started", { filename });

    const proc = Bun.spawn([
      "pg_restore",
      "-h", config.dbHost,
      "-U", config.dbUser,
      "-d", config.dbName,
      "-c", // Clean (drop) database objects before recreating
      backupPath,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: config.dbPassword,
      },
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`pg_restore exited with code ${exitCode}`);
    }

    broadcastToChannel("services", "restore.completed", { filename });
    console.log(`[Backup] Restore completed from: ${filename}`);

    return { success: true, message: `Database restored from ${filename}` };
  } catch (error: any) {
    broadcastToChannel("alerts", "alert", {
      level: "error",
      service: "Backup",
      message: `Restore failed: ${error.message}`,
      timestamp: Date.now(),
    });

    console.error(`[Backup] Restore failed:`, error);
    return { success: false, message: error.message };
  }
}

// ============================================
// BACKUP MANAGEMENT
// ============================================

/**
 * Get list of available backups
 */
export async function listBackups(): Promise<{
  filename: string;
  size: number;
  created: Date;
  type: string;
}[]> {
  const backups: { filename: string; size: number; created: Date; type: string }[] = [];

  try {
    const glob = new Bun.Glob("guardquote_*.{sql,csv}");
    for await (const filename of glob.scan(config.backupDir)) {
      const file = Bun.file(`${config.backupDir}/${filename}`);
      const stat = await file.stat();

      let type = "unknown";
      if (filename.includes("_full_")) type = "full";
      else if (filename.includes("_schema_")) type = "schema";
      else if (filename.endsWith(".csv")) type = "data";

      backups.push({
        filename,
        size: file.size,
        created: new Date(stat.mtime),
        type,
      });
    }

    // Sort by date descending
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error) {
    console.error("[Backup] Failed to list backups:", error);
  }

  return backups;
}

/**
 * Delete old backups based on retention policy
 */
export async function cleanupOldBackups(): Promise<number> {
  let deleted = 0;
  const cutoff = Date.now() - (config.retentionDays * 24 * 60 * 60 * 1000);

  try {
    const backups = await listBackups();

    for (const backup of backups) {
      if (backup.created.getTime() < cutoff) {
        const file = Bun.file(`${config.backupDir}/${backup.filename}`);
        await file.unlink();
        deleted++;
        console.log(`[Backup] Deleted old backup: ${backup.filename}`);
      }
    }

    if (deleted > 0) {
      broadcastToChannel("services", "backup.cleanup", { deleted });
    }
  } catch (error) {
    console.error("[Backup] Cleanup failed:", error);
  }

  return deleted;
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  totalSize: number;
  lastBackup: BackupRecord | null;
  nextScheduled: Date | null;
  retentionDays: number;
  enabled: boolean;
}> {
  const backups = await listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  const lastBackup = backupHistory.find(b => b.status === "completed") || null;

  // Calculate next scheduled backup
  let nextScheduled: Date | null = null;
  if (config.enabled) {
    const now = new Date();
    nextScheduled = new Date(now);
    nextScheduled.setHours(config.scheduleHour, 0, 0, 0);
    if (nextScheduled <= now) {
      nextScheduled.setDate(nextScheduled.getDate() + 1);
    }
  }

  return {
    totalBackups: backups.length,
    totalSize,
    lastBackup,
    nextScheduled,
    retentionDays: config.retentionDays,
    enabled: config.enabled,
  };
}

/**
 * Get backup history
 */
export function getBackupHistory(): BackupRecord[] {
  return backupHistory.slice(0, 50); // Last 50 backups
}

// ============================================
// SCHEDULED BACKUPS
// ============================================

/**
 * Start scheduled daily backups
 */
export function startScheduledBackups() {
  if (!config.enabled) {
    console.log("[Backup] Scheduled backups disabled");
    return;
  }

  // Calculate ms until next backup time
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(config.scheduleHour, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilNext = nextRun.getTime() - now.getTime();

  console.log(`[Backup] Scheduled backup at ${config.scheduleHour}:00 (in ${Math.round(msUntilNext / 1000 / 60)} minutes)`);

  // Set initial timeout, then daily interval
  scheduledBackupTimer = setTimeout(async () => {
    await runScheduledBackup();

    // Set daily interval
    scheduledBackupTimer = setInterval(async () => {
      await runScheduledBackup();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilNext);
}

/**
 * Stop scheduled backups
 */
export function stopScheduledBackups() {
  if (scheduledBackupTimer) {
    clearTimeout(scheduledBackupTimer);
    clearInterval(scheduledBackupTimer);
    scheduledBackupTimer = null;
    console.log("[Backup] Scheduled backups stopped");
  }
}

/**
 * Run scheduled backup job
 */
async function runScheduledBackup() {
  console.log("[Backup] Running scheduled backup...");

  try {
    await createRemoteBackup();
    await cleanupOldBackups();
  } catch (error) {
    console.error("[Backup] Scheduled backup failed:", error);
  }
}

// ============================================
// UTILITIES
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
  try {
    await Bun.write(`${config.backupDir}/.keep`, "");
  } catch (error) {
    console.error("[Backup] Failed to create backup directory:", error);
  }
}

// Initialize
ensureBackupDir();

export {
  BackupRecord,
  config as backupConfig,
};
