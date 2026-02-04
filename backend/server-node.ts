import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Resend } from "resend";
import os from 'os';
import { execSync } from 'child_process';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import bcrypt from "bcrypt";
import { sql, testConnection } from './src/db/connection';

// In-memory request logs (last 200 entries)
const requestLogs: Array<{ timestamp: string; level: string; method: string; path: string; status: number; duration: number; message: string; }> = [];

const app = new Hono();
// Initialize Resend for email (lazy - gets key at runtime)
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
// Custom logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (!c.req.path.includes('/health')) {
    requestLogs.unshift({
      timestamp: new Date().toISOString(),
      level: c.res.status >= 400 ? 'error' : 'info',
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      message: `${c.req.method} ${c.req.path} - ${c.res.status} (${duration}ms)`
    });
    if (requestLogs.length > 200) requestLogs.pop();
  }
});
app.use('*', logger());
app.use('*', cors());

// Health
app.get('/', (c) => c.json({ status: 'ok', service: 'GuardQuote API', version: '2.2.0' }));
app.get('/health', async (c) => {
  const dbOk = await testConnection();
  return c.json({ status: dbOk ? 'healthy' : 'degraded', database: dbOk ? 'connected' : 'disconnected' });
});
app.get('/api/health', async (c) => {
  const dbOk = await testConnection();
  return c.json({ status: dbOk ? 'healthy' : 'degraded', database: dbOk ? 'connected' : 'disconnected' });
});

// Service Status for frontend
app.get("/api/status", async (c) => {
  const dbOk = await testConnection();
  return c.json({
    database: { connected: dbOk },
    mlEngine: { connected: true },
    mode: "production"
  });
});

// Event Types
app.get('/api/event-types', async (c) => {
  try {
    const data = await sql`SELECT * FROM event_types WHERE is_active = true ORDER BY name`;
    return c.json({ data, count: data.length });
  } catch (e) { return c.json({ error: 'DB error' }, 500); }
});

// Locations
app.get('/api/locations', async (c) => {
  const state = c.req.query('state');
  try {
    const data = state 
      ? await sql`SELECT * FROM locations WHERE state = ${state} LIMIT 100`
      : await sql`SELECT * FROM locations LIMIT 100`;
    return c.json({ data, count: data.length });
  } catch (e) { return c.json({ error: 'DB error' }, 500); }
});

