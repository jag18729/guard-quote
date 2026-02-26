/**
 * Quote Calculator Service - Extracted ML calculation logic
 * Used by both REST API and WebSocket for real-time quotes
 *
 * Strategy: Try ML engine via gRPC first, fall back to local rule-based calculation
 */
import { sql } from "../db/connection";
import { generateQuoteML, type MLQuoteRequest } from "./ml-client";

// Event type mapping from frontend values to DB codes
// DB stores lowercase codes: corporate, concert, sports, private, construction, retail, residential
// Frontend may send variations — normalize to DB codes here
const EVENT_TYPE_MAP: Record<string, string> = {
  corporate: "corporate",
  concert: "concert",
  sports: "sports",
  private: "private",
  construction: "construction",
  retail: "retail",
  residential: "residential",
  festival: "festival",
  nightclub: "nightclub",
  // Production DB also has these (v3.0.0):
  gov_rally: "gov_rally",
  industrial: "industrial",
  music_festival: "music_festival",
  retail_lp: "retail_lp",
  social_wedding: "social_wedding",
  tech_summit: "tech_summit",
  vip_protection: "vip_protection",
};

export interface QuoteInput {
  event_type?: string;
  eventType?: string;
  location_zip?: string;
  locationZip?: string;
  num_guards?: number;
  numGuards?: number;
  hours?: number;
  crowd_size?: number;
  crowdSize?: number;
  is_armed?: boolean;
  isArmed?: boolean;
  requires_vehicle?: boolean;
  requiresVehicle?: boolean;
  date?: string;
  eventDate?: string;
}

export interface QuoteResult {
  base_price: number;
  risk_multiplier: number;
  final_price: number;
  risk_level: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  breakdown: {
    model_used: string;
    risk_factors: string[];
    num_guards: number;
    hours: number;
    is_armed: boolean;
    has_vehicle: boolean;
    location?: string;
    event_type?: string;
    base_rate?: number;
    event_multiplier?: number;
    location_multiplier?: number;
    time_multiplier?: number;
    crowd_factor?: number;
  };
  risk_assessment?: {
    risk_level: string;
    risk_score: number;
    factors: string[];
    recommendations: string[];
  };
}

