#!/usr/bin/env python3
"""
ML Model Training Pipeline for GuardQuote
Trains price prediction and risk assessment models.
"""
import os
import pickle
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, classification_report
import mysql.connector

# Configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "database": "guardquote",
}

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "trained")


def load_training_data():
    """Load ML training data from database."""
    print("Loading training data from MySQL...")

    conn = mysql.connector.connect(**DB_CONFIG)

    query = """
    SELECT
        event_type_code,
        zip_code,
        state,
        risk_zone,
        num_guards,
        hours_per_guard,
        total_guard_hours,
        crowd_size,
        day_of_week,
        hour_of_day,
        month,
        is_weekend,
        is_night_shift,
        is_armed,
        has_vehicle,
        final_price,
        risk_score,
        was_accepted
    FROM ml_training_data
    """

    df = pd.read_sql(query, conn)
    conn.close()

    print(f"  Loaded {len(df)} records")
    return df


def preprocess_features(df):
    """Preprocess features for model training."""
    print("Preprocessing features...")

    # Create a copy
    data = df.copy()

    # Encode categorical variables
    event_encoder = LabelEncoder()
    state_encoder = LabelEncoder()
    risk_zone_encoder = LabelEncoder()

    data['event_type_encoded'] = event_encoder.fit_transform(data['event_type_code'])
    data['state_encoded'] = state_encoder.fit_transform(data['state'])
    data['risk_zone_encoded'] = risk_zone_encoder.fit_transform(data['risk_zone'].fillna('medium'))

    # Extract zip region (first 3 digits)
    data['zip_region'] = data['zip_code'].str[:3].astype(int)

    # Convert booleans to int
    bool_cols = ['is_weekend', 'is_night_shift', 'is_armed', 'has_vehicle', 'was_accepted']
    for col in bool_cols:
        data[col] = data[col].astype(int)

    # Feature columns for price prediction
    price_features = [
        'event_type_encoded', 'state_encoded', 'risk_zone_encoded', 'zip_region',
        'num_guards', 'hours_per_guard', 'total_guard_hours', 'crowd_size',
        'day_of_week', 'hour_of_day', 'month',
        'is_weekend', 'is_night_shift', 'is_armed', 'has_vehicle'
    ]

    # Feature columns for risk prediction (no zip_region — matches trained model)
    risk_features = [
        'event_type_encoded', 'state_encoded',
        'num_guards', 'hours_per_guard', 'crowd_size',
        'day_of_week', 'hour_of_day', 'month',
        'is_weekend', 'is_night_shift', 'is_armed'
    ]

    encoders = {
        'event_type': event_encoder,
        'state': state_encoder,
        'risk_zone': risk_zone_encoder,
    }

    print(f"  Price features: {len(price_features)}")
    print(f"  Risk features: {len(risk_features)}")

    return data, price_features, risk_features, encoders