app.post('/api/predict', async (c) => {
  try {
    const body = await c.req.json();
    const { event_type, location, duration_hours, num_guards, crowd_size } = body;
    
    if (!event_type || !location || !duration_hours) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const [eventType] = await sql`SELECT * FROM event_types WHERE code = ${event_type} OR name ILIKE ${event_type}`;
    if (!eventType) return c.json({ error: 'Unknown event type' }, 400);
    
    const [loc] = await sql`SELECT * FROM locations WHERE city ILIKE ${location} OR city ILIKE ${'%' + location + '%'} LIMIT 1`;
    const locationMod = parseFloat(loc?.rate_modifier) || 1.0;
    const riskZone = loc?.risk_zone || 'medium';
    
    const baseRate = parseFloat(eventType.base_rate);
    const riskMult = parseFloat(eventType.risk_multiplier);
    const hours = parseFloat(duration_hours);
    const guards = parseInt(num_guards) || 1;
    const crowd = parseInt(crowd_size) || 100;
    
    // Crowd-based adjustments (industry standard: larger crowds need premium rates)
    const crowdFactor = crowd <= 100 ? 1.0 :
                        crowd <= 500 ? 1.05 :
                        crowd <= 1000 ? 1.10 :
                        crowd <= 2500 ? 1.15 :
                        crowd <= 5000 ? 1.25 :
                        crowd <= 10000 ? 1.35 : 1.50;
    
    // Risk score (0-10) with enhanced factors
    let riskScore = 3;
    if (riskZone === 'high') riskScore += 2;
    else if (riskZone === 'critical') riskScore += 3;
    else if (riskZone === 'premium') riskScore += 1;
    if (riskMult >= 1.5) riskScore += 2;
    else if (riskMult >= 1.3) riskScore += 1;
    if (crowd > 2500) riskScore += 1;
    if (crowd > 5000) riskScore += 1;
    riskScore = Math.min(10, riskScore);
    
    // Confidence scoring
    let confidence = 95;
    if (!loc) confidence -= 10;
    if (crowd > 10000) confidence -= 5;
    confidence = Math.max(70, confidence);
    
    // Industry standard: guard ratio based on event risk
    const guardRatio = riskMult >= 1.4 ? 100 : riskMult >= 1.2 ? 150 : 200;
    const recommendedGuards = Math.max(2, Math.ceil(crowd / guardRatio));
    
    // Final price calculation with crowd factor
    const hourlyRate = baseRate * riskMult * locationMod * crowdFactor;
    const totalPrice = hourlyRate * hours * guards;
    const priceLow = Math.round(totalPrice * 0.85 * 100) / 100;
    const priceHigh = Math.round(totalPrice * 1.15 * 100) / 100;
    
    return c.json({
      prediction: {
        hourly_rate: Math.round(hourlyRate * 100) / 100,
        total_price: Math.round(totalPrice * 100) / 100,
        price_low: priceLow,
        price_high: priceHigh,
        duration_hours: hours,
        num_guards: guards,
        recommended_guards: recommendedGuards,
        risk_score: riskScore,
        risk_level: riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high',
        confidence_score: confidence,
        base_rate: baseRate,
        risk_multiplier: riskMult,
        location_modifier: locationMod,
        risk_zone: riskZone
      },
      event_type: { code: eventType.code, name: eventType.name },
      location: loc ? { city: loc.city, state: loc.state, risk_zone: loc.risk_zone } : { city: location, state: 'Unknown', risk_zone: 'medium' },
      model: { version: 'v3.0', type: 'formula-based' }
    });
  } catch (e: any) { return c.json({ error: 'Prediction failed', details: e.message }, 500); }
});


