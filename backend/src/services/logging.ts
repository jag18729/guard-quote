/**
 * Logging Service - Centralized logging with syslog support
 * Supports local logging, syslog, and remote log aggregation
 */
import { broadcastToChannel } from "./websocket";

// Log levels
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

// Syslog severity mapping (RFC 5424)
const SYSLOG_SEVERITY: Record<LogLevel, number> = {
  debug: 7,
  info: 6,
  warn: 4,
  error: 3,
  fatal: 0,
};

// Syslog facility
const SYSLOG_FACILITY = 16; // local0

// Configuration
const config = {
  level: (process.env.LOG_LEVEL || "info") as LogLevel,
  syslogEnabled: process.env.SYSLOG_ENABLED === "true",
  syslogHost: process.env.SYSLOG_HOST || "localhost",
  syslogPort: parseInt(process.env.SYSLOG_PORT || "514", 10),
  syslogProtocol: process.env.SYSLOG_PROTOCOL || "udp", // udp, tcp
  appName: process.env.APP_NAME || "guardquote",
  remoteLogUrl: process.env.REMOTE_LOG_URL, // For external log aggregation
  maxBufferSize: 1000, // In-memory log buffer
};

// Log buffer for dashboard viewing
interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  meta?: Record<string, any>;
  traceId?: string;
  spanId?: string;
}

const logBuffer: LogEntry[] = [];
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Syslog UDP socket (lazy init)
const _syslogSocket: any = null;

// ============================================
// CORE LOGGING FUNCTIONS
// ============================================

/**
 * Main log function
 */
function log(
  level: LogLevel,
  service: string,
  message: string,
  meta?: Record<string, any>,
  traceId?: string
) {
  // Check if level is enabled
  if (levelPriority[level] < levelPriority[config.level]) {
    return;
  }

  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date(),
    level,
    service,
    message,
    meta,
    traceId,
  };

  // Add to buffer
  logBuffer.unshift(entry);
  if (logBuffer.length > config.maxBufferSize) {
    logBuffer.pop();
  }

  // Console output with colors
  const coloredOutput = formatConsoleLog(entry);
  if (level === "error" || level === "fatal") {
    console.error(coloredOutput);
  } else if (level === "warn") {
    console.warn(coloredOutput);
  } else {
    console.log(coloredOutput);
  }

  // Send to syslog
  if (config.syslogEnabled) {
    sendToSyslog(entry);
  }

  // Send to remote log aggregator
  if (config.remoteLogUrl) {
    sendToRemoteLog(entry);
  }

  // Broadcast errors/warnings to admin dashboard
  if (level === "error" || level === "fatal") {
    broadcastToChannel("alerts", "log.error", entry);
  }
}

/**
 * Format log for console with ANSI colors
 */
function formatConsoleLog(entry: LogEntry): string {
  const colors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    fatal: "\x1b[35m", // Magenta
  };
  const reset = "\x1b[0m";

  const timestamp = entry.timestamp.toISOString();
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const serviceStr = `[${entry.service}]`.padEnd(15);

  let output = `${colors[entry.level]}${timestamp} ${levelStr}${reset} ${serviceStr} ${entry.message}`;

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    output += ` ${JSON.stringify(entry.meta)}`;
  }

  if (entry.traceId) {
    output += ` trace=${entry.traceId}`;
  }

  return output;
}

// ============================================
// SYSLOG INTEGRATION (RFC 5424)
// ============================================

/**
 * Send log entry to syslog server
 */
