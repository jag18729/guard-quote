"""
gRPC Integration Tests for GuardQuote ML Engine
"""

import grpc
import time
from concurrent import futures
from datetime import datetime

import pytest

# Add src to path for imports
import sys
sys.path.insert(0, '.')

from src.grpc_generated import (
    QuoteRequest,
    QuoteResponse,
    RiskRequest,
    RiskResponse,
    HealthRequest,
    HealthResponse,
    EventType,
    RiskLevel,
    QuoteServiceStub,
    RiskServiceStub,
    ModelServiceStub,
)
from src.grpc_servicer import create_grpc_server


class TestGrpcServer:
    """Test gRPC server functionality."""

    @pytest.fixture(scope="class")
    def grpc_server(self):
        """Start gRPC server for testing."""
        server = create_grpc_server(port=50052)
        server.start()
        yield server
        server.stop(grace=0)

    @pytest.fixture
    def quote_stub(self, grpc_server):
        """Create QuoteService stub."""
        channel = grpc.insecure_channel('localhost:50052')
        return QuoteServiceStub(channel)

    @pytest.fixture
    def risk_stub(self, grpc_server):
        """Create RiskService stub."""
        channel = grpc.insecure_channel('localhost:50052')
        return RiskServiceStub(channel)

    @pytest.fixture
    def model_stub(self, grpc_server):
        """Create ModelService stub."""
        channel = grpc.insecure_channel('localhost:50052')
        return ModelServiceStub(channel)

    def test_health_check(self, model_stub):
        """Test health check endpoint."""
        response = model_stub.HealthCheck(HealthRequest())
        assert response.status == "healthy"
        assert response.version is not None

    def test_generate_quote(self, quote_stub):
        """Test quote generation."""
        from google.protobuf.timestamp_pb2 import Timestamp
        
        ts = Timestamp()
        ts.FromDatetime(datetime.now())
        
        request = QuoteRequest(
            event_type=EventType.EVENT_TYPE_CORPORATE,
            location_zip="90210",
            num_guards=2,
            hours=8.0,
            event_date=ts,
            is_armed=True,
            requires_vehicle=False,
            crowd_size=100,
            request_id="test-001",
        )
        
        response = quote_stub.GenerateQuote(request)
        
        assert response.final_price > 0
        assert response.confidence_score >= 0
        assert response.request_id == "test-001"
        assert response.processing_time_ms >= 0

    def test_assess_risk(self, risk_stub):
        """Test risk assessment."""
        from google.protobuf.timestamp_pb2 import Timestamp
        
        ts = Timestamp()
        ts.FromDatetime(datetime.now())
        
        request = RiskRequest(
            event_type=EventType.EVENT_TYPE_CONCERT,
            location_zip="90210",
            num_guards=5,
            hours=6.0,
            event_date=ts,
            is_armed=True,
            crowd_size=1000,
            request_id="test-002",
        )
        
        response = risk_stub.AssessRisk(request)
        
        assert response.risk_score >= 0
        assert response.risk_score <= 1
        assert len(response.recommendations) > 0
        assert response.request_id == "test-002"


def quick_test():
    """Quick standalone test without pytest."""
    print("Starting gRPC server on port 50052...")
    server = create_grpc_server(port=50052)
    server.start()
    time.sleep(1)  # Wait for server to start

    try:
        channel = grpc.insecure_channel('localhost:50052')
        
        # Test health check
        model_stub = ModelServiceStub(channel)
        health = model_stub.HealthCheck(HealthRequest())
        print(f"✅ Health check: status={health.status}, version={health.version}")

        # Test quote generation
        from google.protobuf.timestamp_pb2 import Timestamp
        ts = Timestamp()
        ts.FromDatetime(datetime.now())
        
        quote_stub = QuoteServiceStub(channel)
        quote_req = QuoteRequest(
            event_type=EventType.EVENT_TYPE_CORPORATE,
            location_zip="90210",
            num_guards=2,
            hours=8.0,
            event_date=ts,
            is_armed=True,
            crowd_size=100,
        )
        
        quote_resp = quote_stub.GenerateQuote(quote_req)
        print(f"✅ Quote generated: ${quote_resp.final_price:.2f}, "
              f"confidence={quote_resp.confidence_score:.2f}, "
              f"processing_time={quote_resp.processing_time_ms}ms")

        print("\n✅ All gRPC tests passed!")
        
    finally:
        server.stop(grace=0)
        print("Server stopped.")


if __name__ == "__main__":
    quick_test()
