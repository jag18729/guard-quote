# GuardQuote ML Engine - gRPC Interface

## Overview

This directory contains Protocol Buffer definitions for the ML Engine's gRPC interface.
gRPC is used for **internal** backend-to-ML communication, providing:

- Binary serialization (faster than JSON)
- Bidirectional streaming (batch processing)
- Strong typing with code generation
- Lower latency than REST

## Services

| Service | Description |
|---------|-------------|
| `QuoteService` | Price quote generation (ML + rule-based fallback) |
| `RiskService` | Risk assessment and recommendations |
| `ModelService` | Health checks, model info, event types |

## Generating Code

### Python (ML Engine)

```bash
# Install dependencies
pip install grpcio grpcio-tools

# Generate Python stubs
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=./src/grpc_generated \
  --pyi_out=./src/grpc_generated \
  --grpc_python_out=./src/grpc_generated \
  proto/ml_engine.proto
```

### TypeScript (Backend) - Optional

```bash
# Install dependencies
npm install @grpc/grpc-js @grpc/proto-loader

# Or use buf for generation
buf generate
```

## Implementation Status

- [x] Proto definitions (v1.0.0)
- [ ] Python gRPC servicer implementation
- [ ] gRPC server alongside FastAPI
- [ ] Backend client integration
- [ ] Streaming batch support

## Architecture

```
┌─────────────────┐     gRPC (internal)     ┌──────────────┐
│  Backend (Bun)  │ ◄──────────────────────► │  ML Engine   │
│  Port 3002      │      Port 50051         │  (Python)    │
└─────────────────┘                         └──────────────┘
        │
        │ REST/WebSocket (external)
        ▼
   ┌─────────┐
   │ Clients │
   └─────────┘
```

## Port Assignment

- **50051**: gRPC server (internal, not exposed)
- **8000**: FastAPI REST (legacy, will deprecate after gRPC migration)

## Security Notes

- gRPC interface is internal only (not exposed through ingress)
- mTLS can be added for production if services span trust boundaries
- For same-pod/same-host communication, insecure channel is acceptable
