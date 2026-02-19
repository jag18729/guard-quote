# gRPC Backend Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate gRPC client into GuardQuote backend for ML engine communication

**Architecture:** Backend calls ML engine via gRPC for quote generation and risk assessment, with local rule-based fallback when ML engine unavailable. gRPC provides binary serialization, streaming, and strong typing.

**Tech Stack:** Bun, TypeScript, @grpc/grpc-js, @grpc/proto-loader, Protocol Buffers

---

## Prerequisites

- ML engine gRPC server implemented (✅ Done: `ml-engine/src/grpc_servicer.py`)
- Proto definitions available (✅ Done: `ml-engine/proto/ml_engine.proto`)

---

### Task 1: Add gRPC Dependencies

**Files:**
- Modify: `backend/package.json`

**Step 1: Add gRPC packages**

```bash
cd backend && bun add @grpc/grpc-js @grpc/proto-loader
```

**Step 2: Verify installation**

```bash
bun pm ls | grep grpc
```

Expected: `@grpc/grpc-js` and `@grpc/proto-loader` listed

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "deps: add gRPC client packages"
```

---

### Task 2: Copy Proto File to Backend

**Files:**
- Create: `backend/proto/ml_engine.proto`

**Step 1: Create proto directory and copy file**

```bash
mkdir -p backend/proto
cp ml-engine/proto/ml_engine.proto backend/proto/
```

**Step 2: Verify file copied**

```bash
head -20 backend/proto/ml_engine.proto
```

Expected: Proto syntax and package declaration visible

**Step 3: Commit**

```bash
git add backend/proto/
git commit -m "feat(backend): add ML engine proto definitions"
```

---

### Task 3: Create gRPC Client Service

**Files:**
- Create: `backend/src/services/ml-client.ts`

**Step 1: Write the gRPC client implementation**

```typescript
/**
 * ML Engine gRPC Client
 * Connects to ML engine for quote generation and risk assessment
 * Falls back to local calculation if ML engine unavailable
 */
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

// Configuration
const ML_ENGINE_HOST = process.env.ML_ENGINE_HOST || "localhost";
const ML_ENGINE_PORT = process.env.ML_ENGINE_PORT || "50051";
const ML_ENGINE_TIMEOUT_MS = parseInt(process.env.ML_ENGINE_TIMEOUT_MS || "5000", 10);

