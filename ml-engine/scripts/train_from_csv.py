#!/usr/bin/env python3
"""
Train ML models from CSV file (no database required).
Fast training for SDPS demo.
"""
import os
import pickle
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "data", "processed", "training_data_2026.csv")
MODEL_DIR = os.path.join(SCRIPT_DIR, "..", "models", "trained")


def main():
    print("=" * 60)
    print("GuardQuote ML Training (CSV Mode)")
    print("=" * 60)
    
    # Load data
    print(f"\nLoading: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} records")
    
    # Encode categorical features
    event_encoder = LabelEncoder()
    state_encoder = LabelEncoder()
    risk_zone_encoder = LabelEncoder()
    
    df['event_type_encoded'] = event_encoder.fit_transform(df['event_type'])
    df['state_encoded'] = state_encoder.fit_transform(df['state'])
    df['risk_zone_encoded'] = risk_zone_encoder.fit_transform(df['risk_zone'])
    
    # Feature sets
    price_features = [
        'event_type_encoded', 'state_encoded', 'risk_zone_encoded',
        'guards', 'duration', 'total_guard_hours', 'crowd_size',
        'day_of_week', 'hour_of_day', 'month',
        'is_weekend', 'is_night_shift', 'is_armed', 'has_vehicle', 'tier'
    ]
    
    risk_features = [
        'event_type_encoded', 'state_encoded',
        'guards', 'duration', 'crowd_size',
        'day_of_week', 'hour_of_day', 'month',
        'is_weekend', 'is_night_shift', 'is_armed'
    ]
    
    # ============================================================
    # Train Price Model
    # ============================================================
    print("\n" + "=" * 60)
    print("Training Price Model (Gradient Boosting)")
    print("=" * 60)
    
    X_price = df[price_features]
    y_price = df['price']
    
    X_train, X_test, y_train, y_test = train_test_split(X_price, y_price, test_size=0.2, random_state=42)
    
    price_scaler = StandardScaler()
    X_train_scaled = price_scaler.fit_transform(X_train)
    X_test_scaled = price_scaler.transform(X_test)
    
    price_model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        random_state=42
    )
    price_model.fit(X_train, y_train)
    
    y_pred = price_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    print(f"  MAE: ${mae:.2f}")
    print(f"  MAPE: {mape:.1f}%")
    print(f"  R² Score: {r2:.4f}")
    
    # Cross-validation
    cv_scores = cross_val_score(price_model, X_price, y_price, cv=5, scoring='r2')
    print(f"  CV R² Score: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    
    # Feature importance
    print("\n  Top Features:")
    importance = sorted(zip(price_features, price_model.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importance[:5]:
        print(f"    {feat}: {imp:.3f}")
    
    # ============================================================
    # Train Risk Model
    # ============================================================
    print("\n" + "=" * 60)
    print("Training Risk Model (Random Forest Classifier)")
    print("=" * 60)
    
    # Convert risk_score to levels
    def risk_to_level(score):
        if score < 0.25: return 0  # low
        elif score < 0.5: return 1  # medium
        elif score < 0.75: return 2  # high
        return 3  # critical
    
    X_risk = df[risk_features]
    y_risk = df['risk_score'].apply(risk_to_level)
    
    X_train, X_test, y_train, y_test = train_test_split(X_risk, y_risk, test_size=0.2, random_state=42)
    
    risk_scaler = StandardScaler()
    X_train_scaled = risk_scaler.fit_transform(X_train)
    
    risk_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    risk_model.fit(X_train, y_train)
    
    y_pred = risk_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"  Accuracy: {accuracy:.4f}")
    
    # ============================================================
    # Train Acceptance Model
    # ============================================================
    print("\n" + "=" * 60)
    print("Training Acceptance Model (Logistic Regression)")
    print("=" * 60)
    
    accept_features = risk_features + ['price']
    X_accept = df[accept_features]
    y_accept = df['accepted']
    
    X_train, X_test, y_train, y_test = train_test_split(X_accept, y_accept, test_size=0.2, random_state=42)
    
    accept_scaler = StandardScaler()
    X_train_scaled = accept_scaler.fit_transform(X_train)
    X_test_scaled = accept_scaler.transform(X_test)
    
    accept_model = LogisticRegression(random_state=42, max_iter=1000)
    accept_model.fit(X_train_scaled, y_train)
    
    y_pred = accept_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"  Accuracy: {accuracy:.4f}")
    
    # ============================================================
    # Save Models
    # ============================================================
    print("\n" + "=" * 60)
    print("Saving Models")
    print("=" * 60)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    artifacts = {
        'price_model': price_model,
        'price_scaler': price_scaler,
        'price_model_name': 'GradientBoostingRegressor',
        'price_features': price_features,
        'price_metrics': {'mae': mae, 'r2': r2, 'mape': mape},
        'risk_model': risk_model,
        'risk_scaler': risk_scaler,
        'risk_features': risk_features,
        'accept_model': accept_model,
        'accept_scaler': accept_scaler,
        'accept_features': accept_features,
        'encoders': {
            'event_type': event_encoder,
            'state': state_encoder,
            'risk_zone': risk_zone_encoder,
        },
        'trained_at': datetime.now().isoformat(),
        'training_samples': len(df),
        'version': '2.1.0',
    }
    
    model_path = os.path.join(MODEL_DIR, 'guardquote_models.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(artifacts, f)
    
    size_kb = os.path.getsize(model_path) / 1024
    print(f"  ✓ Saved to: {model_path}")
    print(f"  ✓ Size: {size_kb:.1f} KB")
    
    # Update metadata
    meta_path = os.path.join(MODEL_DIR, 'model_metadata.txt')
    with open(meta_path, 'w') as f:
        f.write(f"version: 2.1.0\n")
        f.write(f"price_model: GradientBoostingRegressor\n")
        f.write(f"price_r2: {r2:.4f}\n")
        f.write(f"price_mae: {mae:.2f}\n")
        f.write(f"price_mape: {mape:.1f}%\n")
        f.write(f"risk_accuracy: {accuracy:.4f}\n")
        f.write(f"training_samples: {len(df)}\n")
        f.write(f"trained_at: {datetime.now().isoformat()}\n")
    
    print(f"  ✓ Metadata: {meta_path}")
    
    print("\n" + "=" * 60)
    print("✓ Training Complete!")
    print("=" * 60)
    
    print(f"""
Summary:
  Price Model:  R²={r2:.3f}, MAE=${mae:.2f}, MAPE={mape:.1f}%
  Risk Model:   Accuracy={accuracy:.3f}
  Accept Model: Accuracy={accuracy:.3f}
  Samples:      {len(df)}
  
Model ready for deployment!
""")


if __name__ == "__main__":
    main()
