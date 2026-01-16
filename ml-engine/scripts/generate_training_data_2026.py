#!/usr/bin/env python3
"""
GuardQuote ML Training Data Generator (2026 Edition)
Generates 1000+ realistic training records for PostgreSQL with 2026 pricing benchmarks.

2026 Pricing Context:
- Unarmed guards: $25-$45/hr
- Specialized event security: $35-$65/hr
- Agentic AI workflow features included
"""

import random
import csv
import os
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

try:
    import psycopg2
    from psycopg2 import Error
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("Warning: psycopg2 not installed. CSV-only mode enabled.")

# Configuration - Pi1 PostgreSQL (192.168.2.70)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "192.168.2.70"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "guardquote"),
    "password": os.getenv("DB_PASSWORD", "WPU8bj3nbwFyZFEtHZQz"),
    "database": os.getenv("DB_NAME", "guardquote"),
}

# 2026 Event Types with updated pricing
EVENT_TYPES_2026 = [
    # (code, name, description, base_hourly_rate, risk_weight, min_guards)
    ("tech_summit", "Tech Summit", "High-value IP and hardware focus", 55.00, 0.35, 2),
    ("music_festival", "Music Festival", "Crowd density and substance-risk management", 65.00, 0.80, 4),
    ("retail_lp", "Retail Loss Prevention", "AI-integrated theft prevention", 32.00, 0.45, 1),
    ("vip_protection", "VIP Protection", "Executive close protection", 110.00, 0.25, 1),
    ("industrial", "Industrial Site", "Critical infrastructure, drone monitoring", 45.00, 0.55, 2),
    ("social_wedding", "Social Wedding", "Low-risk concierge and ushering", 40.00, 0.15, 1),
    ("gov_rally", "Government Rally", "Extreme risk, perimeter hardening", 58.00, 0.95, 6),
    ("corporate", "Corporate Event", "Business conferences", 42.00, 0.25, 1),
    ("concert", "Concert", "Live performances", 55.00, 0.75, 3),
    ("sports", "Sporting Event", "Games and tournaments", 48.00, 0.65, 2),
]

# 2026 Locations with regional modifiers (CA/NY high-cost leaders)
LOCATIONS_2026 = [
    # (zip, city, state, county, region, risk_zone, base_multiplier)
    ("94102", "San Francisco", "CA", "San Francisco", "West Coast", "high", 1.45),
    ("90001", "Los Angeles", "CA", "Los Angeles", "West Coast", "high", 1.35),
    ("10001", "New York", "NY", "New York", "Northeast", "critical", 1.40),
    ("10019", "Manhattan", "NY", "New York", "Northeast", "critical", 1.50),
    ("78701", "Austin", "TX", "Travis", "Southwest", "medium", 1.15),
    ("33101", "Miami", "FL", "Miami-Dade", "Southeast", "high", 1.30),
    ("60601", "Chicago", "IL", "Cook", "Midwest", "high", 1.35),
    ("98101", "Seattle", "WA", "King", "West Coast", "medium", 1.30),
    ("02101", "Boston", "MA", "Suffolk", "Northeast", "high", 1.35),
    ("20001", "Washington DC", "DC", "District", "Northeast", "critical", 1.45),
    ("30301", "Atlanta", "GA", "Fulton", "Southeast", "medium", 1.20),
    ("80201", "Denver", "CO", "Denver", "Mountain", "medium", 1.15),
    ("85001", "Phoenix", "AZ", "Maricopa", "Southwest", "low", 1.10),
    ("89101", "Las Vegas", "NV", "Clark", "West Coast", "high", 1.35),
    ("75201", "Dallas", "TX", "Dallas", "Southwest", "medium", 1.18),
]

# Cloud providers for Agentic AI feature
CLOUD_PROVIDERS = [
    (1, "AWS", "AWS Bedrock"),
    (2, "Azure", "Azure OpenAI"),
    (3, "GCP", "GCP Vertex"),
]