export async function calculateQuote(input: QuoteInput): Promise<QuoteResult> {
  // Normalize input (support both snake_case and camelCase)
  const eventTypeRaw = input.event_type || input.eventType || "corporate";
  const zipCode = input.location_zip || input.locationZip || "90001";
  const numGuards = input.num_guards || input.numGuards || 2;
  const hours = input.hours || 4;
  const crowdSize = input.crowd_size || input.crowdSize || 0;
  const isArmed = input.is_armed || input.isArmed || false;
  const hasVehicle = input.requires_vehicle || input.requiresVehicle || false;
  const eventDateStr = input.date || input.eventDate;
  const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();

  const eventTypeCode = EVENT_TYPE_MAP[eventTypeRaw] || eventTypeRaw.toLowerCase();

  // Try ML engine first (gRPC)
  try {
    const mlRequest: MLQuoteRequest = {
      event_type: eventTypeCode,
      location_zip: zipCode,
      num_guards: numGuards,
      hours: hours,
      event_date: eventDate,
      is_armed: isArmed,
      requires_vehicle: hasVehicle,
      crowd_size: crowdSize,
    };

    const mlResult = await generateQuoteML(mlRequest);

    if (mlResult) {
      console.log(`[Quote] ML engine responded in ${mlResult.processing_time_ms}ms`);
      return {
        base_price: mlResult.base_price,
        risk_multiplier: mlResult.risk_multiplier,
        final_price: mlResult.final_price,
        risk_level: mlResult.risk_level,
        confidence_score: mlResult.confidence_score,
        breakdown: {
          ...mlResult.breakdown,
          location: zipCode,
          event_type: eventTypeCode,
        },
        risk_assessment: {
          risk_level: mlResult.risk_level,
          risk_score: mlResult.risk_multiplier - 1,
          factors: mlResult.breakdown.risk_factors,
          recommendations: [],
        },
      };
    }
  } catch (err) {
    console.warn(`[Quote] ML engine error, falling back to local: ${err}`);
  }

  // Fall back to local rule-based calculation
  console.log("[Quote] Using local rule-based calculation");

  // Get event type data from DB
  const eventType = await sql`SELECT * FROM event_types WHERE code = ${eventTypeCode}`;
  const eventData = eventType.length ? eventType[0] : { base_rate: 35, risk_multiplier: 1.0 };

  // Get location data from DB
  const location = await sql`SELECT * FROM locations WHERE zip_code = ${zipCode}`;
  const locationData = location.length
    ? location[0]
    : { risk_zone: "standard", rate_modifier: 1.0, city: "Unknown", state: "CA" };

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
  const timeMultiplier = (isWeekend ? 1.15 : 1.0) * (isNightShift ? 1.2 : 1.0);

  // Premiums
  const armedPremium = isArmed ? 15 * hours * numGuards : 0;
  const vehiclePremium = hasVehicle ? 50 * numGuards : 0;

  // Crowd risk factor
  const crowdFactor =
    crowdSize > 5000
      ? 1.35
      : crowdSize > 2000
        ? 1.25
        : crowdSize > 1000
          ? 1.15
          : crowdSize > 500
            ? 1.08
            : 1.0;

  // Calculate risk score (0-1 scale)
  let riskScore = 0.25;
  riskScore += (eventMultiplier - 1) * 0.3;
  riskScore += (locationMultiplier - 1) * 0.15;
  riskScore += isNightShift ? 0.1 : 0;
  riskScore += isWeekend ? 0.05 : 0;
  riskScore += (crowdFactor - 1) * 0.4;
  riskScore = Math.min(1, Math.max(0, riskScore));

  // Risk level mapping
  const riskLevel: "low" | "medium" | "high" | "critical" =
    riskScore >= 0.75
      ? "critical"
      : riskScore >= 0.5
        ? "high"
        : riskScore >= 0.25
          ? "medium"
          : "low";

  // Calculate prices
  const basePrice = baseLaborCost + armedPremium + vehiclePremium;
  const riskMultiplier = 1 + riskScore * 0.5;
  const finalPrice =
    Math.round(
      basePrice * eventMultiplier * locationMultiplier * timeMultiplier * crowdFactor * 100
    ) / 100;

  // Get historical data for confidence
  const historicalData = await sql`
    SELECT COUNT(*) as samples, AVG(final_price) as avg_price
    FROM ml_training_data
    WHERE event_type_code = ${eventTypeCode}
      AND num_guards BETWEEN ${numGuards - 2} AND ${numGuards + 2}
  `;
  const sampleCount = parseInt(historicalData[0].samples, 10) || 0;
  const confidenceScore =
    sampleCount >= 10 ? 0.92 : sampleCount >= 5 ? 0.85 : sampleCount >= 1 ? 0.78 : 0.7;

  // Generate risk factors
  const riskFactors: string[] = [];
  if (["concert", "sports", "festival", "nightclub"].includes(eventTypeRaw)) {
    riskFactors.push(`High-activity event: ${eventTypeRaw}`);
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

  // Generate recommendations
  const recommendations: string[] = [];
  if (riskScore >= 0.5 && !isArmed) {
    recommendations.push("Armed security strongly recommended for this risk level");
  }
  if (crowdSize > 500 && numGuards < Math.ceil(crowdSize / 250)) {
    recommendations.push(
      `Consider ${Math.ceil(crowdSize / 250)} guards for optimal coverage (1:250 ratio)`
    );
  }
  if (isNightShift && !hasVehicle) {
    recommendations.push("Vehicle patrol recommended for night shift operations");
  }
  if (crowdSize > 1000) {
    recommendations.push("Recommend dedicated crowd management supervisor");
  }
  if (riskScore < 0.25) {
    recommendations.push("Standard security protocols adequate");
  }

  return {
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
    },
    risk_assessment: {
      risk_level: riskLevel,
      risk_score: Math.round(riskScore * 100) / 100,
      factors: riskFactors,
      recommendations: recommendations,
    },
  };
}