async function sendToSyslog(entry: LogEntry) {
  try {
    const priority = SYSLOG_FACILITY * 8 + SYSLOG_SEVERITY[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const hostname = process.env.HOSTNAME || "localhost";

    // RFC 5424 format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
    const syslogMessage = `<${priority}>1 ${timestamp} ${hostname} ${config.appName} ${process.pid} - - ${entry.service}: ${entry.message}`;

    if (config.syslogProtocol === "udp") {
      await sendUDPSyslog(syslogMessage);
    } else {
      await sendTCPSyslog(syslogMessage);
    }
  } catch (error) {
    console.error("[Logging] Syslog send failed:", error);
  }
}

/**
 * Send via UDP
 */
async function sendUDPSyslog(message: string) {
  // Use Bun's native UDP support
  const socket = Bun.udpSocket({
    socket: {
      data: () => {}, // Not expecting responses
    },
  });

  try {
    socket.send(Buffer.from(message), config.syslogPort, config.syslogHost);
  } finally {
    socket.close();
  }
}

/**
 * Send via TCP
 */
async function sendTCPSyslog(message: string) {
  try {
    const socket = await Bun.connect({
      hostname: config.syslogHost,
      port: config.syslogPort,
      socket: {
        data: () => {},
        error: (_socket, error) => {
          console.error("[Logging] TCP syslog error:", error);
        },
      },
    });

    socket.write(`${message}\n`);
    socket.end();
  } catch (error) {
    console.error("[Logging] TCP syslog connection failed:", error);
  }
}

// ============================================
// REMOTE LOG AGGREGATION
// ============================================

/**
 * Send to remote log service (Loki, Elasticsearch, etc.)
 */
async function sendToRemoteLog(entry: LogEntry) {
  if (!config.remoteLogUrl) return;

  try {
    await fetch(config.remoteLogUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...entry,
        app: config.appName,
        host: process.env.HOSTNAME || "localhost",
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_error) {
    // Don't log errors about logging to avoid infinite loops
  }
}

// ============================================
// CONVENIENCE METHODS
// ============================================

export const logger = {
  debug: (service: string, message: string, meta?: Record<string, any>) =>
    log("debug", service, message, meta),

  info: (service: string, message: string, meta?: Record<string, any>) =>
    log("info", service, message, meta),

  warn: (service: string, message: string, meta?: Record<string, any>) =>
    log("warn", service, message, meta),

  error: (service: string, message: string, meta?: Record<string, any>) =>
    log("error", service, message, meta),

  fatal: (service: string, message: string, meta?: Record<string, any>) =>
    log("fatal", service, message, meta),

  // With trace context
  withTrace: (traceId: string) => ({
    debug: (service: string, message: string, meta?: Record<string, any>) =>
      log("debug", service, message, meta, traceId),
    info: (service: string, message: string, meta?: Record<string, any>) =>
      log("info", service, message, meta, traceId),
    warn: (service: string, message: string, meta?: Record<string, any>) =>
      log("warn", service, message, meta, traceId),
    error: (service: string, message: string, meta?: Record<string, any>) =>
      log("error", service, message, meta, traceId),
    fatal: (service: string, message: string, meta?: Record<string, any>) =>
      log("fatal", service, message, meta, traceId),
  }),
};

// ============================================
// HTTP REQUEST LOGGING MIDDLEWARE
// ============================================

/**
 * Create request logging middleware for Hono
 */
export function requestLogger() {
  return async (c: any, next: () => Promise<void>) => {
    const start = performance.now();
    const traceId = c.req.header("x-trace-id") || generateTraceId();

    // Add trace ID to context
    c.set("traceId", traceId);

    await next();

    const duration = Math.round(performance.now() - start);
    const status = c.res.status;
    const method = c.req.method;
    const path = c.req.path;

    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    log(
      level,
      "HTTP",
      `${method} ${path} ${status} ${duration}ms`,
      {
        method,
        path,
        status,
        duration,
        userAgent: c.req.header("user-agent"),
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      },
      traceId
    );
  };
}

/**
 * Generate trace ID
 */
function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

// ============================================
// LOG RETRIEVAL FOR DASHBOARD
// ============================================

/**
 * Get recent logs
 */
export function getRecentLogs(
  options: { limit?: number; level?: LogLevel; service?: string; since?: Date } = {}
): LogEntry[] {
  let logs = [...logBuffer];

  // Filter by level
  if (options.level) {
    const minPriority = levelPriority[options.level];
    logs = logs.filter((l) => levelPriority[l.level] >= minPriority);
  }

  // Filter by service
  if (options.service) {
    logs = logs.filter((l) => l.service === options.service);
  }

  // Filter by time
  if (options.since) {
    logs = logs.filter((l) => l.timestamp >= options.since);
  }

  // Limit results
  return logs.slice(0, options.limit || 100);
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number;
  byLevel: Record<LogLevel, number>;
  byService: Record<string, number>;
  errorsLast5Min: number;
} {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const byLevel = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
  const byService: Record<string, number> = {};
  let errorsLast5Min = 0;

  for (const entry of logBuffer) {
    byLevel[entry.level]++;
    byService[entry.service] = (byService[entry.service] || 0) + 1;

    if ((entry.level === "error" || entry.level === "fatal") && entry.timestamp >= fiveMinutesAgo) {
      errorsLast5Min++;
    }
  }

  return {
    total: logBuffer.length,
    byLevel,
    byService,
    errorsLast5Min,
  };
}

/**
 * Clear log buffer
 */
export function clearLogs() {
  logBuffer.length = 0;
  logger.info("Logging", "Log buffer cleared");
}

// ============================================
// SERVICE-SPECIFIC LOGGERS
// ============================================

export const apiLogger = {
  debug: (msg: string, meta?: Record<string, any>) => logger.debug("API", msg, meta),
  info: (msg: string, meta?: Record<string, any>) => logger.info("API", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logger.warn("API", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logger.error("API", msg, meta),
};

export const dbLogger = {
  debug: (msg: string, meta?: Record<string, any>) => logger.debug("Database", msg, meta),
  info: (msg: string, meta?: Record<string, any>) => logger.info("Database", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logger.warn("Database", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logger.error("Database", msg, meta),
};

export const wsLogger = {
  debug: (msg: string, meta?: Record<string, any>) => logger.debug("WebSocket", msg, meta),
  info: (msg: string, meta?: Record<string, any>) => logger.info("WebSocket", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logger.warn("WebSocket", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logger.error("WebSocket", msg, meta),
};

export const mlLogger = {
  debug: (msg: string, meta?: Record<string, any>) => logger.debug("ML", msg, meta),
  info: (msg: string, meta?: Record<string, any>) => logger.info("ML", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logger.warn("ML", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logger.error("ML", msg, meta),
};

export const backupLogger = {
  debug: (msg: string, meta?: Record<string, any>) => logger.debug("Backup", msg, meta),
  info: (msg: string, meta?: Record<string, any>) => logger.info("Backup", msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logger.warn("Backup", msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logger.error("Backup", msg, meta),
};

export { type LogLevel, type LogEntry, config as loggingConfig };
