# Train Model Skill

Use this skill to train ML models on the loaded training data.

## Trigger Phrases
- "/train-model"
- "train the ML model"
- "retrain models"
- "update model"

## Prerequisites
- Training data loaded in `ml_training_data_2026` table
- Python venv with scikit-learn, xgboost installed

## Quick Command
```bash
cd /Users/rjgar/Projects/guard-quote/ml-engine
source .venv/bin/activate
python scripts/train_models.py
```

## Training Pipeline

### 1. Load Data
```python
# From PostgreSQL
SELECT * FROM ml_training_data_2026;

# Or from CSV
data/processed/training_data_2026.csv
```

### 2. Feature Engineering
```python
# Categorical encoding
- event_type → LabelEncoder
- state → LabelEncoder
- risk_zone → LabelEncoder

# Numeric features (15 total for price model)
- location_risk
- duration
- guards
- total_guard_hours
- crowd_size
- tier
- cloud
- ai_agent
- is_weekend
- is_holiday
- is_night_shift
- is_armed
- has_vehicle
- day_of_week
- hour_of_day
- month
```

### 3. Model Training

#### Price Model (Regression)
```python
# Compare 3 algorithms
models = {
    "Random Forest": RandomForestRegressor(n_estimators=100),
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=100),
    "Ridge": Ridge(alpha=1.0)
}

# Select best by R² score
# Current best: Gradient Boosting
```

#### Risk Model (Classification)
```python
# 4-class classification: low, medium, high, critical
RandomForestClassifier(n_estimators=100, class_weight='balanced')
```

#### Acceptance Model (Binary Classification)
```python
# Predict quote acceptance
LogisticRegression(max_iter=1000)
```

### 4. Model Persistence
```python
# Save to pickle
models/trained/guardquote_models.pkl

# Contents:
{
    'price_model': model,
    'price_scaler': StandardScaler,
    'price_features': [...],
    'risk_model': model,
    'risk_scaler': StandardScaler,
    'risk_features': [...],
    'accept_model': model,
    'accept_scaler': StandardScaler,
    'encoders': {...},
    'trained_at': datetime
}
```

## Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Price MAE | < 15% | Mean Absolute Error relative to price |
| Price R² | > 0.75 | Coefficient of determination |
| Risk Accuracy | > 80% | Classification accuracy |
| Accept AUC | > 0.70 | Area under ROC curve |
| Inference | < 200ms | Single prediction latency |

## Output

After training:
```
=== Training Results ===
Price Model: Gradient Boosting
  - R² Score: 0.82
  - MAE: $2,450.00 (8.2%)
  - RMSE: $4,120.00
  - CV Score: 0.79 ± 0.03

Risk Model: Random Forest
  - Accuracy: 84.2%
  - F1 (weighted): 0.83

Acceptance Model: Logistic Regression
  - AUC: 0.76
  - Accuracy: 72.1%

Models saved to: models/trained/guardquote_models.pkl
```

## Retraining Triggers

Consider retraining when:
- New training data added (> 500 records)
- Price distribution shifts significantly
- Acceptance rate changes > 10%
- Monthly scheduled retrain
- Model performance degrades

## Integration with FastAPI

After training, restart ML engine:
```bash
cd /Users/rjgar/Projects/guard-quote/ml-engine
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Verify model loaded:
```bash
curl http://localhost:8000/api/v1/model-info
```

## Monitoring (Pi1)

Push training metrics to Prometheus:
```bash
# Training complete metric
curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_ml \
  -d "guardquote_model_trained{model=\"price\"} 1"

# Model score metric
curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_ml \
  -d "guardquote_model_r2_score 0.82"
```

---

*Last updated: January 15, 2026*