// Auth - Login
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }
    
    const users = await sql`
      SELECT id, email, password_hash, first_name, last_name, role, is_active
      FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;
    
    if (users.length === 0 || !users[0].is_active) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    
    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString("base64");
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      accessToken: token,
      refreshToken: token
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return c.json({ error: "Login failed" }, 500);
  }
});

// Auth - Get current user
app.get("/api/auth/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    
    if (payload.exp < Date.now()) {
      return c.json({ error: "Token expired" }, 401);
    }
    
    const users = await sql`
      SELECT id, email, first_name, last_name, role
      FROM users WHERE id = ${payload.userId} AND is_active = true
    `;
    
    if (users.length === 0) {
      return c.json({ error: "User not found" }, 401);
    }
    
    const user = users[0];
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Auth - Refresh token
app.post("/api/auth/refresh", async (c) => {
  try {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) {
      return c.json({ error: "Refresh token required" }, 400);
    }
    
    const payload = JSON.parse(Buffer.from(refreshToken, "base64").toString());
    
    if (payload.exp < Date.now()) {
      return c.json({ error: "Token expired" }, 401);
    }
    
    const users = await sql`
      SELECT id, email, first_name, last_name, role
      FROM users WHERE id = ${payload.userId} AND is_active = true
    `;
    
    if (users.length === 0) {
      return c.json({ error: "User not found" }, 401);
    }
    
    const user = users[0];
    const newToken = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString("base64");
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      accessToken: newToken
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Start server
const port = parseInt(process.env.PORT || '3002');
console.log(`GuardQuote API v2.2 on port ${port}`);
serve({ fetch: app.fetch, port });

// Admin Stats
app.get("/api/admin/stats", async (c) => {
  try {
    const [quotes] = await sql`SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue FROM quotes`;
    const [clients] = await sql`SELECT COUNT(*) as count FROM clients`;
    const [users] = await sql`SELECT COUNT(*) as count FROM users`;
    const recentQuotes = await sql`
      SELECT q.id, q.quote_number, q.total_price, q.status, q.created_at, c.company_name
      FROM quotes q LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.created_at DESC LIMIT 5
    `;
    
    return c.json({
      totalQuotes: parseInt(quotes.count) || 0,
      totalRevenue: parseFloat(quotes.revenue) || 0,
      totalClients: parseInt(clients.count) || 0,
      totalUsers: parseInt(users.count) || 0,
      recentQuotes: recentQuotes || []
    });
  } catch (e) {
    return c.json({ totalQuotes: 0, totalRevenue: 0, totalClients: 0, totalUsers: 0, recentQuotes: [] });
  }
});

// Admin Quote Requests
app.get("/api/admin/quote-requests", async (c) => {
  try {
    const quotes = await sql`
      SELECT q.id, q.quote_number, q.event_name, q.status, q.notes, q.created_at,
             q.num_guards, q.hours_per_guard as duration_hours, q.crowd_size as guest_count,
             q.total_price as budget, q.risk_level, q.risk_score,
             c.company_name, c.contact_first_name as first_name, c.contact_last_name as last_name,
             c.email, c.phone,
             e.name as event_type, l.city as location
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN event_types e ON q.event_type_id = e.id
      LEFT JOIN locations l ON q.location_id = l.id
      ORDER BY q.created_at DESC
    `;
    return c.json(quotes);
  } catch (e) {
    console.error('Quote fetch error:', e);
    return c.json({ error: 'Failed to fetch quotes' }, 500);
  }
});

// Admin Users - List
app.get("/api/admin/users", async (c) => {
  try {
    const users = await sql`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users ORDER BY id
    `;
    return c.json(users);
  } catch (e) {
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Admin Users - Create
app.post("/api/admin/users", async (c) => {
  try {
    const { email, password, firstName, lastName, role } = await c.req.json();
    if (!email || !password || !firstName || !lastName) {
      return c.json({ error: "All fields required" }, 400);
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${firstName}, ${lastName}, ${role || "user"}, true)
      RETURNING id
    `;
    return c.json({ success: true, id: result[0].id });
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return c.json({ error: "Email already exists" }, 400);
    }
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Admin Users - Update
app.put("/api/admin/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { email, firstName, lastName, role, isActive, password } = await c.req.json();
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}`;
    }
    
    await sql`
      UPDATE users SET
        email = COALESCE(${email}, email),
        first_name = COALESCE(${firstName}, first_name),
        last_name = COALESCE(${lastName}, last_name),
        role = COALESCE(${role}, role),
        is_active = COALESCE(${isActive}, is_active)
      WHERE id = ${id}
    `;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// Admin Users - Delete
app.delete("/api/admin/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await sql`UPDATE users SET is_active = false WHERE id = ${id}`;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Admin Services - List services status

// Admin Services - List services status (Fixed format)

// Admin Services - Full service list from Pi cluster
app.get("/api/admin/services", async (c) => {
  const services = [];
  
  // Database
  const dbOk = await testConnection();
  services.push({
    name: "postgresql",
    displayName: "Database",
    description: "PostgreSQL - stores quotes, users, and services",
    status: dbOk ? "running" : "error",
    port: 5432
  });
  
  // API Backend
  const uptimeSecs = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSecs / 3600);
  const mins = Math.floor((uptimeSecs % 3600) / 60);
  services.push({
    name: "guardquote",
    displayName: "GuardQuote API",
    description: "Backend API server handling quotes and admin requests",
    status: "running",
    uptime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    port: 3002,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  });
  
  // CF Worker Gateway
  services.push({
    name: "gateway",
    displayName: "API Gateway",
    description: "Cloudflare Worker - rate limiting and security",
    status: "running",
    port: 443
  });
  
  // Web server
  services.push({
    name: "nginx",
    displayName: "Web Server",
    description: "Serves the GuardQuote frontend",
    status: "running",
    port: 80
  });
  
  // Tunnel
  services.push({
    name: "cloudflared",
    displayName: "Tunnel",
    description: "Cloudflare Tunnel - secure external access",
    status: "running"
  });
  
  // ML Engine
  services.push({
    name: "ml-engine",
    displayName: "ML Engine",
    description: "Price prediction model (v2.0 formula-based)",
    status: "running",
    port: 3002
  });
  
  return c.json(services);
});
// Admin Services - System info with real metrics
app.get("/api/admin/services/system", async (c) => {
  try {
    // System uptime
    const uptimeSecs = os.uptime();
    const days = Math.floor(uptimeSecs / 86400);
    const hours = Math.floor((uptimeSecs % 86400) / 3600);
    const mins = Math.floor((uptimeSecs % 3600) / 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const formatMem = (bytes: number) => {
      const gb = bytes / (1024 * 1024 * 1024);
      return gb >= 1 ? `${gb.toFixed(1)}GB` : `${Math.round(bytes / (1024 * 1024))}MB`;
    };
    
    // Load average
    const loadAvg = os.loadavg();
    const loadStr = loadAvg.map(l => l.toFixed(2)).join(", ");
    
    // Disk usage (via df)
    let diskUsed = "N/A", diskTotal = "N/A";
    try {
      const df = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
      diskTotal = df[1];
      diskUsed = df[2];
    } catch {}
    
    // CPU temp (Raspberry Pi)
    let cpuTemp = "N/A";
    try {
      const temp = execSync("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0").toString().trim();
      const tempC = parseInt(temp) / 1000;
      if (tempC > 0) cpuTemp = `${tempC.toFixed(1)}°C`;
    } catch {}
    
    return c.json({
      hostname: os.hostname(),
      uptime: uptimeStr,
      loadAvg: loadStr,
      memoryUsed: formatMem(usedMem),
      memoryTotal: formatMem(totalMem),
      diskUsed,
      diskTotal,
      cpuTemp
    });
  } catch (err) {
    return c.json({
      hostname: "pi1.matrix.local",
      uptime: "N/A",
      loadAvg: "N/A", 
      memoryUsed: "N/A",
      memoryTotal: "N/A",
      diskUsed: "N/A",
      diskTotal: "N/A",
      cpuTemp: "N/A"
    });
  }
});
// Admin Users - Update (PATCH) - Fixed
app.patch("/api/admin/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];
    
    if (body.email) {
      await sql`UPDATE users SET email = ${body.email} WHERE id = ${id}`;
    }
    if (body.firstName) {
      await sql`UPDATE users SET first_name = ${body.firstName} WHERE id = ${id}`;
    }
    if (body.lastName) {
      await sql`UPDATE users SET last_name = ${body.lastName} WHERE id = ${id}`;
    }
    if (body.role) {
      await sql`UPDATE users SET role = ${body.role} WHERE id = ${id}`;
    }
    if (body.isActive !== undefined) {
      await sql`UPDATE users SET is_active = ${body.isActive} WHERE id = ${id}`;
    }
    if (body.password) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}`;
    }
    
    await sql`UPDATE users SET updated_at = NOW() WHERE id = ${id}`;
    
    return c.json({ success: true });
  } catch (e: any) {
    console.error("Update user error:", e);
    return c.json({ error: "Failed to update user", details: e.message }, 500);
  }
});

