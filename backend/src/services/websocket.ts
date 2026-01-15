/**
 * WebSocket Service - Real-time communication hub
 * Handles both client (public) and admin connections
 */
import type { ServerWebSocket } from "bun";

// Connection types
type ConnectionType = "client" | "admin";
type SubscriptionChannel =
  | "quotes"
  | "clients"
  | "system"
  | "alerts"
  | "webhooks"
  | "ml"
  | "services";

interface WSClient {
  id: string;
  ws: ServerWebSocket<WSData>;
  type: ConnectionType;
  userId?: number;
  role?: string;
  subscriptions: Set<SubscriptionChannel>;
  connectedAt: Date;
  lastPing: Date;
}

interface WSData {
  clientId: string;
}

interface WSMessage {
  type: string;
  data?: any;
  channel?: SubscriptionChannel;
  timestamp?: number;
}

// Active connections
const connections = new Map<string, WSClient>();

// Connection stats
let totalConnections = 0;
let peakConnections = 0;

/**
 * Generate unique client ID
 */
function generateClientId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Handle new WebSocket connection
 */
export function handleOpen(ws: ServerWebSocket<WSData>, type: ConnectionType, userId?: number, role?: string) {
  const clientId = generateClientId();
  ws.data = { clientId };

  const client: WSClient = {
    id: clientId,
    ws,
    type,
    userId,
    role,
    subscriptions: new Set(type === "admin" ? ["quotes", "system", "alerts"] : []),
    connectedAt: new Date(),
    lastPing: new Date(),
  };

  connections.set(clientId, client);
  totalConnections++;
  peakConnections = Math.max(peakConnections, connections.size);

  // Send welcome message
  ws.send(JSON.stringify({
    type: "connected",
    data: {
      clientId,
      serverTime: Date.now(),
      subscriptions: Array.from(client.subscriptions),
    },
  }));

  // Notify admins of new connection
  if (type === "admin") {
    broadcastToChannel("system", "admin.connected", { userId, role });
  }

  console.log(`[WS] ${type} connected: ${clientId} (total: ${connections.size})`);
}

/**
 * Handle WebSocket message
 */
export function handleMessage(ws: ServerWebSocket<WSData>, message: string | Buffer) {
  const clientId = ws.data?.clientId;
  const client = clientId ? connections.get(clientId) : null;

  if (!client) {
    ws.send(JSON.stringify({ type: "error", data: { message: "Unknown client" } }));
    return;
  }

  try {
    const msg: WSMessage = JSON.parse(message.toString());
    client.lastPing = new Date();

    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;

      case "subscribe":
        if (msg.channel && isValidChannel(msg.channel, client.type)) {
          client.subscriptions.add(msg.channel);
          ws.send(JSON.stringify({
            type: "subscribed",
            data: { channel: msg.channel },
          }));
        }
        break;

      case "unsubscribe":
        if (msg.channel) {
          client.subscriptions.delete(msg.channel);
          ws.send(JSON.stringify({
            type: "unsubscribed",
            data: { channel: msg.channel },
          }));
        }
        break;

      // Client-specific: real-time price calculation
      case "price.calculate":
        if (client.type === "client" && msg.data) {
          handlePriceCalculation(client, msg.data);
        }
        break;

      // Admin-specific: service commands
      case "service.restart":
        if (client.type === "admin" && client.role === "admin") {
          handleServiceCommand(client, "restart", msg.data);
        }
        break;

      default:
        ws.send(JSON.stringify({
          type: "error",
          data: { message: `Unknown message type: ${msg.type}` },
        }));
    }
  } catch (error) {
    ws.send(JSON.stringify({
      type: "error",
      data: { message: "Invalid message format" },
    }));
  }
}

/**
 * Handle WebSocket close
 */
export function handleClose(ws: ServerWebSocket<WSData>) {
  const clientId = ws.data?.clientId;
  if (clientId) {
    const client = connections.get(clientId);
    if (client?.type === "admin") {
      broadcastToChannel("system", "admin.disconnected", { userId: client.userId });
    }
    connections.delete(clientId);
    console.log(`[WS] Disconnected: ${clientId} (total: ${connections.size})`);
  }
}

