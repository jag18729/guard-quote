import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EventType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    EVENT_TYPE_UNSPECIFIED: _ClassVar[EventType]
    EVENT_TYPE_CORPORATE: _ClassVar[EventType]
    EVENT_TYPE_CONCERT: _ClassVar[EventType]
    EVENT_TYPE_SPORTS: _ClassVar[EventType]
    EVENT_TYPE_PRIVATE: _ClassVar[EventType]
    EVENT_TYPE_CONSTRUCTION: _ClassVar[EventType]
    EVENT_TYPE_RETAIL: _ClassVar[EventType]
    EVENT_TYPE_RESIDENTIAL: _ClassVar[EventType]

class RiskLevel(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    RISK_LEVEL_UNSPECIFIED: _ClassVar[RiskLevel]
    RISK_LEVEL_LOW: _ClassVar[RiskLevel]
    RISK_LEVEL_MEDIUM: _ClassVar[RiskLevel]
    RISK_LEVEL_HIGH: _ClassVar[RiskLevel]
    RISK_LEVEL_CRITICAL: _ClassVar[RiskLevel]
EVENT_TYPE_UNSPECIFIED: EventType
EVENT_TYPE_CORPORATE: EventType
EVENT_TYPE_CONCERT: EventType
EVENT_TYPE_SPORTS: EventType
EVENT_TYPE_PRIVATE: EventType
EVENT_TYPE_CONSTRUCTION: EventType
EVENT_TYPE_RETAIL: EventType
EVENT_TYPE_RESIDENTIAL: EventType
RISK_LEVEL_UNSPECIFIED: RiskLevel
RISK_LEVEL_LOW: RiskLevel
RISK_LEVEL_MEDIUM: RiskLevel
RISK_LEVEL_HIGH: RiskLevel
RISK_LEVEL_CRITICAL: RiskLevel

class QuoteRequest(_message.Message):
    __slots__ = ("event_type", "location_zip", "num_guards", "hours", "event_date", "is_armed", "requires_vehicle", "crowd_size", "request_id", "client_id")
    EVENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    LOCATION_ZIP_FIELD_NUMBER: _ClassVar[int]
    NUM_GUARDS_FIELD_NUMBER: _ClassVar[int]
    HOURS_FIELD_NUMBER: _ClassVar[int]
    EVENT_DATE_FIELD_NUMBER: _ClassVar[int]
    IS_ARMED_FIELD_NUMBER: _ClassVar[int]
    REQUIRES_VEHICLE_FIELD_NUMBER: _ClassVar[int]
    CROWD_SIZE_FIELD_NUMBER: _ClassVar[int]
    REQUEST_ID_FIELD_NUMBER: _ClassVar[int]
    CLIENT_ID_FIELD_NUMBER: _ClassVar[int]
    event_type: EventType
    location_zip: str
    num_guards: int
    hours: float
    event_date: _timestamp_pb2.Timestamp
    is_armed: bool
    requires_vehicle: bool
    crowd_size: int
    request_id: str
    client_id: str
    def __init__(self, event_type: _Optional[_Union[EventType, str]] = ..., location_zip: _Optional[str] = ..., num_guards: _Optional[int] = ..., hours: _Optional[float] = ..., event_date: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., is_armed: bool = ..., requires_vehicle: bool = ..., crowd_size: _Optional[int] = ..., request_id: _Optional[str] = ..., client_id: _Optional[str] = ...) -> None: ...

class QuoteResponse(_message.Message):
    __slots__ = ("base_price", "risk_multiplier", "final_price", "risk_level", "confidence_score", "breakdown", "request_id", "processing_time_ms")
    BASE_PRICE_FIELD_NUMBER: _ClassVar[int]
    RISK_MULTIPLIER_FIELD_NUMBER: _ClassVar[int]
    FINAL_PRICE_FIELD_NUMBER: _ClassVar[int]
    RISK_LEVEL_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_SCORE_FIELD_NUMBER: _ClassVar[int]
    BREAKDOWN_FIELD_NUMBER: _ClassVar[int]
    REQUEST_ID_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    base_price: float
    risk_multiplier: float
    final_price: float
    risk_level: RiskLevel
    confidence_score: float
    breakdown: QuoteBreakdown
    request_id: str
    processing_time_ms: int
    def __init__(self, base_price: _Optional[float] = ..., risk_multiplier: _Optional[float] = ..., final_price: _Optional[float] = ..., risk_level: _Optional[_Union[RiskLevel, str]] = ..., confidence_score: _Optional[float] = ..., breakdown: _Optional[_Union[QuoteBreakdown, _Mapping]] = ..., request_id: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class QuoteBreakdown(_message.Message):
    __slots__ = ("model_used", "risk_factors", "num_guards", "hours", "is_armed", "has_vehicle")
    MODEL_USED_FIELD_NUMBER: _ClassVar[int]
    RISK_FACTORS_FIELD_NUMBER: _ClassVar[int]
    NUM_GUARDS_FIELD_NUMBER: _ClassVar[int]
    HOURS_FIELD_NUMBER: _ClassVar[int]
    IS_ARMED_FIELD_NUMBER: _ClassVar[int]
    HAS_VEHICLE_FIELD_NUMBER: _ClassVar[int]
    model_used: str
    risk_factors: _containers.RepeatedScalarFieldContainer[str]
    num_guards: int
    hours: float
    is_armed: bool
    has_vehicle: bool
    def __init__(self, model_used: _Optional[str] = ..., risk_factors: _Optional[_Iterable[str]] = ..., num_guards: _Optional[int] = ..., hours: _Optional[float] = ..., is_armed: bool = ..., has_vehicle: bool = ...) -> None: ...

class RiskRequest(_message.Message):
    __slots__ = ("event_type", "location_zip", "num_guards", "hours", "event_date", "is_armed", "crowd_size", "request_id")
    EVENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    LOCATION_ZIP_FIELD_NUMBER: _ClassVar[int]
    NUM_GUARDS_FIELD_NUMBER: _ClassVar[int]
    HOURS_FIELD_NUMBER: _ClassVar[int]
    EVENT_DATE_FIELD_NUMBER: _ClassVar[int]
    IS_ARMED_FIELD_NUMBER: _ClassVar[int]
    CROWD_SIZE_FIELD_NUMBER: _ClassVar[int]
    REQUEST_ID_FIELD_NUMBER: _ClassVar[int]
    event_type: EventType
    location_zip: str
    num_guards: int
    hours: float
    event_date: _timestamp_pb2.Timestamp
    is_armed: bool
    crowd_size: int
    request_id: str
    def __init__(self, event_type: _Optional[_Union[EventType, str]] = ..., location_zip: _Optional[str] = ..., num_guards: _Optional[int] = ..., hours: _Optional[float] = ..., event_date: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., is_armed: bool = ..., crowd_size: _Optional[int] = ..., request_id: _Optional[str] = ...) -> None: ...

class RiskResponse(_message.Message):
    __slots__ = ("risk_level", "risk_score", "factors", "recommendations", "request_id", "processing_time_ms")
    RISK_LEVEL_FIELD_NUMBER: _ClassVar[int]
    RISK_SCORE_FIELD_NUMBER: _ClassVar[int]
    FACTORS_FIELD_NUMBER: _ClassVar[int]
    RECOMMENDATIONS_FIELD_NUMBER: _ClassVar[int]
    REQUEST_ID_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    risk_level: RiskLevel
    risk_score: float
    factors: _containers.RepeatedScalarFieldContainer[str]
    recommendations: _containers.RepeatedScalarFieldContainer[str]
    request_id: str
    processing_time_ms: int
    def __init__(self, risk_level: _Optional[_Union[RiskLevel, str]] = ..., risk_score: _Optional[float] = ..., factors: _Optional[_Iterable[str]] = ..., recommendations: _Optional[_Iterable[str]] = ..., request_id: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class HealthRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class HealthResponse(_message.Message):
    __slots__ = ("status", "version", "model_loaded")
    STATUS_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    MODEL_LOADED_FIELD_NUMBER: _ClassVar[int]
    status: str
    version: str
    model_loaded: bool
    def __init__(self, status: _Optional[str] = ..., version: _Optional[str] = ..., model_loaded: bool = ...) -> None: ...

class ModelInfoRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ModelInfoResponse(_message.Message):
    __slots__ = ("status", "price_model_name", "trained_at", "price_features_count", "risk_features_count", "message")
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PRICE_MODEL_NAME_FIELD_NUMBER: _ClassVar[int]
    TRAINED_AT_FIELD_NUMBER: _ClassVar[int]
    PRICE_FEATURES_COUNT_FIELD_NUMBER: _ClassVar[int]
    RISK_FEATURES_COUNT_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    status: str
    price_model_name: str
    trained_at: str
    price_features_count: int
    risk_features_count: int
    message: str
    def __init__(self, status: _Optional[str] = ..., price_model_name: _Optional[str] = ..., trained_at: _Optional[str] = ..., price_features_count: _Optional[int] = ..., risk_features_count: _Optional[int] = ..., message: _Optional[str] = ...) -> None: ...

class EventTypesRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class EventTypesResponse(_message.Message):
    __slots__ = ("event_types",)
    EVENT_TYPES_FIELD_NUMBER: _ClassVar[int]
    event_types: _containers.RepeatedCompositeFieldContainer[EventTypeInfo]
    def __init__(self, event_types: _Optional[_Iterable[_Union[EventTypeInfo, _Mapping]]] = ...) -> None: ...

class EventTypeInfo(_message.Message):
    __slots__ = ("type", "name", "base_rate", "risk_weight")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    BASE_RATE_FIELD_NUMBER: _ClassVar[int]
    RISK_WEIGHT_FIELD_NUMBER: _ClassVar[int]
    type: EventType
    name: str
    base_rate: float
    risk_weight: float
    def __init__(self, type: _Optional[_Union[EventType, str]] = ..., name: _Optional[str] = ..., base_rate: _Optional[float] = ..., risk_weight: _Optional[float] = ...) -> None: ...
