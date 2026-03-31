from fastapi import APIRouter, HTTPException
from ..models.schemas import QuoteRequest, QuoteResponse, RiskAssessment, HealthResponse
from ..models.pricing_engine import get_pricing_engine
from ..models.trained_predictor import get_predictor
from .. import __version__

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    predictor = get_predictor()
    return HealthResponse(
        status="healthy",
        version=__version__,
        model_loaded=predictor.loaded,
    )


@router.post("/quote", response_model=QuoteResponse)
async def generate_quote(request: QuoteRequest):
    """Generate a price quote using trained ML model."""
    try:
        predictor = get_predictor()

        # Get ML predictions
        price_result = predictor.predict_price(
            event_type=request.event_type.value,
            state="CA",  # TODO: extract from zip
            zip_code=request.location_zip,
            risk_zone="medium",  # TODO: lookup from DB
            num_guards=request.num_guards,
            hours=request.hours,
            crowd_size=request.crowd_size,
            event_date=request.date,
            is_armed=request.is_armed,
            has_vehicle=request.requires_vehicle,
        )

        risk_result = predictor.predict_risk(
            event_type=request.event_type.value,
            state="CA",
            zip_code=request.location_zip,
            num_guards=request.num_guards,
            hours=request.hours,
            crowd_size=request.crowd_size,
            event_date=request.date,
            is_armed=request.is_armed,
        )

        # Build response
        from ..models.schemas import RiskLevel

        return QuoteResponse(
            base_price=price_result['predicted_price'] / 1.0875,  # pre-tax
            risk_multiplier=1.0 + (risk_result['risk_score'] * 0.5),
            final_price=price_result['predicted_price'],
            risk_level=RiskLevel(risk_result['risk_level']),
            confidence_score=price_result['confidence'],
            breakdown={
                'model_used': price_result['model_used'],
                'risk_factors': risk_result['factors'],
                'num_guards': request.num_guards,
                'hours': request.hours,
                'is_armed': request.is_armed,
                'has_vehicle': request.requires_vehicle,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quote/rule-based", response_model=QuoteResponse)
async def generate_quote_rule_based(request: QuoteRequest):
    """Generate a price quote using rule-based engine (fallback)."""
    try:
        engine = get_pricing_engine()
        return engine.calculate_quote(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-assessment", response_model=RiskAssessment)
async def assess_risk(request: QuoteRequest):
    """Get detailed risk assessment using trained ML model."""
    try:
        predictor = get_predictor()

        result = predictor.predict_risk(
            event_type=request.event_type.value,
            state="CA",
            zip_code=request.location_zip,
            num_guards=request.num_guards,
            hours=request.hours,
            crowd_size=request.crowd_size,
            event_date=request.date,
            is_armed=request.is_armed,
        )

        from ..models.schemas import RiskLevel

        # Generate recommendations based on risk level
        recommendations = []
        if result['risk_level'] in ['high', 'critical']:
            recommendations.append("Consider additional guards for high-risk scenario")
        if request.crowd_size > 500 and not request.is_armed:
            recommendations.append("Armed security recommended for large crowds")
        if request.date.hour >= 22 or request.date.hour < 6:
            recommendations.append("Ensure proper lighting and communication equipment")
        if result['risk_level'] == 'critical':
            recommendations.append("Coordinate with local law enforcement")
        if not recommendations:
            recommendations.append("Standard protocols apply")

        return RiskAssessment(
            risk_level=RiskLevel(result['risk_level']),
            risk_score=result['risk_score'],
            factors=result['factors'],
            recommendations=recommendations,
        )
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


@router.get("/model-info")
async def get_model_info():
    """Get information about loaded ML models."""
    predictor = get_predictor()

    if not predictor.loaded:
        return {
            "status": "not_loaded",
            "message": "Models not loaded - using rule-based fallback"
        }

    price_metrics = predictor.models.get('price_metrics', {})
    risk_metrics = predictor.models.get('risk_metrics', {})

    return {
        "status": "loaded",
        "version": predictor.models.get('version', 'unknown'),
        "model_type": f"{predictor.models.get('price_model_name', 'Unknown')} + {predictor.models.get('risk_model_name', 'Unknown')}",
        "last_trained": predictor.models.get('trained_at', None),
        "training_samples": predictor.models.get('training_samples', 0),
        "accuracy": price_metrics.get('r2', 0),
        "risk_accuracy": risk_metrics.get('accuracy', 0),
        "price_features": len(predictor.models.get('price_features', [])),
        "risk_features": len(predictor.models.get('risk_features', [])),
    }
