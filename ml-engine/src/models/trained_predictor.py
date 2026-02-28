"""
Trained ML Model Predictor for GuardQuote
Uses trained models for price and risk predictions.
"""
import os
import pickle
from datetime import datetime
from typing import Optional
import numpy as np

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "models", "trained", "guardquote_models.pkl"
)

# Risk level mappings
RISK_LEVELS = ['low', 'medium', 'high', 'critical']


class TrainedPredictor:
    """ML-based predictor using trained models."""

    def __init__(self):
        self.models = None
        self.loaded = False
        self._load_models()

    def _load_models(self):
        """Load trained models from disk."""
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, 'rb') as f:
                    self.models = pickle.load(f)
                self.loaded = True
                print(f"✓ Loaded trained models from {MODEL_PATH}")
                print(f"  Price model: {self.models.get('price_model_name', 'Unknown')}")
                print(f"  Trained at: {self.models.get('trained_at', 'Unknown')}")
            except Exception as e:
                print(f"✗ Error loading models: {e}")
                self.loaded = False
        else:
            print(f"✗ Model file not found: {MODEL_PATH}")
            self.loaded = False

    def _encode_event_type(self, event_type: str) -> int:
        """Encode event type to numeric value."""
        event_types = ['concert', 'construction', 'corporate', 'private', 'residential', 'retail', 'sports']
        try:
            return event_types.index(event_type.lower())
        except ValueError:
            return 3  # default to 'private'

    def _encode_state(self, state: str) -> int:
        """Encode state to numeric value."""
        states = ['AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'MA', 'NV', 'NY', 'TX', 'WA']
        try:
            return states.index(state.upper())
        except ValueError:
            return 1  # default to CA

    def _encode_risk_zone(self, risk_zone: str) -> int:
        """Encode risk zone to numeric value."""
        zones = ['critical', 'high', 'low', 'medium']
        try:
            return zones.index(risk_zone.lower())
        except ValueError:
            return 3  # default to medium

    def predict_price(
        self,
        event_type: str,
        state: str,
        zip_code: str,
        risk_zone: str,
        num_guards: int,
        hours: float,
        crowd_size: int,
        event_date: datetime,
        is_armed: bool = False,
        has_vehicle: bool = False,
    ) -> dict:
        """Predict price using trained model."""

        if not self.loaded:
            # Fallback to rule-based pricing
            return self._fallback_price(
                event_type, num_guards, hours, is_armed, has_vehicle
            )

        # Prepare features
        features = np.array([[
            self._encode_event_type(event_type),
            self._encode_state(state),
            self._encode_risk_zone(risk_zone),
            int(zip_code[:3]) if zip_code else 900,
            num_guards,
            hours,
            num_guards * hours,  # total_guard_hours
            crowd_size,
            event_date.weekday(),
            event_date.hour,
            event_date.month,
            1 if event_date.weekday() >= 5 else 0,  # is_weekend
            1 if event_date.hour >= 22 or event_date.hour < 6 else 0,  # is_night
            1 if is_armed else 0,
            1 if has_vehicle else 0,
        ]])

        # Predict
        price_model = self.models['price_model']
        predicted_price = price_model.predict(features)[0]

        # Calculate confidence based on feature completeness
        confidence = 0.95 if crowd_size > 0 else 0.88

        return {
            'predicted_price': round(max(predicted_price, 100), 2),
            'confidence': confidence,
            'model_used': self.models.get('price_model_name', 'Trained Model'),
        }

    def predict_risk(
        self,
        event_type: str,
        state: str,
        zip_code: str,
        num_guards: int,
        hours: float,
        crowd_size: int,
        event_date: datetime,
        is_armed: bool = False,
    ) -> dict:
        """Predict risk level using trained model."""

        if not self.loaded:
            return self._fallback_risk(event_type, crowd_size, event_date)

        # Prepare features (must match trained model: 11 features, no zip_region)
        features = np.array([[
            self._encode_event_type(event_type),
            self._encode_state(state),
            num_guards,
            hours,
            crowd_size,
            event_date.weekday(),
            event_date.hour,
            event_date.month,
            1 if event_date.weekday() >= 5 else 0,
            1 if event_date.hour >= 22 or event_date.hour < 6 else 0,
            1 if is_armed else 0,
        ]])

        # Predict
        risk_model = self.models['risk_model']
        risk_class = risk_model.predict(features)[0]
        risk_proba = risk_model.predict_proba(features)[0]

        risk_level = RISK_LEVELS[risk_class]
        risk_score = risk_proba[risk_class]

        # Generate factors based on prediction
        factors = self._generate_risk_factors(
            event_type, crowd_size, event_date, is_armed, risk_level
        )

        return {
            'risk_level': risk_level,
            'risk_score': round(float(risk_score), 3),
            'confidence': round(float(max(risk_proba)), 3),
            'factors': factors,
        }

    def _generate_risk_factors(
        self, event_type: str, crowd_size: int, event_date: datetime,
        is_armed: bool, risk_level: str
    ) -> list:
        """Generate human-readable risk factors."""
        factors = []

        if event_type in ['concert', 'sports']:
            factors.append(f"High-activity event type: {event_type}")

        if crowd_size > 1000:
            factors.append(f"Large crowd expected: {crowd_size:,} people")
        elif crowd_size > 500:
            factors.append(f"Medium crowd size: {crowd_size:,} people")

        if event_date.weekday() >= 5:
            factors.append("Weekend event (higher demand)")

        if event_date.hour >= 22 or event_date.hour < 6:
            factors.append("Night shift required")

        if is_armed:
            factors.append("Armed security requested")

        if not factors:
            factors.append("Standard risk profile")

        return factors

    def _fallback_price(
        self, event_type: str, num_guards: int, hours: float,
        is_armed: bool, has_vehicle: bool
    ) -> dict:
        """Fallback rule-based pricing."""
        base_rates = {
            'corporate': 35, 'concert': 45, 'sports': 42,
            'private': 30, 'construction': 32, 'retail': 28, 'residential': 25
        }

        base_rate = base_rates.get(event_type.lower(), 30)
        subtotal = base_rate * hours * num_guards

        if is_armed:
            subtotal += 15 * hours * num_guards
        if has_vehicle:
            subtotal += 50 * num_guards

        return {
            'predicted_price': round(subtotal * 1.0875, 2),  # with tax
            'confidence': 0.75,
            'model_used': 'Rule-based fallback',
        }

    def _fallback_risk(
        self, event_type: str, crowd_size: int, event_date: datetime
    ) -> dict:
        """Fallback rule-based risk assessment."""
        risk_weights = {
            'concert': 0.7, 'sports': 0.6, 'construction': 0.4,
            'retail': 0.35, 'private': 0.3, 'residential': 0.25, 'corporate': 0.2
        }

        score = risk_weights.get(event_type.lower(), 0.3)

        if event_date.weekday() >= 5:
            score += 0.1
        if event_date.hour >= 22 or event_date.hour < 6:
            score += 0.15
        if crowd_size > 1000:
            score += 0.2

        score = min(score, 1.0)

        if score < 0.25:
            level = 'low'
        elif score < 0.5:
            level = 'medium'
        elif score < 0.75:
            level = 'high'
        else:
            level = 'critical'

        return {
            'risk_level': level,
            'risk_score': round(score, 3),
            'confidence': 0.70,
            'factors': ['Rule-based assessment'],
        }


# Singleton instance
_predictor: Optional[TrainedPredictor] = None


def get_predictor() -> TrainedPredictor:
    """Get singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = TrainedPredictor()
    return _predictor