/**
 * Validate channel access based on connection type
 */
function isValidChannel(channel: SubscriptionChannel, type: ConnectionType): boolean {
  const clientChannels: SubscriptionChannel[] = ["quotes"];
  const adminChannels: SubscriptionChannel[] = ["quotes", "clients", "system", "alerts", "webhooks", "ml", "services"];

  return type === "admin"
    ? adminChannels.includes(channel)
    : clientChannels.includes(channel);
}

/**
 * Handle real-time price calculation for clients
 */
async function handlePriceCalculation(client: WSClient, data: any) {
  // Send calculating state
  client.ws.send(JSON.stringify({
    type: "price.calculating",
    data: { timestamp: Date.now() },
  }));

  try {
    // Import calculation logic inline to avoid circular deps
    const { calculateQuote } = await import("./quote-calculator");
    const result = await calculateQuote(data);

    client.ws.send(JSON.stringify({
      type: "price.update",
      data: {
        ...result,
        timestamp: Date.now(),
      },
    }));
  } catch (error: any) {
    client.ws.send(JSON.stringify({
      type: "price.error",
      data: {
        message: error.message || "Calculation failed",
        timestamp: Date.now(),
      },
    }));
  }
}

/**
 * Handle admin service commands
 */
function handleServiceCommand(client: WSClient, command: string, data: any) {
  broadcastToChannel("system", "service.command", {
    command,
    data,
    initiatedBy: client.userId,
    timestamp: Date.now(),
  });
}

// ============================================
// BROADCAST FUNCTIONS
// ============================================

/**
 * Broadcast to specific channel
 */
export function broadcastToChannel(channel: SubscriptionChannel, eventType: string, data: any) {
  const message = JSON.stringify({
    type: eventType,
    channel,
    data,
    timestamp: Date.now(),
  });

  for (const [_, client] of connections) {
    if (client.subscriptions.has(channel)) {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error(`[WS] Failed to send to ${client.id}:`, error);
      }
    }
  }
}

/**
 * Broadcast to all admin connections
 */
export function broadcastToAdmins(eventType: string, data: any) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: Date.now(),
  });

  for (const [_, client] of connections) {
    if (client.type === "admin") {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error(`[WS] Failed to send to admin ${client.id}:`, error);
      }
    }
  }
}

/**
 * Broadcast to specific client
 */
export function sendToClient(clientId: string, eventType: string, data: any) {
  const client = connections.get(clientId);
  if (client) {
    client.ws.send(JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now(),
    }));
  }
}

/**
 * Broadcast to all clients of specific type
 */
export function broadcastToType(type: ConnectionType, eventType: string, data: any) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: Date.now(),
  });

  for (const [_, client] of connections) {
    if (client.type === type) {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error(`[WS] Failed to send to ${client.id}:`, error);
      }
    }
  }
}

// ============================================
// STATS & MONITORING
// ============================================

/**
 * Get WebSocket connection statistics
 */
export function getWSStats() {
  const adminCount = Array.from(connections.values()).filter(c => c.type === "admin").length;
  const clientCount = connections.size - adminCount;

  return {
    total: connections.size,
    admin: adminCount,
    client: clientCount,
    peak: peakConnections,
    totalConnections,
    connections: Array.from(connections.values()).map(c => ({
      id: c.id,
      type: c.type,
      userId: c.userId,
      role: c.role,
      subscriptions: Array.from(c.subscriptions),
      connectedAt: c.connectedAt.toISOString(),
      lastPing: c.lastPing.toISOString(),
    })),
  };
}

/**
 * Clean up stale connections (no ping for 5 minutes)
 */
export function cleanupStaleConnections() {
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  for (const [id, client] of connections) {
    if (now - client.lastPing.getTime() > staleThreshold) {
      try {
        client.ws.close(1000, "Connection timeout");
      } catch (error) {
        // Already closed
      }
      connections.delete(id);
      console.log(`[WS] Cleaned up stale connection: ${id}`);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupStaleConnections, 60 * 1000);

export { connections, type WSClient, type ConnectionType, type SubscriptionChannel };
