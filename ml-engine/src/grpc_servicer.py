"""
gRPC Servicer Implementation for GuardQuote ML Engine

This module implements the gRPC services defined in ml_engine.proto,
wrapping the existing ML engine logic for internal backend communication.
"""

import time
import logging
from datetime import datetime
from concurrent import futures

import grpc

from .grpc_generated import (
    # Enums
    EventType as ProtoEventType,
    RiskLevel as ProtoRiskLevel,
    # Quote types
    QuoteRequest,
    QuoteResponse,
    QuoteBreakdown,
    # Risk types
    RiskRequest,
    RiskResponse,
    # Model types
    HealthRequest,
    HealthResponse,
    ModelInfoRequest,
    ModelInfoResponse,
    EventTypesRequest,
    EventTypesResponse,
    EventTypeInfo,
    # Servicers
    QuoteServiceServicer,
    RiskServiceServicer,
    ModelServiceServicer,
    add_QuoteServiceServicer_to_server,
    add_RiskServiceServicer_to_server,
    add_ModelServiceServicer_to_server,
)
from .models.schemas import EventType, RiskLevel
from .models.pricing_engine import get_pricing_engine, PricingEngine
from .models.trained_predictor import get_predictor
from . import __version__

logger = logging.getLogger(__name__)


# ============================================================================
# Enum Converters
# ============================================================================

def proto_to_event_type(proto_type: ProtoEventType) -> EventType:
    """Convert protobuf EventType to Python enum."""
    mapping = {
        ProtoEventType.EVENT_TYPE_CORPORATE: EventType.CORPORATE,
        ProtoEventType.EVENT_TYPE_CONCERT: EventType.CONCERT,
        ProtoEventType.EVENT_TYPE_SPORTS: EventType.SPORTS,
        ProtoEventType.EVENT_TYPE_PRIVATE: EventType.PRIVATE,
        ProtoEventType.EVENT_TYPE_CONSTRUCTION: EventType.CONSTRUCTION,
        ProtoEventType.EVENT_TYPE_RETAIL: EventType.RETAIL,
        ProtoEventType.EVENT_TYPE_RESIDENTIAL: EventType.RESIDENTIAL,
    }
    return mapping.get(proto_type, EventType.CORPORATE)


def risk_level_to_proto(level: RiskLevel) -> ProtoRiskLevel:
    """Convert Python RiskLevel to protobuf enum."""
    mapping = {
        RiskLevel.LOW: ProtoRiskLevel.RISK_LEVEL_LOW,
        RiskLevel.MEDIUM: ProtoRiskLevel.RISK_LEVEL_MEDIUM,
        RiskLevel.HIGH: ProtoRiskLevel.RISK_LEVEL_HIGH,
        RiskLevel.CRITICAL: ProtoRiskLevel.RISK_LEVEL_CRITICAL,
    }
    return mapping.get(level, ProtoRiskLevel.RISK_LEVEL_MEDIUM)


def event_type_to_proto(event_type: EventType) -> ProtoEventType:
    """Convert Python EventType to protobuf enum."""
    mapping = {
        EventType.CORPORATE: ProtoEventType.EVENT_TYPE_CORPORATE,
        EventType.CONCERT: ProtoEventType.EVENT_TYPE_CONCERT,
        EventType.SPORTS: ProtoEventType.EVENT_TYPE_SPORTS,
        EventType.PRIVATE: ProtoEventType.EVENT_TYPE_PRIVATE,
        EventType.CONSTRUCTION: ProtoEventType.EVENT_TYPE_CONSTRUCTION,
        EventType.RETAIL: ProtoEventType.EVENT_TYPE_RETAIL,
        EventType.RESIDENTIAL: ProtoEventType.EVENT_TYPE_RESIDENTIAL,
    }
    return mapping.get(event_type, ProtoEventType.EVENT_TYPE_CORPORATE)


# ============================================================================
# Quote Service Implementation
# ============================================================================

