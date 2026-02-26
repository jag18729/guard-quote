# gRPC Integration Architecture

## Overview

GuardQuote uses gRPC for internal communication between the backend API and the ML engine. This provides:

- **Binary serialization** — Faster than JSON REST
- **Strong typing** — Code generation from proto definitions
- **Streaming** — Batch quote processing support
- **Low latency** — Connection pooling, HTTP/2

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL                                │
│  ┌─────────┐    REST/WebSocket     ┌──────────────────────┐    │
│  │ Clients │ ◄───────────────────► │   Backend (Hono)     │    │
│  └─────────┘       :3002           │   TypeScript/Bun     │    │
└─────────────────────────────────────┴──────────────────────┴────┘
                                              │
                                              │ gRPC (internal)
                                              │ :50051
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNAL                                │
│                     ┌──────────────────────┐                    │
│                     │   ML Engine          │                    │
│                     │   Python/FastAPI     │                    │
│                     │   + gRPC Server      │                    │
│                     └──────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Proto Definitions

**Location:** `ml-engine/proto/ml_engine.proto` (source of truth)  
**Copy:** `backend/proto/ml_engine.proto` (for TypeScript client)

**Services:**
| Service | Methods | Purpose |
|---------|---------|---------|
| `QuoteService` | GenerateQuote, GenerateQuoteRuleBased, GenerateQuotesBatch | Price quote generation |
| `RiskService` | AssessRisk, AssessRiskBatch | Risk assessment |
| `ModelService` | HealthCheck, GetModelInfo, GetEventTypes | Status and metadata |

### ML Engine (Python)

**Files:**
- `ml-engine/src/grpc_servicer.py` — Service implementations
- `ml-engine/src/server.py` — Dual server (FastAPI + gRPC)
- `ml-engine/src/grpc_generated/` — Generated Python stubs

**Ports:**
- `:8000` — FastAPI REST (legacy, for direct access)
- `:50051` — gRPC (internal, for backend)

### Backend (TypeScript)

**Files:**
- `backend/src/services/ml-client.ts` — gRPC client
- `backend/src/services/quote-calculator.ts` — ML-first with fallback

**Strategy:**
1. Try ML engine via gRPC
2. If unavailable/timeout → fall back to local rule-based calculation
3. Log which path was taken

## Configuration

### Environment Variables

```bash
# ML Engine connection
ML_ENGINE_HOST=localhost      # or ml-engine service name in K8s
ML_ENGINE_PORT=50051
ML_ENGINE_TIMEOUT_MS=5000     # gRPC deadline
```

### Health Check

```bash
# REST endpoint
curl http://localhost:3002/api/ml/health

# Response
{
  "ml_engine": {
    "connected": true,
    "host": "localhost",
    "port": "50051",
    "healthy": true,
    "version": "0.1.0",
    "model_loaded": true
  },
  "transport": "gRPC",
  "timestamp": "2026-02-19T13:20:00.000Z"
}
```

## Development

### Generate Python Stubs

```bash
cd ml-engine
source .venv/bin/activate
./scripts/generate_grpc.sh
```

### Run ML Engine Locally

```bash
cd ml-engine
source .venv/bin/activate
python -m src.server
# FastAPI on :8000, gRPC on :50051
```

### Test gRPC Connection

```bash
cd ml-engine
source .venv/bin/activate
python tests/test_grpc.py
```

## Deployment

### Docker Compose

```yaml
services:
  ml-engine:
    build: ./ml-engine
    ports:
      - "8000:8000"   # REST (optional, for debugging)
      - "50051:50051" # gRPC (internal)
    
  backend:
    build: ./backend
    environment:
      ML_ENGINE_HOST: ml-engine
      ML_ENGINE_PORT: "50051"
    depends_on:
      - ml-engine
```

### Kubernetes

```yaml
# ML Engine Service
apiVersion: v1
kind: Service
metadata:
  name: ml-engine
spec:
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
  selector:
    app: ml-engine
```

## Fallback Behavior

When ML engine is unavailable:

1. `generateQuoteML()` returns `null`
2. `calculateQuote()` uses local rule-based engine
3. Response includes `model_used: "GuardQuote ML v2.0"` (local)
4. Log: `[Quote] Using local rule-based calculation`

When ML engine is available:

1. gRPC call completes within timeout
2. Response includes `model_used` from ML engine
3. Log: `[Quote] ML engine responded in Xms`

## Security

- gRPC uses **insecure channel** (no TLS) for same-network communication
- For cross-network deployment, enable mTLS
- Port 50051 should NOT be exposed externally (internal only)

## Monitoring

Metrics to track:
- `ml_grpc_requests_total` — Total gRPC calls
- `ml_grpc_latency_ms` — Response time
- `ml_fallback_rate` — % of requests using fallback
- `ml_engine_healthy` — Health check status

## Troubleshooting

### Connection Refused

```
[ML Client] Quote generation failed: 14 UNAVAILABLE: connect ECONNREFUSED
```

**Causes:**
- ML engine not running
- Wrong host/port configuration
- Firewall blocking port 50051

**Fix:**
1. Verify ML engine is running: `curl http://localhost:8000/health`
2. Check env vars: `ML_ENGINE_HOST`, `ML_ENGINE_PORT`
3. Check firewall: `ufw allow 50051/tcp`

### Timeout

```
[ML Client] Quote generation failed: 4 DEADLINE_EXCEEDED
```

**Causes:**
- ML engine overloaded
- Network latency
- Model loading slow

**Fix:**
1. Increase timeout: `ML_ENGINE_TIMEOUT_MS=10000`
2. Check ML engine logs for slow operations
3. Scale ML engine replicas