// Load proto definition
const PROTO_PATH = path.join(__dirname, "../../proto/ml_engine.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const mlProto = grpc.loadPackageDefinition(packageDefinition) as any;

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

const RISK_LEVEL_FROM_PROTO: Record<number, string> = {
  1: "low",
  2: "medium",
  3: "high",
  4: "critical",
};

/**
 * Initialize gRPC connection to ML engine
 */
export function initMLClient(): void {
  const address = `${ML_ENGINE_HOST}:${ML_ENGINE_PORT}`;
  const credentials = grpc.credentials.createInsecure();

  quoteClient = new mlProto.guardquote.ml.QuoteService(address, credentials);
  riskClient = new mlProto.guardquote.ml.RiskService(address, credentials);
  modelClient = new mlProto.guardquote.ml.ModelService(address, credentials);

  console.log(`[ML Client] Connecting to ML engine at ${address}`);
}

/**
 * Check if ML engine is healthy
 */
export async function checkMLHealth(): Promise<{ healthy: boolean; version?: string }> {
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
        resolve({ healthy: response.status === "healthy", version: response.version });
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
    if (!quoteClient || !isConnected) {
      resolve(null);
      return;
    }

    const request = {
      event_type: EVENT_TYPE_TO_PROTO[input.event_type] || 1,
      location_zip: input.location_zip,
      num_guards: input.num_guards,
      hours: input.hours,
      event_date: { seconds: Math.floor(input.event_date.getTime() / 1000), nanos: 0 },
      is_armed: input.is_armed,
      requires_vehicle: input.requires_vehicle,
      crowd_size: input.crowd_size,
      request_id: input.request_id || `req_${Date.now()}`,
    };

    const deadline = new Date(Date.now() + ML_ENGINE_TIMEOUT_MS);

    quoteClient.GenerateQuote(request, { deadline }, (err: any, response: any) => {
      if (err) {
        console.warn(`[ML Client] Quote generation failed: ${err.message}`);
        resolve(null);
      } else {
        resolve({
          base_price: response.base_price,
          risk_multiplier: response.risk_multiplier,
          final_price: response.final_price,
          risk_level: RISK_LEVEL_FROM_PROTO[response.risk_level] as any || "medium",
          confidence_score: response.confidence_score,
          breakdown: {
            model_used: response.breakdown?.model_used || "ml-grpc",
            risk_factors: response.breakdown?.risk_factors || [],
            num_guards: response.breakdown?.num_guards || input.num_guards,
            hours: response.breakdown?.hours || input.hours,
            is_armed: response.breakdown?.is_armed ?? input.is_armed,
            has_vehicle: response.breakdown?.has_vehicle ?? input.requires_vehicle,
          },
          processing_time_ms: response.processing_time_ms || 0,
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
```

**Step 2: Verify file syntax**

```bash
cd backend && bun run typecheck 2>&1 | head -20
```

Expected: No errors related to ml-client.ts

**Step 3: Commit**

```bash
git add src/services/ml-client.ts
git commit -m "feat(backend): add gRPC client for ML engine"
```

---

### Task 4: Write ML Client Tests

**Files:**
- Create: `backend/src/__tests__/ml-client.test.ts`

**Step 1: Write the test file**

```typescript
/**
 * ML Client Integration Tests
 * Tests gRPC client functionality against ML engine
 */
import { describe, test, expect, beforeAll } from "bun:test";
import { initMLClient, checkMLHealth, generateQuoteML, getMLClientStatus } from "../services/ml-client";

describe("ML Client", () => {
  beforeAll(() => {
    initMLClient();
  });

  test("getMLClientStatus returns connection info", () => {
    const status = getMLClientStatus();
    expect(status).toHaveProperty("connected");
    expect(status).toHaveProperty("host");
    expect(status).toHaveProperty("port");
  });

  test("checkMLHealth returns health status", async () => {
    const health = await checkMLHealth();
    expect(health).toHaveProperty("healthy");
    // Note: healthy may be false if ML engine not running
  });

  test("generateQuoteML returns null when not connected", async () => {
    // If ML engine not running, should gracefully return null
    const result = await generateQuoteML({
      event_type: "corporate",
      location_zip: "90210",
      num_guards: 2,
      hours: 8,
      event_date: new Date(),
      is_armed: false,
      requires_vehicle: false,
      crowd_size: 100,
    });
    
    // Result is null if ML engine unavailable, or a valid response if running
    expect(result === null || typeof result.final_price === "number").toBe(true);
  });
});
```

**Step 2: Run tests**

```bash
cd backend && bun test src/__tests__/ml-client.test.ts
```

Expected: Tests pass (with graceful handling if ML engine not running)

**Step 3: Commit**

```bash
git add src/__tests__/ml-client.test.ts
git commit -m "test(backend): add ML client unit tests"
```

---

### Task 5: Integrate ML Client into Quote Calculator

**Files:**
- Modify: `backend/src/services/quote-calculator.ts`

**Step 1: Add ML client import and initialization**

At the top of the file, add:

```typescript
import { initMLClient, checkMLHealth, generateQuoteML, MLQuoteRequest } from "./ml-client";

// Initialize ML client on module load
initMLClient();
```

**Step 2: Modify calculateQuote to try ML first**

Replace the beginning of `calculateQuote` function with ML-first approach:

```typescript
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

  // Try ML engine first
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
          recommendations: [], // ML engine provides these separately
        },
      };
    }
  } catch (err) {
    console.warn(`[Quote] ML engine error, falling back to local: ${err}`);
  }

  // Fall back to local calculation (existing code continues below)
  console.log("[Quote] Using local rule-based calculation");
  
  // ... rest of existing calculation code ...
```

**Step 3: Run typecheck**

```bash
cd backend && bun run typecheck
```

Expected: No type errors

**Step 4: Commit**

```bash
git add src/services/quote-calculator.ts
git commit -m "feat(backend): integrate ML client with fallback to local calculation"
```

---

### Task 6: Add ML Engine Health Endpoint

**Files:**
- Modify: `backend/src/index.ts` (or routes file)

**Step 1: Add health check endpoint for ML status**

Add a new route:

```typescript
import { checkMLHealth, getMLClientStatus } from "./services/ml-client";

// Add to routes
app.get("/api/v1/ml/health", async (c) => {
  const status = getMLClientStatus();
  const health = await checkMLHealth();
  
  return c.json({
    ml_engine: {
      ...status,
      ...health,
    },
    timestamp: new Date().toISOString(),
  });
});
```

**Step 2: Test endpoint**

```bash
curl http://localhost:3002/api/v1/ml/health
```

Expected: JSON with ml_engine status

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(backend): add ML engine health check endpoint"
```

---

### Task 7: Add Environment Variables

**Files:**
- Modify: `backend/.env.example`

**Step 1: Add ML engine configuration**

Add to `.env.example`:

```bash
# ML Engine (gRPC)
ML_ENGINE_HOST=localhost
ML_ENGINE_PORT=50051
ML_ENGINE_TIMEOUT_MS=5000
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add ML engine environment variables"
```

---

### Task 8: Integration Test (E2E)

**Files:**
- Test manually

**Step 1: Start ML engine**

```bash
cd ml-engine && source .venv/bin/activate && python -m src.server &
```

**Step 2: Start backend**

```bash
cd backend && bun run dev
```

**Step 3: Test quote endpoint**

```bash
curl -X POST http://localhost:3002/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "corporate",
    "location_zip": "90210",
    "num_guards": 2,
    "hours": 8,
    "is_armed": true,
    "crowd_size": 100
  }'
```

Expected: Quote response with `model_used` indicating ML or fallback

**Step 4: Check logs**

Look for:
- `[ML Client] Connecting to ML engine at localhost:50051`
- `[Quote] ML engine responded in Xms` (if ML running)
- `[Quote] Using local rule-based calculation` (if fallback)

---

### Task 9: Final Commit and Summary

**Step 1: Review all changes**

```bash
git log --oneline -10
git diff origin/dev..HEAD --stat
```

**Step 2: Push to dev branch**

```bash
git push origin dev
```

---

## Rollback Plan

If issues arise:
1. Set `ML_ENGINE_HOST` to invalid address to force fallback
2. Or revert quote-calculator.ts changes:
   ```bash
   git checkout HEAD~1 -- backend/src/services/quote-calculator.ts
   ```

## Success Criteria

- [ ] gRPC packages installed
- [ ] Proto file in backend
- [ ] ML client service created
- [ ] Tests passing
- [ ] Quote calculator uses ML with fallback
- [ ] Health endpoint working
- [ ] E2E test successful with both ML and fallback paths
