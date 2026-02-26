/**
 * ML Engine gRPC Client
 * Connects to ML engine for quote generation and risk assessment
 * Falls back to local calculation if ML engine unavailable
 */
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ML_ENGINE_HOST = process.env.ML_ENGINE_HOST || "localhost";
const ML_ENGINE_PORT = process.env.ML_ENGINE_PORT || "50051";
const ML_ENGINE_TIMEOUT_MS = parseInt(process.env.ML_ENGINE_TIMEOUT_MS || "5000", 10);

// Load proto definition
const PROTO_PATH = path.join(__dirname, "../../proto/ml_engine.proto");

let packageDefinition: protoLoader.PackageDefinition;
let mlProto: any;

try {
  packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  mlProto = grpc.loadPackageDefinition(packageDefinition) as any;
} catch (err) {
  console.warn(`[ML Client] Failed to load proto: ${err}`);
}

// Service clients
let quoteClient: any = null;
let riskClient: any = null;
let modelClient: any = null;
let isConnected = false;

// Event type mapping (proto enum to string)
const EVENT_TYPE_TO_PROTO: Record<string, number> = {
  corporate: 1,
  concert: 2,
  sports: 3,
  private: 4,
  construction: 5,
  retail: 6,
  residential: 7,
};

const RISK_LEVEL_FROM_PROTO: Record<number | string, string> = {
  0: "medium",
  1: "low",
  2: "medium",
  3: "high",
  4: "critical",
  RISK_LEVEL_UNSPECIFIED: "medium",
  RISK_LEVEL_LOW: "low",
  RISK_LEVEL_MEDIUM: "medium",
  RISK_LEVEL_HIGH: "high",
  RISK_LEVEL_CRITICAL: "critical",
};

/**
 * Initialize gRPC connection to ML engine
 */
export function initMLClient(): void {
  if (!mlProto) {
    console.warn("[ML Client] Proto not loaded, skipping initialization");
    return;
  }

  const address = `${ML_ENGINE_HOST}:${ML_ENGINE_PORT}`;
  const credentials = grpc.credentials.createInsecure();

  try {
    quoteClient = new mlProto.guardquote.ml.QuoteService(address, credentials);
    riskClient = new mlProto.guardquote.ml.RiskService(address, credentials);
    modelClient = new mlProto.guardquote.ml.ModelService(address, credentials);
    console.log(`[ML Client] Initialized, will connect to ML engine at ${address}`);
  } catch (err) {
    console.warn(`[ML Client] Failed to create clients: ${err}`);
  }
}

/**
 * Check if ML engine is healthy
 */
export async function checkMLHealth(): Promise<{ healthy: boolean; version?: string; model_loaded?: boolean }> {
  return new Promise((resolve) => {
    if (!modelClient) {
      resolve({ healthy: false });
      return;
    }

    const deadline = new Date(Date.now() + ML_ENGINE_TIMEOUT_MS);

    modelClient.HealthCheck({}, { deadline }, (err: any, response: any) => {
      if (err) {
        console.warn(`[ML Client] Health check failed: ${err.message}`);
        isConnected = false;
        resolve({ healthy: false });
      } else {
        isConnected = true;
        resolve({
          healthy: response.status === "healthy",
          version: response.version,
          model_loaded: response.model_loaded,
        });
      }
    });
  });
}

/**
 * Request interface matching our QuoteInput
 */
export interface MLQuoteRequest {
  event_type: string;
  location_zip: string;
  num_guards: number;
  hours: number;
  event_date: Date;
  is_armed: boolean;
  requires_vehicle: boolean;
  crowd_size: number;
  request_id?: string;
}

/**
 * Response interface matching our QuoteResult
 */
export interface MLQuoteResponse {
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
  };
  processing_time_ms: number;
}

/**
 * Generate quote via ML engine
 */
export async function generateQuoteML(input: MLQuoteRequest): Promise<MLQuoteResponse | null> {
  return new Promise((resolve) => {
    if (!quoteClient) {
      resolve(null);
      return;
    }

    const request = {
      event_type: EVENT_TYPE_TO_PROTO[input.event_type] || 1,
      location_zip: input.location_zip,
      num_guards: input.num_guards,
      hours: input.hours,
      event_date: { seconds: Math.floor(input.event_date.getTime() / 1000).toString(), nanos: 0 },
      is_armed: input.is_armed,
      requires_vehicle: input.requires_vehicle,
      crowd_size: input.crowd_size,
      request_id: input.request_id || `req_${Date.now()}`,
    };

    const deadline = new Date(Date.now() + ML_ENGINE_TIMEOUT_MS);

    quoteClient.GenerateQuote(request, { deadline }, (err: any, response: any) => {
      if (err) {
        console.warn(`[ML Client] Quote generation failed: ${err.message}`);
        isConnected = false;
        resolve(null);
      } else {
        isConnected = true;
        const riskLevel = RISK_LEVEL_FROM_PROTO[response.risk_level] || "medium";
        resolve({
          base_price: parseFloat(response.base_price) || 0,
          risk_multiplier: parseFloat(response.risk_multiplier) || 1,
          final_price: parseFloat(response.final_price) || 0,
          risk_level: riskLevel as any,
          confidence_score: parseFloat(response.confidence_score) || 0.75,
          breakdown: {
            model_used: response.breakdown?.model_used || "ml-grpc",
            risk_factors: response.breakdown?.risk_factors || [],
            num_guards: response.breakdown?.num_guards || input.num_guards,
            hours: response.breakdown?.hours || input.hours,
            is_armed: response.breakdown?.is_armed ?? input.is_armed,
            has_vehicle: response.breakdown?.has_vehicle ?? input.requires_vehicle,
          },
          processing_time_ms: parseInt(response.processing_time_ms) || 0,
        });
      }
    });
  });
}

/**
 * Get ML client status
 */
export function getMLClientStatus(): { connected: boolean; host: string; port: string } {
  return {
    connected: isConnected,
    host: ML_ENGINE_HOST,
    port: ML_ENGINE_PORT,
  };
}

// Auto-initialize on import
initMLClient();
