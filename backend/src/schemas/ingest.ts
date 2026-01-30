/**
 * Zod-based Schema Transformation for AI/Gemini Output Ingestion
 *
 * Solves the "column mismatch" problem when AI generates training specs
 * with different naming conventions (e.g., base_hourly_rate vs base_rate)
 */
import { z } from "zod";

// ============================================
// EVENT TYPE INGEST SCHEMA
// ============================================

export const IngestEventTypeSchema = z
  .object({
    // Accept multiple possible keys from various AI generators
    code: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),

    // Rate handling - accept various AI naming conventions
    base_rate: z.number().optional(),
    base_hourly_rate: z.number().optional(),
    hourly_rate: z.number().optional(),
    rate: z.number().optional(),

    // Risk multiplier - accept various naming conventions
    risk_multiplier: z.number().optional(),
    risk_weight: z.number().optional(),
    risk_factor: z.number().optional(),
    multiplier: z.number().optional(),
  })
  .transform((data) => ({
    // Transform to canonical internal schema
    code:
      data.code ??
      data.name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, ""),
    name: data.name,
    description: data.description ?? null,
    baseRate: data.base_rate ?? data.base_hourly_rate ?? data.hourly_rate ?? data.rate ?? 35.0,
    riskMultiplier:
      data.risk_multiplier ?? data.risk_weight ?? data.risk_factor ?? data.multiplier ?? 1.0,
  }));

export type CanonicalEventType = z.infer<typeof IngestEventTypeSchema>;

// ============================================
// LOCATION INGEST SCHEMA
// ============================================

export const IngestLocationSchema = z
  .object({
    zip_code: z.string(),
    city: z.string(),
    state: z.string(),

    // Risk zone - accept various naming conventions
    risk_zone: z.string().optional(),
    risk_level: z.string().optional(),
    zone: z.string().optional(),

    // Rate modifier - accept various naming conventions
    rate_modifier: z.number().optional(),
    base_multiplier: z.number().optional(),
    location_multiplier: z.number().optional(),
    modifier: z.number().optional(),

    // Ignored fields from AI output (gracefully skip)
    county: z.string().optional(),
    region: z.string().optional(),
    venue_type: z.string().optional(),
  })
  .transform((data) => ({
    zipCode: data.zip_code,
    city: data.city,
    state: data.state.length === 2 ? data.state.toUpperCase() : data.state,
    riskZone: data.risk_zone ?? data.risk_level ?? data.zone ?? "medium",
    rateModifier:
      data.rate_modifier ??
      data.base_multiplier ??
      data.location_multiplier ??
      data.modifier ??
      1.0,
  }));

export type CanonicalLocation = z.infer<typeof IngestLocationSchema>;

// ============================================
// ML TRAINING DATA INGEST SCHEMA
// ============================================