def train_price_model(data, features):
    """Train the price prediction model."""
    print("\n" + "="*50)
    print("Training Price Prediction Model")
    print("="*50)

    X = data[features]
    y = data['final_price']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train multiple models and compare
    models = {
        'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42),
        'Ridge Regression': Ridge(alpha=1.0),
    }

    best_model = None
    best_score = -float('inf')
    best_name = None

    for name, model in models.items():
        print(f"\nTraining {name}...")

        if name == 'Ridge Regression':
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        print(f"  MAE: ${mae:.2f}")
        print(f"  RMSE: ${rmse:.2f}")
        print(f"  R² Score: {r2:.4f}")

        # Cross-validation
        if name != 'Ridge Regression':
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
            print(f"  CV R² Score: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

        if r2 > best_score:
            best_score = r2
            best_model = model
            best_name = name

    print(f"\n✓ Best Model: {best_name} (R² = {best_score:.4f})")

    # Feature importance for tree-based models
    if hasattr(best_model, 'feature_importances_'):
        print("\nTop Feature Importances:")
        importance_df = pd.DataFrame({
            'feature': features,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)

        for _, row in importance_df.head(10).iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")

    return best_model, scaler, best_name


def train_risk_model(data, features):
    """Train the risk classification model."""
    print("\n" + "="*50)
    print("Training Risk Assessment Model")
    print("="*50)

    X = data[features]

    # Convert risk_score to risk levels for classification
    def risk_to_level(score):
        if score < 0.25:
            return 0  # low
        elif score < 0.5:
            return 1  # medium
        elif score < 0.75:
            return 2  # high
        return 3  # critical

    y = data['risk_score'].apply(risk_to_level)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train classifier
    print("\nTraining Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n  Accuracy: {accuracy:.4f}")

    print("\n  Classification Report:")
    risk_labels = ['low', 'medium', 'high', 'critical']
    report = classification_report(y_test, y_pred, target_names=risk_labels)
    for line in report.split('\n'):
        print(f"    {line}")

    # Feature importance
    print("\nTop Feature Importances:")
    importance_df = pd.DataFrame({
        'feature': features,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)

    for _, row in importance_df.head(8).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")

    return model, scaler


def train_acceptance_model(data, features):
    """Train model to predict quote acceptance."""
    print("\n" + "="*50)
    print("Training Acceptance Prediction Model")
    print("="*50)

    # Add price as a feature for acceptance prediction
    accept_features = features + ['final_price']

    X = data[accept_features]
    y = data['was_accepted'].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("\nTraining Logistic Regression...")
    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"  Accuracy: {accuracy:.4f}")

    return model, scaler, accept_features


def save_models(price_model, price_scaler, price_name,
                risk_model, risk_scaler,
                accept_model, accept_scaler, accept_features,
                encoders, price_features, risk_features):
    """Save trained models to disk."""
    print("\n" + "="*50)
    print("Saving Models")
    print("="*50)

    os.makedirs(MODEL_DIR, exist_ok=True)

    # Save all models and artifacts
    artifacts = {
        'price_model': price_model,
        'price_scaler': price_scaler,
        'price_model_name': price_name,
        'price_features': price_features,
        'risk_model': risk_model,
        'risk_scaler': risk_scaler,
        'risk_features': risk_features,
        'accept_model': accept_model,
        'accept_scaler': accept_scaler,
        'accept_features': accept_features,
        'encoders': encoders,
        'trained_at': datetime.now().isoformat(),
    }

    model_path = os.path.join(MODEL_DIR, 'guardquote_models.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(artifacts, f)

    print(f"  ✓ Models saved to: {model_path}")
    print(f"  ✓ File size: {os.path.getsize(model_path) / 1024:.1f} KB")

    # Save a metadata file
    metadata = {
        'price_model': price_name,
        'price_features': len(price_features),
        'risk_features': len(risk_features),
        'trained_at': datetime.now().isoformat(),
    }

    meta_path = os.path.join(MODEL_DIR, 'model_metadata.txt')
    with open(meta_path, 'w') as f:
        for k, v in metadata.items():
            f.write(f"{k}: {v}\n")

    print(f"  ✓ Metadata saved to: {meta_path}")


def main():
    """Run the training pipeline."""
    print("="*50)
    print("GuardQuote ML Training Pipeline")
    print("="*50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Load data
    df = load_training_data()

    # Preprocess
    data, price_features, risk_features, encoders = preprocess_features(df)

    # Train models
    price_model, price_scaler, price_name = train_price_model(data, price_features)
    risk_model, risk_scaler = train_risk_model(data, risk_features)
    accept_model, accept_scaler, accept_features = train_acceptance_model(data, risk_features)

    # Save models
    save_models(
        price_model, price_scaler, price_name,
        risk_model, risk_scaler,
        accept_model, accept_scaler, accept_features,
        encoders, price_features, risk_features
    )

    print("\n" + "="*50)
    print("Training Complete!")
    print("="*50)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
