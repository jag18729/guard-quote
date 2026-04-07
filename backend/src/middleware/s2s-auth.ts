/**
 * Service-to-Service Authentication Middleware
 *
 * Uses Pre-Shared Key (PSK) for internal service communication.
 * The ML Engine validates requests from the Backend using this header.
 */

import type { Context, Next } from "hono";
import { timingSafeEqual } from "node:crypto";

// Environment-based secret (should be in .env)
const ML_ENGINE_SECRET = process.env.ML_ENGINE_SECRET;
if (!ML_ENGINE_SECRET) throw new Error("ML_ENGINE_SECRET environment variable is required");
// Pre-encode the secret once at module load. timingSafeEqual requires
// equal-length buffers, so the request handler length-checks first to
// avoid the throw. The length itself is not the secret.
const ML_ENGINE_SECRET_BUF = Buffer.from(ML_ENGINE_SECRET, "utf8");
const S2S_HEADER = "X-Internal-Secret";

/**
 * Middleware to validate S2S authentication
 */
export function requireS2SAuth() {
  return async (c: Context, next: Next) => {
    const secret = c.req.header(S2S_HEADER);

    if (!secret) {
      return c.json({ error: "S2S authentication required", code: "MISSING_S2S_AUTH" }, 401);
    }

    // Constant-time comparison to defeat timing attacks (audit finding #1).
    const providedBuf = Buffer.from(secret, "utf8");
    if (
      providedBuf.length !== ML_ENGINE_SECRET_BUF.length ||
      !timingSafeEqual(providedBuf, ML_ENGINE_SECRET_BUF)
    ) {
      return c.json({ error: "Invalid S2S credentials", code: "INVALID_S2S_AUTH" }, 403);
    }

    await next();
  };
}

/**
 * Helper to make authenticated requests to the ML Engine
 */
export async function mlEngineRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const mlEngineUrl = process.env.ML_ENGINE_URL || "http://localhost:8000";

  const headers = new Headers(options.headers);
  headers.set(S2S_HEADER, ML_ENGINE_SECRET);
  headers.set("Content-Type", "application/json");

  return fetch(`${mlEngineUrl}${endpoint}`, {
    ...options,
    headers,
  });
}

/**
 * Typed helper for ML Engine predictions
 */
export interface MLPredictionRequest {
  event_type: string;
  location_zip: string;
  num_guards: number;
  hours: number;
  crowd_size?: number;
  is_armed?: boolean;
  requires_vehicle?: boolean;
  date?: string;
}

export interface MLPredictionResponse {
  base_price: number;
  risk_multiplier: number;
  final_price: number;
  risk_level: string;
  confidence_score: number;
  model_version?: string;
  breakdown: {
    model_used: string;
    risk_factors: string[];
  };
}

export async function getMLPrediction(
  input: MLPredictionRequest,
  modelVersion: string = "latest"
): Promise<MLPredictionResponse> {
  const response = await mlEngineRequest(`/api/v1/quote?model=${modelVersion}`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`ML Engine error: ${response.status}`);
  }

  return response.json();
}

/**
 * Health check for ML Engine connectivity
 */
export async function checkMLEngineHealth(): Promise<boolean> {
  try {
    const response = await mlEngineRequest("/health", { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