class QuoteServiceImpl(QuoteServiceServicer):
    """Implementation of the QuoteService gRPC service."""

    def GenerateQuote(self, request: QuoteRequest, context) -> QuoteResponse:
        """Generate a price quote using trained ML model."""
        start_time = time.time()
        
        try:
            predictor = get_predictor()
            event_type = proto_to_event_type(request.event_type)
            event_date = datetime.fromtimestamp(request.event_date.seconds)

            # Get ML predictions
            price_result = predictor.predict_price(
                event_type=event_type.value,
                state="CA",  # TODO: extract from zip
                zip_code=request.location_zip,
                risk_zone="medium",  # TODO: lookup from DB
                num_guards=request.num_guards,
                hours=request.hours,
                crowd_size=request.crowd_size,
                event_date=event_date,
                is_armed=request.is_armed,
                has_vehicle=request.requires_vehicle,
            )

            risk_result = predictor.predict_risk(
                event_type=event_type.value,
                state="CA",
                zip_code=request.location_zip,
                num_guards=request.num_guards,
                hours=request.hours,
                crowd_size=request.crowd_size,
                event_date=event_date,
                is_armed=request.is_armed,
            )

            processing_time = int((time.time() - start_time) * 1000)

            return QuoteResponse(
                base_price=price_result['predicted_price'] / 1.0875,
                risk_multiplier=1.0 + (risk_result['risk_score'] * 0.5),
                final_price=price_result['predicted_price'],
                risk_level=risk_level_to_proto(RiskLevel(risk_result['risk_level'])),
                confidence_score=price_result['confidence'],
                breakdown=QuoteBreakdown(
                    model_used=price_result['model_used'],
                    risk_factors=risk_result['factors'],
                    num_guards=request.num_guards,
                    hours=request.hours,
                    is_armed=request.is_armed,
                    has_vehicle=request.requires_vehicle,
                ),
                request_id=request.request_id,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"Quote generation failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return QuoteResponse()

    def GenerateQuoteRuleBased(self, request: QuoteRequest, context) -> QuoteResponse:
        """Generate a price quote using rule-based engine."""
        start_time = time.time()
        
        try:
            engine = get_pricing_engine()
            # Convert proto request to Pydantic model for rule engine
            from .models.schemas import QuoteRequest as PydanticQuoteRequest
            
            event_date = datetime.fromtimestamp(request.event_date.seconds)
            pydantic_request = PydanticQuoteRequest(
                event_type=proto_to_event_type(request.event_type),
                location_zip=request.location_zip,
                num_guards=request.num_guards,
                hours=request.hours,
                date=event_date,
                is_armed=request.is_armed,
                requires_vehicle=request.requires_vehicle,
                crowd_size=request.crowd_size,
            )
            
            result = engine.calculate_quote(pydantic_request)
            processing_time = int((time.time() - start_time) * 1000)

            return QuoteResponse(
                base_price=result.base_price,
                risk_multiplier=result.risk_multiplier,
                final_price=result.final_price,
                risk_level=risk_level_to_proto(result.risk_level),
                confidence_score=result.confidence_score,
                breakdown=QuoteBreakdown(
                    model_used=result.breakdown.get('model_used', 'rule-based'),
                    risk_factors=result.breakdown.get('risk_factors', []),
                    num_guards=request.num_guards,
                    hours=request.hours,
                    is_armed=request.is_armed,
                    has_vehicle=request.requires_vehicle,
                ),
                request_id=request.request_id,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"Rule-based quote failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return QuoteResponse()

    def GenerateQuotesBatch(self, request_iterator, context):
        """Streaming batch quote generation."""
        for request in request_iterator:
            yield self.GenerateQuote(request, context)


# ============================================================================
# Risk Service Implementation
# ============================================================================

class RiskServiceImpl(RiskServiceServicer):
    """Implementation of the RiskService gRPC service."""

    def AssessRisk(self, request: RiskRequest, context) -> RiskResponse:
        """Get detailed risk assessment."""
        start_time = time.time()
        
        try:
            predictor = get_predictor()
            event_type = proto_to_event_type(request.event_type)
            event_date = datetime.fromtimestamp(request.event_date.seconds)

            result = predictor.predict_risk(
                event_type=event_type.value,
                state="CA",
                zip_code=request.location_zip,
                num_guards=request.num_guards,
                hours=request.hours,
                crowd_size=request.crowd_size,
                event_date=event_date,
                is_armed=request.is_armed,
            )

            # Generate recommendations
            recommendations = []
            if result['risk_level'] in ['high', 'critical']:
                recommendations.append("Consider additional guards for high-risk scenario")
            if request.crowd_size > 500 and not request.is_armed:
                recommendations.append("Armed security recommended for large crowds")
            if event_date.hour >= 22 or event_date.hour < 6:
                recommendations.append("Ensure proper lighting and communication equipment")
            if result['risk_level'] == 'critical':
                recommendations.append("Coordinate with local law enforcement")
            if not recommendations:
                recommendations.append("Standard protocols apply")

            processing_time = int((time.time() - start_time) * 1000)

            return RiskResponse(
                risk_level=risk_level_to_proto(RiskLevel(result['risk_level'])),
                risk_score=result['risk_score'],
                factors=result['factors'],
                recommendations=recommendations,
                request_id=request.request_id,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"Risk assessment failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return RiskResponse()

    def AssessRiskBatch(self, request_iterator, context):
        """Streaming batch risk assessment."""
        for request in request_iterator:
            yield self.AssessRisk(request, context)


# ============================================================================
# Model Service Implementation
# ============================================================================

class ModelServiceImpl(ModelServiceServicer):
    """Implementation of the ModelService gRPC service."""

    def HealthCheck(self, request: HealthRequest, context) -> HealthResponse:
        """Health check endpoint."""
        predictor = get_predictor()
        return HealthResponse(
            status="healthy",
            version=__version__,
            model_loaded=predictor.loaded,
        )

    def GetModelInfo(self, request: ModelInfoRequest, context) -> ModelInfoResponse:
        """Get information about loaded ML models."""
        predictor = get_predictor()

        if not predictor.loaded:
            return ModelInfoResponse(
                status="not_loaded",
                message="Models not loaded - using rule-based fallback",
            )

        return ModelInfoResponse(
            status="loaded",
            price_model_name=predictor.models.get('price_model_name', 'Unknown'),
            trained_at=predictor.models.get('trained_at', 'Unknown'),
            price_features_count=len(predictor.models.get('price_features', [])),
            risk_features_count=len(predictor.models.get('risk_features', [])),
        )

    def GetEventTypes(self, request: EventTypesRequest, context) -> EventTypesResponse:
        """Get available event types and their base rates."""
        event_types = []
        for event_type in EventType:
            event_types.append(EventTypeInfo(
                type=event_type_to_proto(event_type),
                name=event_type.value.title(),
                base_rate=PricingEngine.BASE_RATES[event_type],
                risk_weight=PricingEngine.EVENT_RISK_WEIGHTS[event_type],
            ))
        return EventTypesResponse(event_types=event_types)


# ============================================================================
# Server Setup
# ============================================================================

def create_grpc_server(port: int = 50051, max_workers: int = 10) -> grpc.Server:
    """Create and configure the gRPC server."""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=max_workers))
    
    # Register services
    add_QuoteServiceServicer_to_server(QuoteServiceImpl(), server)
    add_RiskServiceServicer_to_server(RiskServiceImpl(), server)
    add_ModelServiceServicer_to_server(ModelServiceImpl(), server)
    
    # Bind to port
    server.add_insecure_port(f'[::]:{port}')
    
    return server


def serve(port: int = 50051):
    """Start the gRPC server."""
    server = create_grpc_server(port)
    server.start()
    logger.info(f"gRPC server started on port {port}")
    server.wait_for_termination()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
