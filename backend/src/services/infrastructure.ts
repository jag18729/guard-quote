/**
 * Infrastructure Service - Monitor and manage multi-server deployment
 * Tracks Pi cluster, syslog, and other infrastructure services
 */
import { broadcastToChannel } from "./websocket";
import { logger } from "./logging";

// Infrastructure node types
type NodeType = "api" | "database" | "syslog" | "redis" | "ldap" | "gateway" | "storage" | "monitoring";
type NodeStatus = "online" | "offline" | "degraded" | "unknown";

interface InfraNode {
  id: string;
  name: string;
  type: NodeType;
  host: string;
  port?: number;
  status: NodeStatus;
  lastCheck: Date;
  latency?: number;
  services: string[];
  metadata?: Record<string, any>;
}

// ============================================
// INFRASTRUCTURE CONFIGURATION
// ============================================

// Your infrastructure nodes
const infrastructure: Map<string, InfraNode> = new Map([
  // PostgreSQL on Raspberry Pi
  ["pi-db", {
    id: "pi-db",
    name: "Database Server (Pi)",
    type: "database",
    host: "192.168.2.70",
    port: 5432,
    status: "unknown",
    lastCheck: new Date(0),
    services: ["postgresql", "pgbouncer"],
    metadata: {
      ssh_user: "johnmarston",
      os: "Raspberry Pi OS",
      role: "primary",
    },
  }],

  // Syslog server
  ["syslog", {
    id: "syslog",
    name: "Syslog Server",
    type: "syslog",
    host: "192.168.2.101",
    port: 514,
    status: "unknown",
    lastCheck: new Date(0),
    services: ["rsyslog", "logrotate"],
    metadata: {
      protocol: "udp",
      facility: "local0",
    },
  }],

  // Local API server
  ["api", {
    id: "api",
    name: "API Server (Local)",
    type: "api",
    host: "localhost",
    port: 3000,
    status: "unknown",
    lastCheck: new Date(0),
    services: ["bun", "hono", "guardquote-api"],
    metadata: {
      runtime: "Bun 1.3.6",
    },
  }],
]);

// Future infrastructure placeholders
const futureInfrastructure: Omit<InfraNode, "status" | "lastCheck">[] = [
  {
    id: "redis",
    name: "Redis Cache",
    type: "redis",
    host: "192.168.2.70", // Can run on same Pi or separate
    port: 6379,
    services: ["redis-server"],
    metadata: { note: "Pending deployment" },
  },
  {
    id: "ldap",
    name: "LDAP/AD Server",
    type: "ldap",
    host: "192.168.2.x", // TBD
    port: 389,
    services: ["openldap", "sssd"],
    metadata: { note: "Pending deployment" },
  },
  {
    id: "gateway",
    name: "API Gateway",
    type: "gateway",
    host: "192.168.2.x", // TBD
    port: 8080,
    services: ["kong", "nginx"],
    metadata: { note: "Pending deployment" },
  },
  {
    id: "monitoring",
    name: "Monitoring Stack",
    type: "monitoring",
    host: "192.168.2.101", // Could run on syslog server
    port: 9090,
    services: ["prometheus", "grafana", "alertmanager"],
    metadata: { note: "Pending deployment" },
  },
];

// ============================================
// HEALTH CHECK FUNCTIONS
// ============================================

/**
 * Check if a TCP port is reachable
 */
async function checkTCPPort(host: string, port: number, timeout = 5000): Promise<{
  reachable: boolean;
  latency?: number;
  error?: string;
}> {
  const start = performance.now();

  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        data: () => {},
        open: () => {},
        close: () => {},
        error: () => {},
        connectError: () => {},
      },
    });

    const latency = Math.round(performance.now() - start);
    socket.end();

    return { reachable: true, latency };
  } catch (error: any) {
    return { reachable: false, error: error.message };
  }
}

/**
 * Check if a host is reachable via ping (ICMP)
 */
