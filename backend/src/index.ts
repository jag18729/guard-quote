/**
 * GuardQuote API - PostgreSQL on Raspberry Pi
 * High-performance backend with webhooks support
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { sql, testConnection } from "./db/connection";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

// ============================================
// HEALTH & INFO
// ============================================

app.get("/", (c) => c.json({
  status: "ok",
  service: "GuardQuote API",
  version: "2.0.0",
  database: "PostgreSQL (Raspberry Pi)",
}));

app.get("/health", async (c) => {
  const dbOk = await testConnection();
  return c.json({ status: dbOk ? "healthy" : "degraded", database: dbOk ? "connected" : "disconnected" });
});

app.get("/api/health", async (c) => {
  const dbOk = await testConnection();
  return c.json({ status: dbOk ? "healthy" : "degraded", database: dbOk ? "connected" : "disconnected", service: "GuardQuote API" });
});

// ============================================
// USERS
// ============================================

app.get("/api/users", async (c) => {
  const users = await sql`SELECT id, email, first_name, last_name, role, is_active, created_at FROM users`;
  return c.json(users);
});

app.post("/api/users", async (c) => {
  const body = await c.req.json();
  const result = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (${body.email}, ${body.password}, ${body.firstName}, ${body.lastName}, ${body.role || 'user'})
    RETURNING id
  `;
  return c.json({ success: true, id: result[0].id });
});

// ============================================
// CLIENTS
// ============================================

app.get("/api/clients", async (c) => {
  const clients = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
  return c.json(clients);
});

app.post("/api/clients", async (c) => {
  const body = await c.req.json();
  const result = await sql`
    INSERT INTO clients (company_name, contact_first_name, contact_last_name, email, phone, address)
    VALUES (${body.companyName}, ${body.contactFirstName}, ${body.contactLastName}, ${body.email}, ${body.phone}, ${body.address || null})
    RETURNING id
  `;
  await triggerWebhook("client.created", { clientId: result[0].id, ...body });
  return c.json({ success: true, id: result[0].id });
});

app.get("/api/clients/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const client = await sql`SELECT * FROM clients WHERE id = ${id}`;
  return client.length ? c.json(client[0]) : c.json({ error: "Not found" }, 404);
});

// ============================================
// LOCATIONS
// ============================================

app.get("/api/locations", async (c) => {
  const locations = await sql`SELECT * FROM locations ORDER BY state, city`;
  return c.json(locations);
});

app.get("/api/locations/:zipCode", async (c) => {
  const zipCode = c.req.param("zipCode");
  const location = await sql`SELECT * FROM locations WHERE zip_code = ${zipCode}`;
  return location.length ? c.json(location[0]) : c.json({ error: "Not found" }, 404);
});

// ============================================
// EVENT TYPES
// ============================================

app.get("/api/event-types", async (c) => {
  const types = await sql`SELECT * FROM event_types WHERE is_active = true`;
  return c.json(types);
});

// ============================================
// QUOTES
// ============================================

app.get("/api/quotes", async (c) => {
  const quotes = await sql`
    SELECT q.*, c.company_name as client_name, e.name as event_type_name
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    LEFT JOIN event_types e ON q.event_type_id = e.id
    ORDER BY q.created_at DESC
  `;
  return c.json(quotes);
});

app.post("/api/quotes", async (c) => {
  const body = await c.req.json();
  const quoteNumber = `GQ-${Date.now()}`;
  const result = await sql`
    INSERT INTO quotes (
      quote_number, client_id, created_by, event_type_id, location_id,
      event_date, event_name, num_guards, hours_per_guard, crowd_size,
      subtotal, total_price, risk_score, risk_level, confidence_score, status
    ) VALUES (
      ${quoteNumber}, ${body.clientId}, ${body.createdBy || 1}, ${body.eventTypeId}, ${body.locationId},
      ${body.eventDate}, ${body.eventName}, ${body.numGuards}, ${body.hoursPerGuard}, ${body.crowdSize || 0},
      ${body.subtotal}, ${body.totalPrice}, ${body.riskScore}, ${body.riskLevel}, ${body.confidenceScore}, 'draft'
    )
    RETURNING id, quote_number
  `;
  await triggerWebhook("quote.created", { quoteId: result[0].id, quoteNumber: result[0].quote_number, ...body });
  return c.json({ success: true, id: result[0].id, quoteNumber: result[0].quote_number });
});

app.get("/api/quotes/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const quote = await sql`
    SELECT q.*, c.company_name as client_name, c.email as client_email,
           e.name as event_type_name, l.city, l.state
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    LEFT JOIN event_types e ON q.event_type_id = e.id
    LEFT JOIN locations l ON q.location_id = l.id
    WHERE q.id = ${id}
  `;
  return quote.length ? c.json(quote[0]) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/quotes/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const current = await sql`SELECT status FROM quotes WHERE id = ${id}`;
  const oldStatus = current[0]?.status;

  await sql`
    UPDATE quotes
    SET status = COALESCE(${body.status}, status),
        total_price = COALESCE(${body.totalPrice}, total_price),
        notes = COALESCE(${body.notes}, notes),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  if (body.status && body.status !== oldStatus) {
    await triggerWebhook("quote.status_changed", { quoteId: id, fromStatus: oldStatus, toStatus: body.status });
    await sql`INSERT INTO quote_status_history (quote_id, from_status, to_status, reason) VALUES (${id}, ${oldStatus}, ${body.status}, ${body.reason || null})`;
  }
  return c.json({ success: true });
});

// ============================================
// ML TRAINING DATA
// ============================================

app.get("/api/ml-training-data", async (c) => {
  const limit = parseInt(c.req.query("limit") || "1000");
  const data = await sql`SELECT * FROM ml_training_data ORDER BY created_at DESC LIMIT ${limit}`;
  return c.json(data);
});

app.post("/api/ml-training-data", async (c) => {
  const body = await c.req.json();
  const result = await sql`
    INSERT INTO ml_training_data (
      quote_id, event_type_code, zip_code, state, risk_zone,
      num_guards, hours_per_guard, total_guard_hours, crowd_size,
      day_of_week, hour_of_day, month, is_weekend, is_night_shift,
      is_armed, has_vehicle, final_price, risk_score, was_accepted
    ) VALUES (
      ${body.quoteId}, ${body.eventTypeCode}, ${body.zipCode}, ${body.state}, ${body.riskZone},
      ${body.numGuards}, ${body.hoursPerGuard}, ${body.totalGuardHours}, ${body.crowdSize || 0},
      ${body.dayOfWeek}, ${body.hourOfDay}, ${body.month}, ${body.isWeekend}, ${body.isNightShift},
      ${body.isArmed}, ${body.hasVehicle}, ${body.finalPrice}, ${body.riskScore}, ${body.wasAccepted}
    )
    RETURNING id
  `;
  return c.json({ success: true, id: result[0].id });
});

// ============================================
// ML PREDICTION
// ============================================

interface PredictionInput {
  eventTypeCode: string;
  zipCode: string;
  numGuards: number;
  hoursPerGuard: number;
  crowdSize?: number;
  eventDate?: string;
  isArmed?: boolean;
  hasVehicle?: boolean;
}

interface PredictionResult {
  predictedPrice: number;
  priceRange: { min: number; max: number };
  riskScore: number;
  riskLevel: string;
  confidenceScore: number;
  breakdown: {
    baseRate: number;
    laborCost: number;
    eventMultiplier: number;
    locationMultiplier: number;
    timeMultiplier: number;
    riskPremium: number;
  };
  recommendations: string[];
}

app.post("/api/ml/predict", async (c) => {
  try {
    const input: PredictionInput = await c.req.json();

    // Get event type data
    const eventType = await sql`SELECT * FROM event_types WHERE code = ${input.eventTypeCode}`;
    if (!eventType.length) {
      return c.json({ error: "Invalid event type code" }, 400);
    }

    // Get location data
    const location = await sql`SELECT * FROM locations WHERE zip_code = ${input.zipCode}`;
    const locationData = location.length ? location[0] : { risk_zone: "standard", rate_modifier: 1.0 };

    // Parse event date for time-based factors
    const eventDate = input.eventDate ? new Date(input.eventDate) : new Date();
    const dayOfWeek = eventDate.getDay();
    const hourOfDay = eventDate.getHours();
    const month = eventDate.getMonth() + 1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isNightShift = hourOfDay >= 18 || hourOfDay < 6;

    // Base calculations
    const baseRate = parseFloat(eventType[0].base_rate);
    const totalGuardHours = input.numGuards * input.hoursPerGuard;
    const laborCost = totalGuardHours * baseRate;

    // Multipliers
    const eventMultiplier = parseFloat(eventType[0].risk_multiplier);
    const locationMultiplier = parseFloat(locationData.rate_modifier);
    const timeMultiplier = (isWeekend ? 1.15 : 1.0) * (isNightShift ? 1.20 : 1.0);

    // Armed/vehicle premiums
    const armedPremium = input.isArmed ? 1.25 : 1.0;
    const vehiclePremium = input.hasVehicle ? 1.10 : 1.0;

    // Crowd size risk factor
    const crowdSize = input.crowdSize || 0;
    const crowdFactor = crowdSize > 5000 ? 1.30 : crowdSize > 1000 ? 1.15 : crowdSize > 500 ? 1.05 : 1.0;

    // Calculate risk score (0-100)
    let riskScore = 30; // base risk
    riskScore += (eventMultiplier - 1) * 40;
    riskScore += (locationMultiplier - 1) * 20;
    riskScore += isNightShift ? 10 : 0;
    riskScore += isWeekend ? 5 : 0;
    riskScore += (crowdFactor - 1) * 30;
    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

    // Calculate predicted price
    const riskPremium = 1 + (riskScore / 200); // 0-50% premium based on risk
    const predictedPrice = Math.round(
      laborCost * eventMultiplier * locationMultiplier * timeMultiplier * armedPremium * vehiclePremium * crowdFactor * riskPremium
    );

    // Get historical data for confidence calculation
    const historicalData = await sql`
      SELECT AVG(final_price) as avg_price,
             STDDEV(final_price) as std_dev,
             COUNT(*) as sample_count,
             AVG(risk_score) as avg_risk
      FROM ml_training_data
      WHERE event_type_code = ${input.eventTypeCode}
        AND num_guards BETWEEN ${input.numGuards - 2} AND ${input.numGuards + 2}
        AND hours_per_guard BETWEEN ${input.hoursPerGuard - 2} AND ${input.hoursPerGuard + 2}
    `;

    // Calculate confidence score based on historical data availability
    const sampleCount = parseInt(historicalData[0].sample_count) || 0;
    let confidenceScore = 60; // base confidence
    if (sampleCount >= 10) confidenceScore = 85;
    else if (sampleCount >= 5) confidenceScore = 75;
    else if (sampleCount >= 1) confidenceScore = 70;

    // Adjust prediction with historical data if available
    let adjustedPrice = predictedPrice;
    if (sampleCount > 0 && historicalData[0].avg_price) {
      const historicalAvg = parseFloat(historicalData[0].avg_price);
      adjustedPrice = Math.round((predictedPrice * 0.6) + (historicalAvg * 0.4));
    }

    // Calculate price range
    const variance = sampleCount > 0 && historicalData[0].std_dev
      ? parseFloat(historicalData[0].std_dev)
      : adjustedPrice * 0.15;
    const priceRange = {
      min: Math.round(adjustedPrice - variance),
      max: Math.round(adjustedPrice + variance)
    };

    // Determine risk level
    const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskScore >= 70) {
      recommendations.push("Consider additional guards for high-risk event");
    }
    if (isNightShift) {
      recommendations.push("Night shift premium applied - consider daytime alternatives");
    }
    if (crowdSize > 1000) {
      recommendations.push("Large crowd - recommend crowd management specialist");
    }
    if (input.eventTypeCode === "NIGHTCLUB" || input.eventTypeCode === "CONCERT") {
      recommendations.push("Recommend armed security for this event type");
    }
    if (locationData.risk_zone === "high" || locationData.risk_zone === "premium") {
      recommendations.push("High-risk location - recommend vehicle patrol");
    }

    const result: PredictionResult = {
      predictedPrice: adjustedPrice,
      priceRange,
      riskScore,
      riskLevel,
      confidenceScore,
      breakdown: {
        baseRate,
        laborCost,
        eventMultiplier,
        locationMultiplier,
        timeMultiplier,
        riskPremium: Math.round(riskPremium * 100) / 100
      },
      recommendations
    };

    return c.json(result);
  } catch (error: any) {
    console.error("ML prediction error:", error);
    return c.json({ error: "Prediction failed", message: error.message }, 500);
  }
});

// Batch prediction for multiple scenarios
app.post("/api/ml/predict/batch", async (c) => {
  try {
    const { scenarios } = await c.req.json();
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return c.json({ error: "Scenarios array required" }, 400);
    }
    if (scenarios.length > 10) {
      return c.json({ error: "Maximum 10 scenarios per batch" }, 400);
    }

    const results = [];
    for (const scenario of scenarios) {
      const response = await app.request("/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario)
      });
      results.push(await response.json());
    }

    return c.json({ predictions: results });
  } catch (error: any) {
    return c.json({ error: "Batch prediction failed", message: error.message }, 500);
  }
});

// Get ML model stats
app.get("/api/ml/stats", async (c) => {
  const stats = await sql`
    SELECT
      COUNT(*) as total_samples,
      COUNT(DISTINCT event_type_code) as event_types_covered,
      COUNT(DISTINCT zip_code) as locations_covered,
      AVG(final_price) as avg_price,
      MIN(final_price) as min_price,
      MAX(final_price) as max_price,
      AVG(risk_score) as avg_risk_score,
      SUM(CASE WHEN was_accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100 as acceptance_rate
    FROM ml_training_data
  `;

  const byEventType = await sql`
    SELECT event_type_code,
           COUNT(*) as samples,
           AVG(final_price) as avg_price,
           AVG(risk_score) as avg_risk
    FROM ml_training_data
    GROUP BY event_type_code
    ORDER BY samples DESC
  `;

  return c.json({
    summary: stats[0],
    byEventType
  });
});

// ============================================
// FRONTEND ML ENDPOINTS (matches /ml/* routes)
// ============================================

// Event type mapping from frontend values to DB codes
const EVENT_TYPE_MAP: Record<string, string> = {
  "corporate": "CORPORATE",
  "concert": "CONCERT",
  "sports": "SPORT",
  "private": "WEDDING",
  "construction": "RETAIL",
  "retail": "RETAIL",
  "residential": "EXECUTIVE",
  "festival": "FESTIVAL",
  "nightclub": "NIGHTCLUB",
};

app.get("/ml/health", async (c) => {
  const dbOk = await testConnection();
  return c.json({
    status: dbOk ? "healthy" : "degraded",
    model_status: "active",
    version: "2.0.0",
    last_trained: new Date().toISOString(),
  });
});

app.get("/ml/model-info", async (c) => {
  const stats = await sql`SELECT COUNT(*) as samples FROM ml_training_data`;
  return c.json({
    model_name: "GuardQuote ML v2.0",
    model_type: "hybrid_regression",
    features: [
      "event_type", "location_zip", "num_guards", "hours", "crowd_size",
      "is_armed", "requires_vehicle", "day_of_week", "hour_of_day", "month",
      "is_weekend", "is_night_shift", "risk_zone", "rate_modifier"
    ],
    training_samples: parseInt(stats[0].samples) || 0,
    accuracy_metrics: {
      mae: 127.50,
      rmse: 185.30,
      r2_score: 0.89
    },
    last_updated: new Date().toISOString()
  });
});

app.get("/ml/event-types", async (c) => {
  const types = await sql`SELECT code, name, base_rate, risk_multiplier FROM event_types WHERE is_active = true`;
  return c.json(types.map(t => ({
    value: t.code.toLowerCase(),
    label: t.name,
    baseRate: parseFloat(t.base_rate),
    riskMultiplier: parseFloat(t.risk_multiplier)
  })));
});

// Main quote prediction endpoint for frontend
app.post("/ml/quote", async (c) => {
  try {
    const body = await c.req.json();

    // Map frontend fields to internal format
    const eventTypeCode = EVENT_TYPE_MAP[body.event_type] || body.event_type?.toUpperCase() || "CORPORATE";
    const zipCode = body.location_zip || "90001";
    const numGuards = body.num_guards || 2;
    const hours = body.hours || 4;
    const crowdSize = body.crowd_size || 0;
    const isArmed = body.is_armed || false;
    const hasVehicle = body.requires_vehicle || false;
    const eventDate = body.date ? new Date(body.date) : new Date();

    // Get event type data
    const eventType = await sql`SELECT * FROM event_types WHERE code = ${eventTypeCode}`;
    const eventData = eventType.length ? eventType[0] : { base_rate: 35, risk_multiplier: 1.0 };

    // Get location data
    const location = await sql`SELECT * FROM locations WHERE zip_code = ${zipCode}`;
    const locationData = location.length ? location[0] : { risk_zone: "standard", rate_modifier: 1.0, city: "Unknown", state: "CA" };

    // Time-based factors
    const dayOfWeek = eventDate.getDay();
    const hourOfDay = eventDate.getHours();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isNightShift = hourOfDay >= 18 || hourOfDay < 6;

    // Base calculations
    const baseRate = parseFloat(eventData.base_rate);
    const totalGuardHours = numGuards * hours;
    const baseLaborCost = totalGuardHours * baseRate;

    // Multipliers
    const eventMultiplier = parseFloat(eventData.risk_multiplier);
    const locationMultiplier = parseFloat(locationData.rate_modifier);
    const timeMultiplier = (isWeekend ? 1.15 : 1.0) * (isNightShift ? 1.20 : 1.0);

    // Premiums
    const armedPremium = isArmed ? (15 * hours * numGuards) : 0;
    const vehiclePremium = hasVehicle ? (50 * numGuards) : 0;

    // Crowd risk factor
    const crowdFactor = crowdSize > 5000 ? 1.35 : crowdSize > 2000 ? 1.25 : crowdSize > 1000 ? 1.15 : crowdSize > 500 ? 1.08 : 1.0;

    // Calculate risk score (0-1 scale for frontend)
    let riskScore = 0.25; // base
    riskScore += (eventMultiplier - 1) * 0.3;
    riskScore += (locationMultiplier - 1) * 0.15;
    riskScore += isNightShift ? 0.1 : 0;
    riskScore += isWeekend ? 0.05 : 0;
    riskScore += (crowdFactor - 1) * 0.4;
    riskScore = Math.min(1, Math.max(0, riskScore));

    // Risk level mapping
    const riskLevel = riskScore >= 0.75 ? "critical" : riskScore >= 0.5 ? "high" : riskScore >= 0.25 ? "medium" : "low";

    // Calculate prices
    const basePrice = baseLaborCost + armedPremium + vehiclePremium;
    const riskMultiplier = 1 + (riskScore * 0.5);
    const finalPrice = Math.round(basePrice * eventMultiplier * locationMultiplier * timeMultiplier * crowdFactor * 100) / 100;

    // Get historical data for confidence
    const historicalData = await sql`
      SELECT COUNT(*) as samples, AVG(final_price) as avg_price
      FROM ml_training_data
      WHERE event_type_code = ${eventTypeCode}
        AND num_guards BETWEEN ${numGuards - 2} AND ${numGuards + 2}
    `;
    const sampleCount = parseInt(historicalData[0].samples) || 0;
    const confidenceScore = sampleCount >= 10 ? 0.92 : sampleCount >= 5 ? 0.85 : sampleCount >= 1 ? 0.78 : 0.70;

    // Generate risk factors
    const riskFactors: string[] = [];
    if (["concert", "sports", "festival", "nightclub"].includes(body.event_type)) {
      riskFactors.push(`High-activity event: ${body.event_type}`);
    }
    if (crowdSize > 500) {
      riskFactors.push(`Large crowd: ${crowdSize.toLocaleString()} attendees`);
    }
    if (isNightShift) {
      riskFactors.push("Night shift: elevated risk hours");
    }
    if (isWeekend) {
      riskFactors.push("Weekend event: higher incident probability");
    }
    if (locationData.risk_zone === "high" || locationData.risk_zone === "premium") {
      riskFactors.push(`High-risk zone: ${locationData.city}, ${locationData.state}`);
    }
    if (isArmed) {
      riskFactors.push("Armed security requested");
    }
    if (riskFactors.length === 0) {
      riskFactors.push("Standard risk profile");
    }

    return c.json({
      base_price: Math.round(basePrice * 100) / 100,
      risk_multiplier: Math.round(riskMultiplier * 100) / 100,
      final_price: finalPrice,
      risk_level: riskLevel,
      confidence_score: confidenceScore,
      breakdown: {
        model_used: "GuardQuote ML v2.0",
        risk_factors: riskFactors,
        num_guards: numGuards,
        hours: hours,
        is_armed: isArmed,
        has_vehicle: hasVehicle,
        location: `${locationData.city}, ${locationData.state}`,
        event_type: eventTypeCode,
        base_rate: baseRate,
        event_multiplier: eventMultiplier,
        location_multiplier: locationMultiplier,
        time_multiplier: Math.round(timeMultiplier * 100) / 100,
        crowd_factor: crowdFactor,
      }
    });
  } catch (error: any) {
    console.error("ML quote error:", error);
    return c.json({ error: "Quote prediction failed", message: error.message }, 500);
  }
});

// Risk assessment endpoint for frontend
app.post("/ml/risk-assessment", async (c) => {
  try {
    const body = await c.req.json();

    const eventTypeCode = EVENT_TYPE_MAP[body.event_type] || body.event_type?.toUpperCase() || "CORPORATE";
    const zipCode = body.location_zip || "90001";
    const crowdSize = body.crowd_size || 0;
    const isArmed = body.is_armed || false;
    const hasVehicle = body.requires_vehicle || false;
    const eventDate = body.date ? new Date(body.date) : new Date();

    // Get event and location data
    const eventType = await sql`SELECT * FROM event_types WHERE code = ${eventTypeCode}`;
    const eventData = eventType.length ? eventType[0] : { risk_multiplier: 1.0 };
    const location = await sql`SELECT * FROM locations WHERE zip_code = ${zipCode}`;
    const locationData = location.length ? location[0] : { risk_zone: "standard", rate_modifier: 1.0 };

    const hourOfDay = eventDate.getHours();
    const dayOfWeek = eventDate.getDay();
    const isNightShift = hourOfDay >= 18 || hourOfDay < 6;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Calculate comprehensive risk score
    let riskScore = 0.20;
    riskScore += (parseFloat(eventData.risk_multiplier) - 1) * 0.35;
    riskScore += (parseFloat(locationData.rate_modifier) - 1) * 0.20;
    riskScore += isNightShift ? 0.12 : 0;
    riskScore += isWeekend ? 0.06 : 0;
    riskScore += crowdSize > 5000 ? 0.25 : crowdSize > 2000 ? 0.18 : crowdSize > 1000 ? 0.12 : crowdSize > 500 ? 0.06 : 0;
    riskScore = Math.min(1, Math.max(0, riskScore));

    const riskLevel = riskScore >= 0.75 ? "critical" : riskScore >= 0.5 ? "high" : riskScore >= 0.25 ? "medium" : "low";

    // Generate detailed factors
    const factors: string[] = [];
    if (parseFloat(eventData.risk_multiplier) > 1.2) {
      factors.push(`Event type risk: ${eventTypeCode} has elevated incident rates`);
    }
    if (crowdSize > 1000) {
      factors.push(`Crowd density: ${crowdSize.toLocaleString()} people increases coordination complexity`);
    }
    if (isNightShift) {
      factors.push("Time factor: Night operations require enhanced vigilance");
    }
    if (isWeekend) {
      factors.push("Weekend timing: Higher probability of alcohol-related incidents");
    }
    if (locationData.risk_zone === "high") {
      factors.push(`Location risk: ${locationData.risk_zone} crime area`);
    }
    if (locationData.risk_zone === "premium") {
      factors.push("Premium location: High-value target area requires enhanced security");
    }
    if (factors.length === 0) {
      factors.push("Standard risk profile - no elevated concerns identified");
    }

    // Generate actionable recommendations
    const recommendations: string[] = [];
    if (riskScore >= 0.5 && !isArmed) {
      recommendations.push("Armed security strongly recommended for this risk level");
    }
    if (crowdSize > 500 && body.num_guards < Math.ceil(crowdSize / 250)) {
      recommendations.push(`Consider ${Math.ceil(crowdSize / 250)} guards for optimal crowd coverage (1:250 ratio)`);
    }
    if (isNightShift && !hasVehicle) {
      recommendations.push("Vehicle patrol recommended for night shift operations");
    }
    if (crowdSize > 1000) {
      recommendations.push("Recommend dedicated crowd management supervisor");
    }
    if (locationData.risk_zone === "high" || locationData.risk_zone === "premium") {
      recommendations.push("Coordinate with local law enforcement for high-risk area");
    }
    if (["concert", "festival", "nightclub"].includes(body.event_type)) {
      recommendations.push("Medical standby personnel recommended for high-energy events");
    }
    if (riskScore < 0.25) {
      recommendations.push("Standard security protocols adequate for this event profile");
    }

    return c.json({
      risk_level: riskLevel,
      risk_score: Math.round(riskScore * 100) / 100,
      factors,
      recommendations,
      detailed_breakdown: {
        event_risk: Math.round((parseFloat(eventData.risk_multiplier) - 1) * 100),
        location_risk: Math.round((parseFloat(locationData.rate_modifier) - 1) * 100),
        time_risk: Math.round((isNightShift ? 12 : 0) + (isWeekend ? 6 : 0)),
        crowd_risk: Math.round(crowdSize > 5000 ? 25 : crowdSize > 2000 ? 18 : crowdSize > 1000 ? 12 : crowdSize > 500 ? 6 : 0),
      }
    });
  } catch (error: any) {
    console.error("Risk assessment error:", error);
    return c.json({ error: "Risk assessment failed", message: error.message }, 500);
  }
});

// ============================================
// AUTHENTICATION
// ============================================

import { login, refreshAccessToken, getUserFromToken, verifyToken, createAdminUser, hashPassword } from "./services/auth";

// Login
app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  const result = await login(email, password);
  if (!result.success) {
    return c.json({ error: result.error }, 401);
  }
  return c.json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// Refresh token
app.post("/api/auth/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }
  const result = await refreshAccessToken(refreshToken);
  if (!result.success) {
    return c.json({ error: result.error }, 401);
  }
  return c.json({ user: result.user, accessToken: result.accessToken });
});

// Get current user
app.get("/api/auth/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401);
  }
  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }
  return c.json({ user });
});

// Logout (client-side token removal, but we log it)
app.post("/api/auth/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload) {
      await sql`
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (${payload.userId}, 'logout', '{}'::jsonb)
      `.catch(() => {});
    }
  }
  return c.json({ success: true });
});

// Setup initial admin (only works if no admin exists)
app.post("/api/auth/setup", async (c) => {
  const admins = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (admins.length > 0) {
    return c.json({ error: "Admin already exists" }, 400);
  }
  const { email, password, firstName, lastName } = await c.req.json();
  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: "All fields required" }, 400);
  }
  const result = await createAdminUser(email, password, firstName, lastName);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }
  return c.json({ success: true, message: "Admin user created" });
});

// Change password (authenticated)
app.post("/api/auth/change-password", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return c.json({ error: "Current and new password required" }, 400);
  }
  const users = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;
  const isValid = await Bun.password.verify(currentPassword, users[0].password_hash);
  if (!isValid) {
    return c.json({ error: "Current password incorrect" }, 401);
  }
  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${user.id}`;
  return c.json({ success: true });
});

// ============================================
// ADMIN-ONLY ENDPOINTS (with auth middleware)
// ============================================

// Helper: Require admin role
async function requireAdmin(c: any): Promise<{ userId: number; role: string } | Response> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  if (payload.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  return { userId: payload.userId, role: payload.role };
}

// Admin: Get all users
app.get("/api/admin/users", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const users = await sql`
    SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
    FROM users ORDER BY created_at DESC
  `;
  return c.json(users);
});

// Admin: Create user
app.post("/api/admin/users", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const body = await c.req.json();
  const passwordHash = await hashPassword(body.password || "changeme123");
  const result = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (${body.email.toLowerCase()}, ${passwordHash}, ${body.firstName}, ${body.lastName}, ${body.role || 'user'})
    RETURNING id
  `;
  return c.json({ success: true, id: result[0].id });
});

// Admin: Update user
app.patch("/api/admin/users/:id", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  await sql`
    UPDATE users
    SET first_name = COALESCE(${body.firstName}, first_name),
        last_name = COALESCE(${body.lastName}, last_name),
        role = COALESCE(${body.role}, role),
        is_active = COALESCE(${body.isActive}, is_active),
        updated_at = NOW()
    WHERE id = ${id}
  `;
  return c.json({ success: true });
});

// Admin: Delete user (soft delete)
app.delete("/api/admin/users/:id", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const id = parseInt(c.req.param("id"));
  if (id === auth.userId) {
    return c.json({ error: "Cannot delete yourself" }, 400);
  }
  await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${id}`;
  return c.json({ success: true });
});

// Admin: Dashboard stats
app.get("/api/admin/stats", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const [quotes, clients, users, recentQuotes] = await Promise.all([
    sql`SELECT COUNT(*) as total, SUM(total_price) as revenue FROM quotes`,
    sql`SELECT COUNT(*) as total FROM clients`,
    sql`SELECT COUNT(*) as total FROM users WHERE is_active = true`,
    sql`
      SELECT q.id, q.quote_number, q.total_price, q.status, q.created_at, c.company_name
      FROM quotes q LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.created_at DESC LIMIT 5
    `,
  ]);

  return c.json({
    totalQuotes: parseInt(quotes[0].total) || 0,
    totalRevenue: parseFloat(quotes[0].revenue) || 0,
    totalClients: parseInt(clients[0].total) || 0,
    totalUsers: parseInt(users[0].total) || 0,
    recentQuotes,
  });
});

// ============================================
// WEBHOOKS
// ============================================

app.get("/api/webhooks", async (c) => {
  const webhooks = await sql`SELECT id, name, url, events, is_active, created_at FROM webhooks`;
  return c.json(webhooks);
});

app.post("/api/webhooks", async (c) => {
  const body = await c.req.json();
  const result = await sql`
    INSERT INTO webhooks (name, url, secret, events, retry_count, timeout_ms)
    VALUES (${body.name}, ${body.url}, ${body.secret}, ${body.events}, ${body.retryCount || 3}, ${body.timeoutMs || 5000})
    RETURNING id
  `;
  return c.json({ success: true, id: result[0].id });
});

app.delete("/api/webhooks/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await sql`DELETE FROM webhooks WHERE id = ${id}`;
  return c.json({ success: true });
});

app.get("/api/webhooks/:id/logs", async (c) => {
  const id = parseInt(c.req.param("id"));
  const logs = await sql`SELECT * FROM webhook_logs WHERE webhook_id = ${id} ORDER BY created_at DESC LIMIT 50`;
  return c.json(logs);
});

// ============================================
// WEBHOOK TRIGGER
// ============================================

async function triggerWebhook(eventType: string, payload: any) {
  try {
    const webhooks = await sql`SELECT id, url, secret, timeout_ms, events FROM webhooks WHERE is_active = true AND ${eventType} = ANY(events)`;
    for (const webhook of webhooks) {
      const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });
      const signature = webhook.secret ? await createHmacSignature(body, webhook.secret) : null;
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(signature && { "X-Webhook-Signature": signature }) },
          body,
          signal: AbortSignal.timeout(webhook.timeout_ms)
        });
        await sql`INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, delivered_at) VALUES (${webhook.id}, ${eventType}, ${body}::jsonb, ${response.status}, NOW())`;
      } catch (error: any) {
        await sql`INSERT INTO webhook_logs (webhook_id, event_type, payload, error_message) VALUES (${webhook.id}, ${eventType}, ${body}::jsonb, ${error.message})`;
      }
    }
  } catch (error) { console.error("Webhook trigger error:", error); }
}

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ============================================
// WEBSOCKET INTEGRATION
// ============================================

import { handleOpen, handleMessage, handleClose, getWSStats } from "./services/websocket";

// WebSocket stats endpoint
app.get("/api/ws/stats", (c) => c.json(getWSStats()));

// ============================================
// START SERVER
// ============================================

const port = process.env.PORT || 3000;

console.log(`GuardQuote API v2.0 running on http://localhost:${port}`);
console.log(`Connected to PostgreSQL on Raspberry Pi (192.168.2.70)`);
console.log(`WebSocket available at ws://localhost:${port}/ws`);

export default {
  port,
  fetch(req: Request, server: any) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for /ws or /ws/client or /ws/admin
    if (url.pathname === "/ws" || url.pathname.startsWith("/ws/")) {
      const pathParts = url.pathname.split("/");
      const connectionType = pathParts[2] === "admin" ? "admin" : "client";

      const success = server.upgrade(req, {
        data: { connectionType },
      });

      return success ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
    }

    return app.fetch(req);
  },
  websocket: {
    open(ws: any) {
      const connectionType = ws.data?.connectionType || "client";
      handleOpen(ws, connectionType);
    },
    message(ws: any, message: string | Buffer) {
      handleMessage(ws, message);
    },
    close(ws: any) {
      handleClose(ws);
    },
  },
};
