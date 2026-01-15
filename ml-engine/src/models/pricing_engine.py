import numpy as np
from datetime import datetime
from ..models.schemas import EventType, RiskLevel, QuoteRequest, QuoteResponse, RiskAssessment


class PricingEngine:
    """ML-based pricing engine for security guard quotes."""

    # Base hourly rates by event type
    BASE_RATES = {
        EventType.CORPORATE: 35.0,
        EventType.CONCERT: 45.0,
        EventType.SPORTS: 42.0,
        EventType.PRIVATE: 30.0,
        EventType.CONSTRUCTION: 32.0,
        EventType.RETAIL: 28.0,
        EventType.RESIDENTIAL: 25.0,
    }

    # Risk multipliers by event type
    EVENT_RISK_WEIGHTS = {
        EventType.CORPORATE: 0.2,
        EventType.CONCERT: 0.7,
        EventType.SPORTS: 0.6,
        EventType.PRIVATE: 0.3,
        EventType.CONSTRUCTION: 0.4,
        EventType.RETAIL: 0.35,
        EventType.RESIDENTIAL: 0.25,
    }

    def __init__(self):
        self.model_loaded = True

    def calculate_risk_score(self, request: QuoteRequest) -> tuple[float, list[str]]:
        """Calculate risk score based on multiple factors."""
        factors = []
        score = self.EVENT_RISK_WEIGHTS[request.event_type]

        # Time-based risk (night shifts higher risk)
        hour = request.date.hour
        if 22 <= hour or hour < 6:
            score += 0.15
            factors.append("Night shift premium")

        # Weekend risk
        if request.date.weekday() >= 5:
            score += 0.1
            factors.append("Weekend assignment")

        # Crowd size risk
        if request.crowd_size > 0:
            crowd_factor = min(request.crowd_size / 10000, 0.3)
            score += crowd_factor
            if request.crowd_size > 1000:
                factors.append(f"Large crowd ({request.crowd_size} people)")

        # Armed guard adjustment
        if request.is_armed:
            score += 0.2
            factors.append("Armed security required")

        # Vehicle requirement
        if request.requires_vehicle:
            score += 0.05
            factors.append("Vehicle patrol included")

        return min(score, 1.0), factors

    def get_risk_level(self, score: float) -> RiskLevel:
        """Convert risk score to risk level."""
        if score < 0.25:
            return RiskLevel.LOW
        elif score < 0.5:
            return RiskLevel.MEDIUM
        elif score < 0.75:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    def calculate_quote(self, request: QuoteRequest) -> QuoteResponse:
        """Generate a quote based on the request parameters."""
        base_rate = self.BASE_RATES[request.event_type]
        risk_score, factors = self.calculate_risk_score(request)
        risk_level = self.get_risk_level(risk_score)

        # Calculate multiplier from risk score
        risk_multiplier = 1.0 + (risk_score * 0.5)

        # Armed guard premium
        armed_premium = 15.0 if request.is_armed else 0.0

        # Vehicle premium
        vehicle_premium = 50.0 if request.requires_vehicle else 0.0

        # Calculate costs
        hourly_cost = (base_rate + armed_premium) * risk_multiplier
        labor_cost = hourly_cost * request.hours * request.num_guards
        vehicle_cost = vehicle_premium * request.num_guards if request.requires_vehicle else 0

        final_price = labor_cost + vehicle_cost

        # Confidence based on data completeness
        confidence = 0.85 + (0.1 if request.crowd_size > 0 else 0)

        breakdown = {
            "base_hourly_rate": base_rate,
            "armed_premium": armed_premium,
            "adjusted_hourly_rate": hourly_cost,
            "labor_cost": labor_cost,
            "vehicle_cost": vehicle_cost,
            "risk_factors": factors,
        }

        return QuoteResponse(
            base_price=labor_cost,
            risk_multiplier=risk_multiplier,
            final_price=round(final_price, 2),
            risk_level=risk_level,
            confidence_score=confidence,
            breakdown=breakdown,
        )

    def assess_risk(self, request: QuoteRequest) -> RiskAssessment:
        """Provide detailed risk assessment."""
        risk_score, factors = self.calculate_risk_score(request)
        risk_level = self.get_risk_level(risk_score)

        recommendations = []
        if risk_score > 0.5:
            recommendations.append("Consider additional guards for high-risk scenario")
        if request.crowd_size > 500 and not request.is_armed:
            recommendations.append("Armed security recommended for large crowds")
        if request.date.hour >= 22 or request.date.hour < 6:
            recommendations.append("Ensure proper lighting and communication equipment")
        if risk_level == RiskLevel.CRITICAL:
            recommendations.append("Coordinate with local law enforcement")

        return RiskAssessment(
            risk_level=risk_level,
            risk_score=round(risk_score, 3),
            factors=factors if factors else ["Standard assignment"],
            recommendations=recommendations if recommendations else ["Standard protocols apply"],
        )


# Singleton instance
_engine: PricingEngine | None = None


def get_pricing_engine() -> PricingEngine:
    global _engine
    if _engine is None:
        _engine = PricingEngine()
    return _engine