# Guard tiers (2026)
GUARD_TIERS = {
    1: {"name": "Standard", "multiplier": 1.0},
    2: {"name": "Armed", "multiplier": 1.35},
    3: {"name": "Executive", "multiplier": 2.0},
}

def generate_training_record(record_id: int, event_types: list, locations: list) -> dict:
    """Generate a single ML training record with 2026 pricing."""

    # Select random event type and location
    et = random.choice(event_types)
    et_code, et_name, et_desc, base_rate, risk_weight, min_guards = et

    loc = random.choice(locations)
    zip_code, city, state, county, region, risk_zone, loc_multiplier = loc

    # Event date (past 2 years for training data variety)
    days_ago = random.randint(1, 730)
    event_date = datetime.now() - timedelta(days=days_ago)
    hour = random.choice([6, 7, 8, 9, 10, 14, 15, 16, 18, 19, 20, 21, 22, 23])
    event_date = event_date.replace(hour=hour, minute=0, second=0)

    # Guard requirements based on event type
    if et_code == "music_festival":
        num_guards = random.randint(8, 60)
        hours = random.uniform(8, 48)
        crowd_size = random.randint(1000, 50000)
    elif et_code == "gov_rally":
        num_guards = random.randint(15, 80)
        hours = random.uniform(6, 14)
        crowd_size = random.randint(500, 25000)
    elif et_code == "tech_summit":
        num_guards = random.randint(2, 8)
        hours = random.uniform(8, 14)
        crowd_size = random.randint(100, 2000)
    elif et_code == "vip_protection":
        num_guards = random.randint(1, 4)
        hours = random.uniform(4, 72)
        crowd_size = random.randint(0, 50)
    elif et_code == "industrial":
        num_guards = random.randint(1, 4)
        hours = random.uniform(8, 168)  # Up to week-long coverage
        crowd_size = 0
    elif et_code == "social_wedding":
        num_guards = random.randint(1, 4)
        hours = random.uniform(4, 8)
        crowd_size = random.randint(50, 400)
    elif et_code == "sports":
        num_guards = random.randint(4, 25)
        hours = random.uniform(4, 10)
        crowd_size = random.randint(2000, 80000)
    elif et_code == "concert":
        num_guards = random.randint(6, 35)
        hours = random.uniform(6, 14)
        crowd_size = random.randint(500, 25000)
    else:
        num_guards = random.randint(min_guards, min_guards + 4)
        hours = random.uniform(4, 12)
        crowd_size = random.randint(50, 1000)

    hours = round(hours, 2)
    total_guard_hours = round(num_guards * hours, 2)

    # Temporal features
    day_of_week = event_date.weekday()
    is_weekend = day_of_week >= 5
    is_night_shift = hour >= 22 or hour < 6
    is_holiday = random.random() < 0.05  # 5% chance

    # Guard tier selection
    if et_code == "vip_protection":
        tier = 3  # Executive
    elif et_code in ["gov_rally", "music_festival"]:
        tier = random.choices([1, 2], weights=[0.3, 0.7])[0]
    else:
        tier = random.choices([1, 2, 3], weights=[0.6, 0.35, 0.05])[0]

    tier_data = GUARD_TIERS[tier]
    is_armed = tier >= 2

    # Vehicle patrol
    has_vehicle = random.random() < 0.25

    # Cloud provider for Agentic AI
    cloud = random.choice(CLOUD_PROVIDERS)
    cloud_id, cloud_name, cloud_orchestrator = cloud

    # AI agent flag (88% of 2026 adopters use agentic AI)
    ai_agent = 1 if random.random() < 0.88 else 0

    # Calculate risk score
    risk_score = float(risk_weight)
    if is_weekend:
        risk_score += 0.10
    if is_night_shift:
        risk_score += 0.15
    if is_holiday:
        risk_score += 0.20
    if crowd_size > 5000:
        risk_score += min(crowd_size / 50000, 0.30)

    # Location risk adjustment
    zone_risk = {"low": 0.0, "medium": 0.10, "high": 0.20, "critical": 0.30}
    risk_score += zone_risk.get(risk_zone, 0.10)
    risk_score = min(risk_score, 1.0)

    # Calculate 2026 pricing
    risk_multiplier = 1.0 + (risk_score * 0.5)
    hourly_rate = float(base_rate) * float(loc_multiplier) * risk_multiplier * tier_data["multiplier"]

    subtotal = hourly_rate * hours * num_guards

    # Armed premium (2026: $18/hr per guard)
    if is_armed:
        subtotal += 18.0 * hours * num_guards

    # Vehicle premium (2026: $65 per guard)
    if has_vehicle:
        subtotal += 65.0 * num_guards

    # Holiday premium
    if is_holiday:
        subtotal *= 1.15

    # Weekend premium
    if is_weekend:
        subtotal *= 1.08

    total_price = round(subtotal, 2)

    # Acceptance modeling (price sensitivity varies by tier)
    # VIP/Executive is price-inelastic; standard is price-sensitive
    if tier == 3:
        # Executive: 85% base acceptance
        accept_prob = 0.85
    elif tier == 2:
        # Armed: 75% base acceptance
        accept_prob = 0.75
    else:
        # Standard: price-sensitive
        accept_prob = 0.70

    # Adjust for extreme prices
    if total_price > 100000:
        accept_prob -= 0.20
    elif total_price > 50000:
        accept_prob -= 0.10
    elif total_price < 1000:
        accept_prob += 0.10

    # AI agent increases acceptance
    if ai_agent:
        accept_prob += 0.05

    accepted = 1 if random.random() < accept_prob else 0

    # Satisfaction score (1-5, correlates with acceptance and service)
    if accepted:
        if tier == 3:
            satisfaction = random.choices([4, 5], weights=[0.3, 0.7])[0]
        else:
            satisfaction = random.choices([3, 4, 5], weights=[0.2, 0.4, 0.4])[0]
    else:
        satisfaction = random.choices([1, 2, 3], weights=[0.3, 0.4, 0.3])[0]

    return {
        "event_type": et_code,
        "location_risk": round(loc_multiplier, 2),
        "state": state,
        "risk_zone": risk_zone,
        "duration": round(hours, 2),
        "guards": num_guards,
        "total_guard_hours": total_guard_hours,
        "crowd_size": crowd_size,
        "tier": tier,
        "cloud": cloud_id,
        "ai_agent": ai_agent,
        "is_weekend": 1 if is_weekend else 0,
        "is_holiday": 1 if is_holiday else 0,
        "is_night_shift": 1 if is_night_shift else 0,
        "is_armed": 1 if is_armed else 0,
        "has_vehicle": 1 if has_vehicle else 0,
        "day_of_week": day_of_week,
        "hour_of_day": hour,
        "month": event_date.month,
        "risk_score": round(risk_score, 3),
        "price": total_price,
        "accepted": accepted,
        "satisfaction": satisfaction,
        "zip_code": zip_code,
        "city": city,
    }


