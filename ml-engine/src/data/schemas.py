"""Data schemas for ML training and inference."""
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


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


class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ClientData(BaseModel):
    """Client data model."""
    id: Optional[int] = None
    company_name: str
    contact_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    created_at: Optional[datetime] = None


class QuoteData(BaseModel):
    """Quote data model for ML training."""
    id: Optional[int] = None
    client_id: Optional[int] = None
    created_by: Optional[int] = None

    # Input features
    event_type: EventType
    location_zip: str
    num_guards: int = Field(..., ge=1, le=100)
    hours: float = Field(..., ge=1, le=24)
    event_date: datetime
    is_armed: bool = False
    requires_vehicle: bool = False
    crowd_size: int = Field(default=0, ge=0)

    # Output/Target variables
    base_price: Optional[float] = None
    final_price: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    status: QuoteStatus = QuoteStatus.DRAFT

    # Metadata
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrainingRecord(BaseModel):
    """Flattened record for ML training."""
    # Features
    event_type: str
    location_zip: str
    num_guards: int
    hours: float
    day_of_week: int  # 0-6
    hour_of_day: int  # 0-23
    month: int  # 1-12
    is_armed: int  # 0 or 1
    requires_vehicle: int  # 0 or 1
    crowd_size: int
    is_weekend: int  # 0 or 1
    is_night_shift: int  # 0 or 1

    # Targets
    final_price: float
    risk_score: float  # 0-1
    was_accepted: int  # 0 or 1


class FeatureVector(BaseModel):
    """Numeric feature vector for model input."""
    event_type_encoded: int
    zip_region: int  # First 3 digits of zip
    num_guards: int
    hours: float
    day_of_week: int
    hour_of_day: int
    month: int
    is_armed: int
    requires_vehicle: int
    crowd_size: int
    is_weekend: int
    is_night_shift: int
    guard_hours_total: float  # num_guards * hours