async function pingHost(host: string): Promise<{
  reachable: boolean;
  latency?: number;
}> {
  try {
    const proc = Bun.spawn(["ping", "-c", "1", "-W", "2", host], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const output = await new Response(proc.stdout).text();

    if (exitCode === 0) {
      // Parse latency from ping output
      const match = output.match(/time=(\d+\.?\d*)/);
      const latency = match ? parseFloat(match[1]) : undefined;
      return { reachable: true, latency };
    }

    return { reachable: false };
  } catch (error) {
    return { reachable: false };
  }
}

/**
 * Check PostgreSQL health
 */
async function checkPostgreSQL(host: string, port: number): Promise<{
  status: NodeStatus;
  latency?: number;
  message?: string;
}> {
  const tcpCheck = await checkTCPPort(host, port);

  if (!tcpCheck.reachable) {
    return { status: "offline", message: tcpCheck.error };
  }

  // If TCP is reachable, try actual connection
  try {
    const start = performance.now();
    const proc = Bun.spawn([
      "psql",
      "-h", host,
      "-p", port.toString(),
      "-U", "guardquote",
      "-d", "guardquote",
      "-c", "SELECT 1;",
    ], {
      env: {
        ...process.env,
        PGPASSWORD: "WPU8bj3nbwFyZFEtHZQz",
        PGCONNECT_TIMEOUT: "5",
      },
    });

    const exitCode = await proc.exited;
    const latency = Math.round(performance.now() - start);

    if (exitCode === 0) {
      return { status: latency > 100 ? "degraded" : "online", latency };
    }

    return { status: "degraded", latency, message: "Query failed" };
  } catch (error: any) {
    return { status: "degraded", message: error.message };
  }
}

/**
 * Check Syslog server (UDP)
 */
async function checkSyslog(host: string, port: number): Promise<{
  status: NodeStatus;
  latency?: number;
  message?: string;
}> {
  // First check if host is reachable
  const ping = await pingHost(host);

  if (!ping.reachable) {
    return { status: "offline", message: "Host unreachable" };
  }

  // UDP is connectionless, so we can only verify the host is up
  // Send a test syslog message and assume success
  try {
    const socket = Bun.udpSocket({
      socket: {
        data: () => {},
      },
    });

    const testMessage = `<134>1 ${new Date().toISOString()} localhost guardquote-healthcheck - - - Health check ping`;
    socket.send(Buffer.from(testMessage), port, host);
    socket.close();

    return { status: "online", latency: ping.latency, message: "Syslog accepting messages" };
  } catch (error: any) {
    return { status: "degraded", message: error.message };
  }
}

/**
 * Check Redis server
 */
async function checkRedis(host: string, port: number): Promise<{
  status: NodeStatus;
  latency?: number;
  message?: string;
}> {
  const tcpCheck = await checkTCPPort(host, port);

  if (!tcpCheck.reachable) {
    return { status: "offline", message: tcpCheck.error };
  }

  // Try PING command
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        data: (socket, data) => {
          const response = new TextDecoder().decode(data);
          if (response.includes("PONG")) {
            socket.end();
          }
        },
        open: (socket) => {
          socket.write("PING\r\n");
        },
        close: () => {},
        error: () => {},
      },
    });

    // Wait a bit for response
    await new Promise(resolve => setTimeout(resolve, 100));
    socket.end();

    return { status: "online", latency: tcpCheck.latency };
  } catch (error: any) {
    return { status: "degraded", latency: tcpCheck.latency, message: error.message };
  }
}

// ============================================
// NODE HEALTH CHECK DISPATCHER
// ============================================

/**
 * Check health of a specific node
 */