export const IngestTrainingDataSchema = z
  .object({
    event_type: z.string(),

    // Location fields
    zip_code: z.string().optional(),
    state: z.string().optional(),
    risk_zone: z.string().optional(),
    location_risk: z.number().optional(),

    // Guard requirements
    num_guards: z.number().optional(),
    guards: z.number().optional(),
    guard_count: z.number().optional(),

    hours_per_guard: z.number().optional(),
    hours: z.number().optional(),
    duration: z.number().optional(),

    crowd_size: z.number().optional(),
    crowd: z.number().optional(),
    attendees: z.number().optional(),

    // Service tier
    tier: z.union([z.string(), z.number()]).optional(),
    service_level: z.string().optional(),

    // Boolean flags - accept various formats
    is_weekend: z.union([z.boolean(), z.number()]).optional(),
    weekend: z.union([z.boolean(), z.number()]).optional(),

    is_holiday: z.union([z.boolean(), z.number()]).optional(),
    holiday: z.union([z.boolean(), z.number()]).optional(),

    is_night: z.union([z.boolean(), z.number()]).optional(),
    is_night_shift: z.union([z.boolean(), z.number()]).optional(),
    night_shift: z.union([z.boolean(), z.number()]).optional(),

    is_armed: z.union([z.boolean(), z.number()]).optional(),
    armed: z.union([z.boolean(), z.number()]).optional(),

    has_vehicle: z.union([z.boolean(), z.number()]).optional(),
    vehicle: z.union([z.boolean(), z.number()]).optional(),

    // Time fields
    day_of_week: z.number().optional(),
    hour_of_day: z.number().optional(),
    month: z.number().optional(),

    // Target variables
    price: z.number(),
    final_price: z.number().optional(),
    total_price: z.number().optional(),

    accepted: z.union([z.boolean(), z.number()]).optional(),
    was_accepted: z.union([z.boolean(), z.number()]).optional(),

    satisfaction: z.number().optional(),
    rating: z.number().optional(),

    // AI/Cloud fields (2026 features)
    ai_agent: z.union([z.boolean(), z.number()]).optional(),
    cloud: z.union([z.string(), z.number()]).optional(),
  })
  .transform((data) => {
    // Helper to convert to boolean
    const toBool = (val: boolean | number | undefined): boolean => {
      if (val === undefined) return false;
      return val === true || val === 1;
    };

    // Helper to map tier string to number
    const tierToNum = (val: string | number | undefined): number => {
      if (typeof val === "number") return val;
      if (val === "standard" || val === "Standard") return 1;
      if (val === "armed" || val === "Armed") return 2;
      if (val === "executive" || val === "Executive") return 3;
      return 1;
    };

    const numGuards = data.num_guards ?? data.guards ?? data.guard_count ?? 2;
    const hoursPerGuard = data.hours_per_guard ?? data.hours ?? data.duration ?? 4;

    return {
      eventType: data.event_type,
      zipCode: data.zip_code ?? "90001",
      state: data.state ?? "CA",
      riskZone: data.risk_zone ?? "medium",
      numGuards,
      hoursPerGuard,
      totalGuardHours: numGuards * hoursPerGuard,
      crowdSize: data.crowd_size ?? data.crowd ?? data.attendees ?? 0,
      tier: tierToNum(data.tier ?? data.service_level),
      isWeekend: toBool(data.is_weekend ?? data.weekend),
      isHoliday: toBool(data.is_holiday ?? data.holiday),
      isNightShift: toBool(data.is_night ?? data.is_night_shift ?? data.night_shift),
      isArmed: toBool(data.is_armed ?? data.armed),
      hasVehicle: toBool(data.has_vehicle ?? data.vehicle),
      dayOfWeek: data.day_of_week ?? new Date().getDay(),
      hourOfDay: data.hour_of_day ?? 12,
      month: data.month ?? new Date().getMonth() + 1,
      price: data.price ?? data.final_price ?? data.total_price ?? 0,
      accepted: toBool(data.accepted ?? data.was_accepted ?? true),
      satisfaction: data.satisfaction ?? data.rating ?? null,
      aiAgent: toBool(data.ai_agent),
      cloud:
        typeof data.cloud === "string"
          ? data.cloud === "AWS"
            ? 1
            : data.cloud === "Azure"
              ? 2
              : data.cloud === "GCP"
                ? 3
                : 0
          : (data.cloud ?? 0),
    };
  });

export type CanonicalTrainingData = z.infer<typeof IngestTrainingDataSchema>;

// ============================================
// BATCH INGEST SCHEMAS
// ============================================

export const IngestEventTypeBatchSchema = z.array(IngestEventTypeSchema);
export const IngestLocationBatchSchema = z.array(IngestLocationSchema);
export const IngestTrainingDataBatchSchema = z.array(IngestTrainingDataSchema);

// ============================================
// SQL GENERATION HELPERS
// ============================================

export function toEventTypeSQL(data: CanonicalEventType): string {
  return `INSERT INTO event_types (code, name, description, base_rate, risk_multiplier)
VALUES ('${data.code}', '${data.name.replace(/'/g, "''")}', ${data.description ? `'${data.description.replace(/'/g, "''")}'` : "NULL"}, ${data.baseRate}, ${data.riskMultiplier})
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  base_rate = EXCLUDED.base_rate,
  risk_multiplier = EXCLUDED.risk_multiplier;`;
}

export function toLocationSQL(data: CanonicalLocation): string {
  return `INSERT INTO locations (zip_code, city, state, risk_zone, rate_modifier)
VALUES ('${data.zipCode}', '${data.city.replace(/'/g, "''")}', '${data.state}', '${data.riskZone}', ${data.rateModifier})
ON CONFLICT (zip_code) DO UPDATE SET
  city = EXCLUDED.city,
  risk_zone = EXCLUDED.risk_zone,
  rate_modifier = EXCLUDED.rate_modifier;`;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateAndTransform<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): { valid: T[]; invalid: { index: number; errors: z.ZodError }[] } {
  const valid: T[] = [];
  const invalid: { index: number; errors: z.ZodError }[] = [];

  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index, errors: result.error });
    }
  });

  return { valid, invalid };
}
