from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class EventType(str, Enum):
    CORPORATE = "corporate"
    CONCERT = "concert"
    SPORTS = "sports"
    PRIVATE = "private"
    CONSTRUCTION = "construction"
    RETAIL = "retail"
    RESIDENTIAL = "residential"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class QuoteRequest(BaseModel):
    event_type: EventType
    location_zip: str = Field(..., min_length=5, max_length=10)
    num_guards: int = Field(..., ge=1, le=100)
    hours: float = Field(..., ge=1, le=24)
    date: datetime
    is_armed: bool = False
    requires_vehicle: bool = False
    crowd_size: int = Field(default=0, ge=0)


class QuoteResponse(BaseModel):
    base_price: float
    risk_multiplier: float
    final_price: float
    risk_level: RiskLevel
    confidence_score: float = Field(..., ge=0, le=1)
    breakdown: dict


class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0, le=1)
    factors: list[str]
    recommendations: list[str]


class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
