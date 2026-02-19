# GuardQuote ML Engine

Machine learning service for security guard quote pricing and risk assessment.

## Overview

The ML Engine provides:
- **Price Prediction** - Gradient Boosting regression model
- **Risk Assessment** - Random Forest classification (4 levels)
- **Acceptance Prediction** - Logistic regression for quote acceptance

## Quick Start

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run server
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/v1/quote` | POST | Generate ML-based quote |
| `/api/v1/quote/rule-based` | POST | Fallback rule-based quote |
| `/api/v1/risk-assessment` | POST | Detailed risk analysis |
| `/api/v1/event-types` | GET | Available event types |
| `/api/v1/model-info` | GET | Loaded model information |

## Project Structure

```
ml-engine/
├── src/
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   └── routes.py        # API endpoints
│   ├── models/
│   │   ├── pricing_engine.py    # Rule-based fallback
│   │   ├── trained_predictor.py # ML model predictor
│   │   └── schemas.py           # Pydantic models
│   └── config/
│       └── settings.py      # Configuration
├── scripts/
│   ├── train_models.py              # Training pipeline
│   ├── generate_training_data_2026.py  # Data generation
│   └── ingest_ai_spec.py            # Parse AI output
├── models/trained/
│   └── guardquote_models.pkl  # Serialized models
├── data/
│   ├── seed_2026.sql          # Database seed data
│   └── processed/
│       └── training_data_2026.csv
├── pyproject.toml
└── .env
```

## Training Pipeline

### 1. Generate Training Data

```bash
python scripts/generate_training_data_2026.py
```

Generates 1,100 records with:
- 10 event types (tech_summit, music_festival, vip_protection, etc.)
- 15 locations with regional modifiers
- 2026 pricing benchmarks

### 2. Train Models

```bash
python scripts/train_models.py
```

Trains three models:
- **Price Model:** Gradient Boosting Regressor
- **Risk Model:** Random Forest Classifier
- **Accept Model:** Logistic Regression

### 3. Model Output

Models are saved to `models/trained/guardquote_models.pkl`:
```python
{
    'price_model': GradientBoostingRegressor,
    'price_scaler': StandardScaler,
    'price_features': [...],
    'risk_model': RandomForestClassifier,
    'risk_scaler': StandardScaler,
    'risk_features': [...],
    'accept_model': LogisticRegression,
    'encoders': {...},
    'trained_at': datetime
}
```

## Features

### Price Model (15 features)
1. event_type (encoded)
2. state (encoded)
3. risk_zone (encoded)
4. zip_region (first 3 digits)
5. num_guards
6. hours_per_guard
7. total_guard_hours
8. crowd_size
9. day_of_week
10. hour_of_day
11. month
12. is_weekend
13. is_night_shift
14. is_armed
15. has_vehicle

### Risk Model (12 features)
Same as price model, excluding:
- risk_zone_encoded
- has_vehicle

## Configuration

Create `.env` file:
```env
ML_ENGINE_HOST=0.0.0.0
ML_ENGINE_PORT=8000
MODEL_PATH=./models/trained
LOG_LEVEL=INFO

# PostgreSQL on Pi1
DB_HOST=[see .env]
DB_PORT=5432
DB_USER=guardquote
DB_PASSWORD=WPU8bj3nbwFyZFEtHZQz
DB_NAME=guardquote
```

## 2026 Event Types

| Code | Name | Base Rate | Risk Multiplier |
|------|------|-----------|-----------------|
| tech_summit | Tech Summit | $55/hr | 1.10x |
| music_festival | Music Festival | $65/hr | 1.80x |
| vip_protection | VIP Protection | $110/hr | 1.00x |
| gov_rally | Government Rally | $58/hr | 2.00x |
| industrial | Industrial Site | $45/hr | 1.50x |
| retail_lp | Retail Loss Prevention | $32/hr | 1.40x |
| social_wedding | Social Wedding | $40/hr | 0.90x |

## Testing

```bash
# Run tests
pytest tests/ -v

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/event-types
```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Price MAE | < 15% | 8.2% |
| Price R² | > 0.75 | 0.82 |
| Risk Accuracy | > 80% | 84% |
| Inference | < 200ms | ~50ms |
