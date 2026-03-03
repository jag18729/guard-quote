"""Data schemas for ML training and inference."""
from __future__ import annotations

from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


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
    id: int | None = None
    company_name: str
    contact_name: str | None = None
    email: str
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    created_at: datetime | None = None


class QuoteData(BaseModel):
    """Quote data model for ML training."""
    id: int | None = None
    client_id: int | None = None
    created_by: int | None = None

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
    base_price: float | None = None
    final_price: float | None = None
    risk_level: RiskLevel | None = None
    status: QuoteStatus = QuoteStatus.DRAFT

    # Metadata
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


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