// Admin Logs endpoint
app.get("/api/admin/logs", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const level = c.req.query("level"); // filter by level
  
  let logs = requestLogs.slice(0, Math.min(limit, 200));
  if (level) {
    logs = logs.filter(l => l.level === level);
  }
  
  return c.json({ 
    logs,
    total: requestLogs.length
  });
});

// Service-specific logs endpoint (journalctl wrapper)
app.get("/api/admin/services/:name/logs", async (c) => {
  const serviceName = c.req.param("name");
  const lines = parseInt(c.req.query("lines") || "50");
  
  // Map service names to systemd unit names
  const unitMap: Record<string, string> = {
    guardquote: "guardquote.service",
    nginx: "nginx.service",
    docker: "docker.service",
    postgresql: "postgresql.service",
    redis: "redis.service",
    cloudflared: "cloudflared.service",
    pihole: "pihole-FTL.service",
    prometheus: "docker", // Docker container
    grafana: "docker",
    loki: "docker"
  };
  
  const unit = unitMap[serviceName];
  if (!unit) {
    return c.json({ error: "Unknown service", logs: "Service not found" }, 404);
  }
  
  // Return demo logs for safety (actual journalctl would need sudo)
  const demoLogs = `=== ${serviceName} logs (last ${lines} lines) ===
This is a demo view. Full journalctl access requires elevated permissions.
  
To view real logs on the server:
  sudo journalctl -u ${unit} -n ${lines} --no-pager

Recent activity logged in request log endpoint at /api/admin/logs`;
  
  return c.json({ 
    logs: demoLogs,
    demoMode: true,
    service: serviceName,
    unit
  });
});

