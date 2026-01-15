from fastapi import APIRouter, HTTPException
from ..models.schemas import QuoteRequest, QuoteResponse, RiskAssessment, HealthResponse
from ..models.pricing_engine import get_pricing_engine
from .. import __version__

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    engine = get_pricing_engine()
    return HealthResponse(
        status="healthy",
        version=__version__,
        model_loaded=engine.model_loaded,
    )


@router.post("/quote", response_model=QuoteResponse)
async def generate_quote(request: QuoteRequest):
    """Generate a price quote for security services."""
    try:
        engine = get_pricing_engine()
        return engine.calculate_quote(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-assessment", response_model=RiskAssessment)
async def assess_risk(request: QuoteRequest):
    """Get detailed risk assessment for a job."""
    try:
        engine = get_pricing_engine()
        return engine.assess_risk(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/event-types")
async def get_event_types():
    """Get available event types and their base rates."""
    from ..models.schemas import EventType
    from ..models.pricing_engine import PricingEngine

    return {
        event_type.value: {
            "name": event_type.value.title(),
            "base_rate": PricingEngine.BASE_RATES[event_type],
            "risk_weight": PricingEngine.EVENT_RISK_WEIGHTS[event_type],
        }
        for event_type in EventType
    }