def generate_training_data(count: int = 1000) -> list:
    """Generate training dataset."""
    print(f"Generating {count} training records with 2026 pricing...")

    records = []
    for i in range(count):
        record = generate_training_record(i + 1, EVENT_TYPES_2026, LOCATIONS_2026)
        records.append(record)

        if (i + 1) % 250 == 0:
            print(f"  Generated {i + 1}/{count} records...")

    return records


def export_to_csv(records: list, output_path: str):
    """Export training data to CSV."""
    if not records:
        print("No records to export")
        return

    fieldnames = [
        "event_type", "location_risk", "duration", "guards", "tier", "cloud",
        "ai_agent", "is_weekend", "is_holiday", "price", "accepted", "satisfaction",
        "state", "risk_zone", "total_guard_hours", "crowd_size", "is_night_shift",
        "is_armed", "has_vehicle", "day_of_week", "hour_of_day", "month", "risk_score"
    ]

    with open(output_path, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)

    print(f"Exported {len(records)} records to {output_path}")


def insert_to_postgres(records: list):
    """Insert training data into PostgreSQL."""
    if not HAS_PSYCOPG2:
        print("psycopg2 not available. Skipping database insert.")
        return

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print(f"Connected to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}")

        # Create ml_training_data_2026 table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ml_training_data_2026 (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                location_risk DECIMAL(4, 2) NOT NULL,
                state VARCHAR(2) NOT NULL,
                risk_zone VARCHAR(20),
                duration DECIMAL(8, 2) NOT NULL,
                guards INT NOT NULL,
                total_guard_hours DECIMAL(10, 2) NOT NULL,
                crowd_size INT DEFAULT 0,
                tier INT NOT NULL,
                cloud INT NOT NULL,
                ai_agent INT DEFAULT 1,
                is_weekend INT DEFAULT 0,
                is_holiday INT DEFAULT 0,
                is_night_shift INT DEFAULT 0,
                is_armed INT DEFAULT 0,
                has_vehicle INT DEFAULT 0,
                day_of_week INT NOT NULL,
                hour_of_day INT NOT NULL,
                month INT NOT NULL,
                risk_score DECIMAL(4, 3),
                price DECIMAL(12, 2) NOT NULL,
                accepted INT DEFAULT 0,
                satisfaction INT DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Clear existing data
        cursor.execute("DELETE FROM ml_training_data_2026")

        # Insert records
        insert_sql = """
            INSERT INTO ml_training_data_2026 (
                event_type, location_risk, state, risk_zone, duration, guards,
                total_guard_hours, crowd_size, tier, cloud, ai_agent, is_weekend,
                is_holiday, is_night_shift, is_armed, has_vehicle, day_of_week,
                hour_of_day, month, risk_score, price, accepted, satisfaction
            ) VALUES (
                %(event_type)s, %(location_risk)s, %(state)s, %(risk_zone)s,
                %(duration)s, %(guards)s, %(total_guard_hours)s, %(crowd_size)s,
                %(tier)s, %(cloud)s, %(ai_agent)s, %(is_weekend)s, %(is_holiday)s,
                %(is_night_shift)s, %(is_armed)s, %(has_vehicle)s, %(day_of_week)s,
                %(hour_of_day)s, %(month)s, %(risk_score)s, %(price)s,
                %(accepted)s, %(satisfaction)s
            )
        """

        for i, record in enumerate(records):
            cursor.execute(insert_sql, record)
            if (i + 1) % 250 == 0:
                print(f"  Inserted {i + 1}/{len(records)} records...")

        conn.commit()
        print(f"Successfully inserted {len(records)} records into ml_training_data_2026")

        # Show summary stats
        cursor.execute("SELECT COUNT(*) FROM ml_training_data_2026")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT AVG(price), MIN(price), MAX(price) FROM ml_training_data_2026")
        avg_price, min_price, max_price = cursor.fetchone()

        cursor.execute("SELECT SUM(accepted)::float / COUNT(*) * 100 FROM ml_training_data_2026")
        accept_rate = cursor.fetchone()[0]

        print(f"\n--- Database Summary ---")
        print(f"Total records: {total}")
        print(f"Price range: ${min_price:,.2f} - ${max_price:,.2f}")
        print(f"Average price: ${avg_price:,.2f}")
        print(f"Acceptance rate: {accept_rate:.1f}%")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Database error: {e}")
        raise


def main():
    """Main execution."""
    print("=" * 60)
    print("GuardQuote 2026 ML Training Data Generator")
    print("=" * 60)
    print()

    # Generate 1000+ records
    records = generate_training_data(count=1100)

    # Get output directory
    script_dir = Path(__file__).parent.parent
    data_dir = script_dir / "data" / "processed"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Export to CSV
    csv_path = data_dir / "training_data_2026.csv"
    export_to_csv(records, str(csv_path))

    # Try inserting to PostgreSQL
    print()
    print("Attempting PostgreSQL insert...")
    try:
        insert_to_postgres(records)
    except Exception as e:
        print(f"PostgreSQL insert failed: {e}")
        print("CSV export was successful - you can load data manually.")

    print()
    print("=" * 60)
    print("Data generation complete!")
    print("=" * 60)

    # Show sample record
    print("\nSample record:")
    sample = records[0]
    for key, value in sample.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