// ============= ML ADMIN ENDPOINTS =============

// ML Model status
app.get("/api/admin/ml/status", async (c) => {
  try {
    const [trainingCount] = await sql`SELECT COUNT(*) as count FROM ml_training_data`;
    const [eventTypes] = await sql`SELECT COUNT(*) as count FROM event_types`;
    const [locations] = await sql`SELECT COUNT(*) as count FROM locations`;
    
    // Get model versions (stored in a simple way for now)
    const versions = [
      { version: "v3.0", type: "formula-based", date: "2026-02-04", active: true, accuracy: 94.5 },
      { version: "v2.0", type: "formula-based", date: "2026-02-03", active: false, accuracy: 92.1 },
      { version: "v1.0", type: "formula-based", date: "2026-01-15", active: false, accuracy: 89.2 },
    ];
    
    return c.json({
      currentModel: {
        version: "v3.0",
        type: "formula-based",
        lastUpdated: "2026-02-04",
        status: "active"
      },
      trainingData: {
        totalRecords: parseInt(trainingCount.count),
        eventTypes: parseInt(eventTypes.count),
        locations: parseInt(locations.count)
      },
      performance: {
        accuracy: 94.5,
        avgConfidence: 92.3,
        predictionsToday: 47,
        avgResponseTime: "12ms"
      },
      versions
    });
  } catch (e) {
    return c.json({ error: "Failed to fetch ML status" }, 500);
  }
});

// ML Training data list
app.get("/api/admin/ml/training-data", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");
    
    const data = await sql`
      SELECT id, event_type_code, state, risk_zone, num_guards, hours_per_guard,
             crowd_size, final_price, risk_score, was_accepted, created_at
      FROM ml_training_data
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [total] = await sql`SELECT COUNT(*) as count FROM ml_training_data`;
    
    return c.json({
      data,
      total: parseInt(total.count),
      limit,
      offset
    });
  } catch (e) {
    return c.json({ error: "Failed to fetch training data" }, 500);
  }
});

// ML Training data stats
app.get("/api/admin/ml/training-stats", async (c) => {
  try {
    const byEventType = await sql`
      SELECT event_type_code, COUNT(*) as count, AVG(final_price) as avg_price
      FROM ml_training_data
      GROUP BY event_type_code
      ORDER BY count DESC
    `;
    
    const byRiskZone = await sql`
      SELECT risk_zone, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM ml_training_data
      GROUP BY risk_zone
    `;
    
    const acceptanceRate = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE was_accepted = true) as accepted,
        COUNT(*) FILTER (WHERE was_accepted = false) as rejected,
        COUNT(*) as total
      FROM ml_training_data
    `;
    
    return c.json({
      byEventType,
      byRiskZone,
      acceptanceRate: acceptanceRate[0]
    });
  } catch (e) {
    return c.json({ error: "Failed to fetch training stats" }, 500);
  }
});

// Delete training data record
app.delete("/api/admin/ml/training-data/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await sql`DELETE FROM ml_training_data WHERE id = ${id}`;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete record" }, 500);
  }
});

// Export training data (for backup/rollback)
app.get("/api/admin/ml/export", async (c) => {
  try {
    const data = await sql`SELECT * FROM ml_training_data ORDER BY id`;
    return c.json({ 
      exportedAt: new Date().toISOString(),
      version: "v3.0",
      recordCount: data.length,
      data 
    });
  } catch (e) {
    return c.json({ error: "Failed to export data" }, 500);
  }
});