async function checkNodeHealth(node: InfraNode): Promise<void> {
  let result: { status: NodeStatus; latency?: number; message?: string };

  switch (node.type) {
    case "database":
      result = await checkPostgreSQL(node.host, node.port || 5432);
      break;
    case "syslog":
      result = await checkSyslog(node.host, node.port || 514);
      break;
    case "redis":
      result = await checkRedis(node.host, node.port || 6379);
      break;
    case "api":
      const tcpCheck = await checkTCPPort(node.host, node.port || 3000);
      result = {
        status: tcpCheck.reachable ? "online" : "offline",
        latency: tcpCheck.latency,
        message: tcpCheck.error,
      };
      break;
    default:
      // Generic TCP check for unknown types
      const generic = await checkTCPPort(node.host, node.port || 80);
      result = {
        status: generic.reachable ? "online" : "offline",
        latency: generic.latency,
        message: generic.error,
      };
  }

  const previousStatus = node.status;
  node.status = result.status;
  node.latency = result.latency;
  node.lastCheck = new Date();

  // Log status changes
  if (previousStatus !== result.status && previousStatus !== "unknown") {
    logger.warn("Infrastructure", `${node.name} status changed: ${previousStatus} → ${result.status}`, {
      node: node.id,
      host: node.host,
      message: result.message,
    });

    // Broadcast status change
    broadcastToChannel("services", "infrastructure.status_change", {
      nodeId: node.id,
      name: node.name,
      previousStatus,
      newStatus: result.status,
      message: result.message,
    });
  }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Check all infrastructure nodes
 */
export async function checkAllNodes(): Promise<InfraNode[]> {
  const promises: Promise<void>[] = [];

  for (const [_, node] of infrastructure) {
    promises.push(checkNodeHealth(node));
  }

  await Promise.all(promises);

  return Array.from(infrastructure.values());
}

/**
 * Get infrastructure overview
 */
export async function getInfrastructureOverview(): Promise<{
  nodes: InfraNode[];
  summary: { online: number; offline: number; degraded: number; unknown: number };
  futureNodes: typeof futureInfrastructure;
}> {
  const nodes = await checkAllNodes();

  const summary = {
    online: nodes.filter(n => n.status === "online").length,
    offline: nodes.filter(n => n.status === "offline").length,
    degraded: nodes.filter(n => n.status === "degraded").length,
    unknown: nodes.filter(n => n.status === "unknown").length,
  };

  return {
    nodes,
    summary,
    futureNodes: futureInfrastructure,
  };
}

/**
 * Get specific node status
 */
export async function getNodeStatus(nodeId: string): Promise<InfraNode | null> {
  const node = infrastructure.get(nodeId);
  if (!node) return null;

  await checkNodeHealth(node);
  return node;
}

/**
 * Add a new infrastructure node
 */
export function addNode(node: Omit<InfraNode, "status" | "lastCheck">): void {
  infrastructure.set(node.id, {
    ...node,
    status: "unknown",
    lastCheck: new Date(0),
  });

  logger.info("Infrastructure", `Added node: ${node.name}`, { nodeId: node.id, host: node.host });
}

/**
 * Remove an infrastructure node
 */
export function removeNode(nodeId: string): boolean {
  const node = infrastructure.get(nodeId);
  if (node) {
    infrastructure.delete(nodeId);
    logger.info("Infrastructure", `Removed node: ${node.name}`, { nodeId });
    return true;
  }
  return false;
}

/**
 * Update node configuration
 */
export function updateNode(nodeId: string, updates: Partial<InfraNode>): boolean {
  const node = infrastructure.get(nodeId);
  if (node) {
    Object.assign(node, updates);
    logger.info("Infrastructure", `Updated node: ${node.name}`, { nodeId, updates });
    return true;
  }
  return false;
}

// ============================================
// PERIODIC MONITORING
// ============================================

let monitoringInterval: Timer | null = null;

/**
 * Start periodic infrastructure monitoring
 */
export function startMonitoring(intervalMs = 30000) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }

  // Initial check
  checkAllNodes().then(nodes => {
    broadcastToChannel("services", "infrastructure.status", {
      nodes,
      timestamp: Date.now(),
    });
  });

  // Periodic checks
  monitoringInterval = setInterval(async () => {
    const nodes = await checkAllNodes();
    broadcastToChannel("services", "infrastructure.status", {
      nodes,
      timestamp: Date.now(),
    });
  }, intervalMs);

  logger.info("Infrastructure", `Started monitoring (every ${intervalMs / 1000}s)`);
}

/**
 * Stop periodic monitoring
 */
export function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info("Infrastructure", "Stopped monitoring");
  }
}

// ============================================
// NETWORK UTILITIES
// ============================================

/**
 * Scan a port range on a host
 */
export async function scanPorts(host: string, startPort: number, endPort: number): Promise<{
  host: string;
  openPorts: number[];
}> {
  const openPorts: number[] = [];
  const promises: Promise<void>[] = [];

  for (let port = startPort; port <= endPort; port++) {
    promises.push(
      checkTCPPort(host, port, 1000).then(result => {
        if (result.reachable) {
          openPorts.push(port);
        }
      })
    );
  }

  await Promise.all(promises);
  openPorts.sort((a, b) => a - b);

  return { host, openPorts };
}

/**
 * Discover services on the local network
 */
export async function discoverNetwork(subnet: string = "192.168.2"): Promise<{
  host: string;
  reachable: boolean;
  latency?: number;
}[]> {
  const results: { host: string; reachable: boolean; latency?: number }[] = [];
  const promises: Promise<void>[] = [];

  // Scan common hosts (1-254)
  for (let i = 1; i <= 254; i++) {
    const host = `${subnet}.${i}`;
    promises.push(
      pingHost(host).then(result => {
        if (result.reachable) {
          results.push({ host, reachable: true, latency: result.latency });
        }
      })
    );
  }

  await Promise.all(promises);
  results.sort((a, b) => {
    const aNum = parseInt(a.host.split(".").pop() || "0");
    const bNum = parseInt(b.host.split(".").pop() || "0");
    return aNum - bNum;
  });

  return results;
}

export {
  NodeType,
  NodeStatus,
  InfraNode,
  infrastructure,
  futureInfrastructure,
};
