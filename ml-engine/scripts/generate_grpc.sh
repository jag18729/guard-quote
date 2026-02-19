#!/bin/bash
# Generate gRPC Python code from proto definitions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Generating gRPC code..."

python -m grpc_tools.protoc \
  -I"$PROJECT_DIR/proto" \
  -I/usr/include \
  --python_out="$PROJECT_DIR/src/grpc_generated" \
  --pyi_out="$PROJECT_DIR/src/grpc_generated" \
  --grpc_python_out="$PROJECT_DIR/src/grpc_generated" \
  "$PROJECT_DIR/proto/ml_engine.proto"

# Fix imports in generated files (grpc_tools generates relative imports that don't work)
sed -i 's/import ml_engine_pb2/from . import ml_engine_pb2/' \
  "$PROJECT_DIR/src/grpc_generated/ml_engine_pb2_grpc.py"

# Create __init__.py
cat > "$PROJECT_DIR/src/grpc_generated/__init__.py" << 'EOF'
"""Generated gRPC code for GuardQuote ML Engine."""

from .ml_engine_pb2 import (
    EventType,
    RiskLevel,
    QuoteRequest,
    QuoteResponse,
    QuoteBreakdown,
    RiskRequest,
    RiskResponse,
    HealthRequest,
    HealthResponse,
    ModelInfoRequest,
    ModelInfoResponse,
    EventTypesRequest,
    EventTypesResponse,
    EventTypeInfo,
)

from .ml_engine_pb2_grpc import (
    QuoteServiceServicer,
    QuoteServiceStub,
    RiskServiceServicer,
    RiskServiceStub,
    ModelServiceServicer,
    ModelServiceStub,
    add_QuoteServiceServicer_to_server,
    add_RiskServiceServicer_to_server,
    add_ModelServiceServicer_to_server,
)

__all__ = [
    # Enums
    "EventType",
    "RiskLevel",
    # Quote messages
    "QuoteRequest",
    "QuoteResponse",
    "QuoteBreakdown",
    # Risk messages
    "RiskRequest",
    "RiskResponse",
    # Model messages
    "HealthRequest",
    "HealthResponse",
    "ModelInfoRequest",
    "ModelInfoResponse",
    "EventTypesRequest",
    "EventTypesResponse",
    "EventTypeInfo",
    # Service stubs
    "QuoteServiceServicer",
    "QuoteServiceStub",
    "RiskServiceServicer",
    "RiskServiceStub",
    "ModelServiceServicer",
    "ModelServiceStub",
    # Server registration
    "add_QuoteServiceServicer_to_server",
    "add_RiskServiceServicer_to_server",
    "add_ModelServiceServicer_to_server",
]
EOF

echo "gRPC code generated successfully!"
echo "Output: $PROJECT_DIR/src/grpc_generated/"