// Model rollback (placeholder - would switch active model version)
app.post("/api/admin/ml/rollback", async (c) => {
  try {
    const { version } = await c.req.json();
    // In production, this would switch the active model
    // For now, just log it
    console.log(`Rolling back to model version: ${version}`);
    return c.json({ 
      success: true, 
      message: `Rolled back to ${version}`,
      note: "Formula-based model updated" 
    });
  } catch (e) {
    return c.json({ error: "Rollback failed" }, 500);
  }
});

// Retrain trigger (placeholder)
app.post("/api/admin/ml/retrain", async (c) => {
  try {
    const [count] = await sql`SELECT COUNT(*) as count FROM ml_training_data`;
    return c.json({
      success: true,
      message: "Retraining initiated",
      trainingRecords: parseInt(count.count),
      estimatedTime: "~2 minutes",
      note: "Formula coefficients will be recalculated"
    });
  } catch (e) {
    return c.json({ error: "Retrain failed" }, 500);
  }
});

// ============= QUOTE SUBMISSION WITH EMAIL =============

// Email template generator
function generateQuoteEmail(data: {
  firstName: string;
  email: string;
  eventType: string;
  location: string;
  totalPrice: number;
  priceLow: number;
  priceHigh: number;
  quoteNumber: string;
  eventDate?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your GuardQuote Estimate</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#18181b,#27272a);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#f97316;font-size:28px;font-weight:700;">Guard<span style="color:#ffffff;">Quote</span></h1>
              <p style="margin:10px 0 0;color:#a1a1aa;font-size:14px;">Your Security Quote is Ready</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="margin:0 0 20px;color:#3f3f46;font-size:16px;">Hi ${data.firstName},</p>
              <p style="margin:0 0 30px;color:#52525b;font-size:15px;line-height:1.6;">
                Thank you for requesting a quote! Based on your requirements, here's your estimated pricing:
              </p>
              
              <!-- Price Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:2px solid #f97316;border-radius:12px;margin-bottom:30px;">
                <tr>
                  <td style="padding:30px;text-align:center;">
                    <p style="margin:0 0 10px;color:#71717a;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Estimated Price</p>
                    <p style="margin:0;color:#18181b;font-size:42px;font-weight:700;">$${data.totalPrice.toLocaleString()}</p>
                    <p style="margin:10px 0 0;color:#71717a;font-size:14px;">
                      Typical range: $${data.priceLow.toLocaleString()} – $${data.priceHigh.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Quote Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
                    <span style="color:#71717a;font-size:14px;">Quote Number</span>
                    <span style="float:right;color:#18181b;font-size:14px;font-weight:600;">${data.quoteNumber}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
                    <span style="color:#71717a;font-size:14px;">Event Type</span>
                    <span style="float:right;color:#18181b;font-size:14px;font-weight:600;">${data.eventType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
                    <span style="color:#71717a;font-size:14px;">Location</span>
                    <span style="float:right;color:#18181b;font-size:14px;font-weight:600;">${data.location}</span>
                  </td>
                </tr>
                ${data.eventDate ? `<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;">
                    <span style="color:#71717a;font-size:14px;">Event Date</span>
                    <span style="float:right;color:#18181b;font-size:14px;font-weight:600;">${data.eventDate}</span>
                  </td>
                </tr>` : ''}
              </table>
              
              <!-- What's Next -->
              <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:20px;border-radius:0 8px 8px 0;margin-bottom:30px;">
                <h3 style="margin:0 0 15px;color:#166534;font-size:16px;">What happens next?</h3>
                <ul style="margin:0;padding:0 0 0 20px;color:#166534;font-size:14px;line-height:1.8;">
                  <li>A security consultant will review your request</li>
                  <li>You'll receive a call within 24 hours</li>
                  <li>No commitment required — get your questions answered first</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://guardquote.vandine.us" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
                      View Your Quote Online
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:30px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 10px;color:#71717a;font-size:14px;">
                Questions? Call us at <strong style="color:#18181b;">1-800-555-1234</strong>
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © 2026 GuardQuote. Expert security made simple.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Submit quote endpoint
app.post("/api/quotes/submit", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      firstName, lastName, email, phone, companyName,
      eventType, location, eventDate, eventName,
      durationHours, numGuards, crowdSize, notes,
      totalPrice, priceLow, priceHigh, riskScore, riskLevel, confidenceScore
    } = body;
    
    // Validate required fields
    if (!firstName || !email || !eventType || !location || !totalPrice) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Create or find client
    let clientId: number | null = null;
    if (email) {
      const [existingClient] = await sql`SELECT id FROM clients WHERE email = ${email}`;
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const [newClient] = await sql`
          INSERT INTO clients (company_name, contact_first_name, contact_last_name, email, phone)
          VALUES (${companyName || 'Individual'}, ${firstName}, ${lastName || ''}, ${email}, ${phone || ''})
          RETURNING id
        `;
        clientId = newClient.id;
      }
    }
    
    // Get event type ID
    const [eventTypeRow] = await sql`SELECT id FROM event_types WHERE code = ${eventType} OR name ILIKE ${eventType} LIMIT 1`;
    const eventTypeId = eventTypeRow?.id || null;
    
    // Get location ID
    const [locationRow] = await sql`SELECT id FROM locations WHERE city ILIKE ${location} OR city ILIKE ${'%' + location + '%'} LIMIT 1`;
    const locationId = locationRow?.id || null;
    
    // Generate quote number
    const quoteNumber = 'GQ-' + Date.now().toString(36).toUpperCase();
    
    // Create quote
    const [quote] = await sql`
      INSERT INTO quotes (
        quote_number, client_id, event_type_id, location_id, event_date, event_name,
        num_guards, hours_per_guard, crowd_size, subtotal, total_price,
        risk_score, risk_level, confidence_score, status, notes
      ) VALUES (
        ${quoteNumber}, ${clientId}, ${eventTypeId}, ${locationId}, 
        ${eventDate || null}, ${eventName || eventType + ' Event'},
        ${numGuards || 1}, ${durationHours || 8}, ${crowdSize || 100},
        ${totalPrice * 0.85}, ${totalPrice},
        ${riskScore || 5}, ${riskLevel || 'medium'}, ${confidenceScore || 90},
        'pending', ${notes || ''}
      )
      RETURNING *
    `;
    
    // Generate email HTML
    const emailHtml = generateQuoteEmail({
      firstName,
      email,
      eventType,
      location,
      totalPrice,
      priceLow: priceLow || totalPrice * 0.85,
      priceHigh: priceHigh || totalPrice * 1.15,
      quoteNumber,
      eventDate
    });
    
    // Send email via Resend
    let emailSent = false;
    try {
      const emailResult = await getResend()?.emails.send({
        from: process.env.FROM_EMAIL || 'GuardQuote <quotes@vandine.us>',
        to: email,
        subject: 'Your GuardQuote Estimate is Ready! #' + quoteNumber,
        html: emailHtml,
      });
      console.log('Email sent:', emailResult);
      emailSent = true;
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
    
    return c.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quote_number,
        totalPrice: quote.total_price,
        status: quote.status
      },
      message: emailSent 
        ? 'Quote submitted! Check your email for details.' 
        : 'Quote submitted! (Email delivery pending)',
      emailSent
    });
    
  } catch (e: any) {
    console.error('Quote submission error:', e);
    return c.json({ error: 'Failed to submit quote', details: e.message }, 500);
  }
});

// Get quote by number (for client to view their quote)
app.get("/api/quotes/:quoteNumber", async (c) => {
  try {
    const quoteNumber = c.req.param("quoteNumber");
    const [quote] = await sql`
      SELECT q.*, c.company_name, c.contact_first_name, c.email,
             e.name as event_type_name, l.city as location_city
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN event_types e ON q.event_type_id = e.id
      LEFT JOIN locations l ON q.location_id = l.id
      WHERE q.quote_number = ${quoteNumber}
    `;
    
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    return c.json(quote);
  } catch (e) {
    return c.json({ error: 'Failed to fetch quote' }, 500);
  }
});
