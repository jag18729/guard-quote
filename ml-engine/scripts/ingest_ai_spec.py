#!/usr/bin/env python3
"""
AI Spec Ingestion Tool for GuardQuote ML Engine

Parses training data specifications from AI outputs (Gemini, ChatGPT, etc.)
and generates structured config files and SQL for the ML pipeline.

Usage:
    python ingest_ai_spec.py --input spec.txt
    python ingest_ai_spec.py --input spec.txt --apply  # Also apply to DB
    cat spec.txt | python ingest_ai_spec.py --stdin
"""

import argparse
import json
import re
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from decimal import Decimal

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Database config
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "192.168.2.70"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "guardquote"),
    "password": os.getenv("DB_PASSWORD", "WPU8bj3nbwFyZFEtHZQz"),
    "database": os.getenv("DB_NAME", "guardquote"),
}

# Column mappings for normalization
EVENT_TYPE_MAPPINGS = {
    "base_hourly_rate": "base_rate",
    "hourly_rate": "base_rate",
    "rate": "base_rate",
    "risk_weight": "risk_multiplier",
    "risk_factor": "risk_multiplier",
    "multiplier": "risk_multiplier",
    "event_name": "name",
    "type_name": "name",
    "event_code": "code",
    "type_code": "code",
    "slug": "code",
}

LOCATION_MAPPINGS = {
    "base_multiplier": "rate_modifier",
    "location_multiplier": "rate_modifier",
    "risk_modifier": "rate_modifier",
    "risk_level": "risk_zone",
    "zone": "risk_zone",
    "zip": "zip_code",
    "zipcode": "zip_code",
    "postal_code": "zip_code",
}

TRAINING_MAPPINGS = {
    "hours": "duration",
    "duration_hours": "duration",
    "num_guards": "guards",
    "guard_count": "guards",
    "final_price": "price",
    "total_price": "price",
    "quote_price": "price",
    "was_accepted": "accepted",
    "is_accepted": "accepted",
    "customer_satisfaction": "satisfaction",
    "rating": "satisfaction",
}


def detect_format(content: str) -> str:
    """Detect the format of the input content."""
    content_lower = content.lower()

    if "insert into" in content_lower:
        return "sql"
    elif re.search(r'\|.*\|.*\|', content) and '---' in content:
        return "markdown_table"
    elif ',' in content and '\n' in content and not '|' in content:
        # Check if it looks like CSV
        lines = content.strip().split('\n')
        if len(lines) > 1 and ',' in lines[0]:
            return "csv"
    return "prose"


def slugify(text: str) -> str:
    """Convert text to a valid code/slug."""
    # Remove special characters, replace spaces with underscores
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[\s-]+', '_', slug)
    return slug[:50]  # Max 50 chars


def parse_sql_inserts(content: str) -> dict:
    """Parse SQL INSERT statements."""
    result = {
        "event_types": [],
        "locations": [],
        "training_data": [],
    }

    # Find all INSERT statements
    insert_pattern = r"INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*(.+?)(?:;|$)"
    matches = re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL)

    for match in matches:
        table = match.group(1).lower()
        columns_str = match.group(2)
        values_str = match.group(3)

        # Parse column names
        columns = [c.strip().lower() for c in columns_str.split(',')]

        # Normalize column names
        if table == "event_types":
            columns = [EVENT_TYPE_MAPPINGS.get(c, c) for c in columns]
        elif table == "locations":
            columns = [LOCATION_MAPPINGS.get(c, c) for c in columns]

        # Parse value tuples
        value_tuples = re.findall(r'\(([^)]+)\)', values_str)

        for value_tuple in value_tuples:
            # Parse individual values
            values = []
            in_string = False
            current_value = ""
            quote_char = None

            for char in value_tuple + ',':
                if char in ('"', "'") and not in_string:
                    in_string = True
                    quote_char = char
                elif char == quote_char and in_string:
                    in_string = False
                    quote_char = None
                elif char == ',' and not in_string:
                    values.append(current_value.strip().strip("'\""))
                    current_value = ""
                else:
                    current_value += char

            # Create record dict
            record = {}
            for col, val in zip(columns, values):
                # Convert numeric values
                try:
                    if '.' in val:
                        record[col] = float(val)
                    else:
                        record[col] = int(val)
                except (ValueError, TypeError):
                    record[col] = val

            # Add to appropriate list
            if table == "event_types":
                # Auto-generate code if missing
                if "code" not in record and "name" in record:
                    record["code"] = slugify(record["name"])
                result["event_types"].append(record)
            elif table == "locations":
                result["locations"].append(record)

    return result


def parse_markdown_table(content: str) -> dict:
    """Parse markdown tables."""
    result = {
        "event_types": [],
        "locations": [],
        "training_data": [],
    }

    # Find tables
    lines = content.split('\n')
    current_table = None
    headers = []

    for i, line in enumerate(lines):
        line = line.strip()

        # Check for table context (look for keywords before table)
        if "event" in line.lower() and "type" in line.lower():
            current_table = "event_types"
        elif "location" in line.lower():
            current_table = "locations"

        # Parse table rows
        if '|' in line and '---' not in line:
            cells = [c.strip() for c in line.split('|') if c.strip()]

            if not headers:
                # This is the header row
                headers = [c.lower() for c in cells]
                # Normalize headers
                if current_table == "event_types":
                    headers = [EVENT_TYPE_MAPPINGS.get(h, h) for h in headers]
                elif current_table == "locations":
                    headers = [LOCATION_MAPPINGS.get(h, h) for h in headers]
            else:
                # This is a data row
                record = {}
                for header, value in zip(headers, cells):
                    try:
                        if '.' in value:
                            record[header] = float(value)
                        else:
                            record[header] = int(value)
                    except ValueError:
                        record[header] = value

                if current_table and headers:
                    if current_table == "event_types":
                        if "code" not in record and "name" in record:
                            record["code"] = slugify(record["name"])
                        result["event_types"].append(record)
                    elif current_table == "locations":
                        result["locations"].append(record)

        # Reset for next table
        if line == '' and headers:
            headers = []

    return result


def parse_prose(content: str) -> dict:
    """Parse prose/mixed format content."""
    result = {
        "event_types": [],
        "locations": [],
        "training_params": {},
        "pricing_context": {},
    }

    # Extract pricing context
    unarmed_match = re.search(r'unarmed[^$]*\$(\d+)[^\d]*\$?(\d+)?', content, re.IGNORECASE)
    if unarmed_match:
        result["pricing_context"]["unarmed_range"] = [
            int(unarmed_match.group(1)),
            int(unarmed_match.group(2)) if unarmed_match.group(2) else int(unarmed_match.group(1))
        ]

    # Extract event types from patterns like "Tech Summit should be $55/hr with 1.1x risk"
    event_pattern = r'(\w+(?:\s+\w+)?)\s+(?:should be|events?|at)\s+\$(\d+(?:\.\d+)?)/hr[^.]*(\d+(?:\.\d+)?)\s*x?\s*(?:risk|multiplier)?'
    for match in re.finditer(event_pattern, content, re.IGNORECASE):
        result["event_types"].append({
            "code": slugify(match.group(1)),
            "name": match.group(1).title(),
            "base_rate": float(match.group(2)),
            "risk_multiplier": float(match.group(3)),
        })

    # Extract year context
    year_match = re.search(r'20\d{2}', content)
    if year_match:
        result["pricing_context"]["year"] = int(year_match.group())

    return result


def generate_sql(data: dict) -> str:
    """Generate UPSERT SQL from parsed data."""
    sql_parts = [
        "-- Auto-generated from AI spec",
        f"-- Generated: {datetime.now().isoformat()}",
        ""
    ]

    # Event types
    if data.get("event_types"):
        sql_parts.append("-- Event Types (UPSERT)")
        for et in data["event_types"]:
            code = et.get("code", slugify(et.get("name", "unknown")))
            name = et.get("name", code.replace("_", " ").title())
            desc = et.get("description", "")
            rate = et.get("base_rate", 35.00)
            mult = et.get("risk_multiplier", 1.0)

            sql_parts.append(f"""INSERT INTO event_types (code, name, description, base_rate, risk_multiplier)
VALUES ('{code}', '{name}', '{desc}', {rate}, {mult})
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_rate = EXCLUDED.base_rate,
    risk_multiplier = EXCLUDED.risk_multiplier;
""")

    # Locations
    if data.get("locations"):
        sql_parts.append("-- Locations (UPSERT)")
        for loc in data["locations"]:
            zip_code = loc.get("zip_code", "00000")
            city = loc.get("city", "Unknown")
            state = loc.get("state", "XX")
            zone = loc.get("risk_zone", "medium")
            modifier = loc.get("rate_modifier", 1.0)

            sql_parts.append(f"""INSERT INTO locations (zip_code, city, state, risk_zone, rate_modifier)
VALUES ('{zip_code}', '{city}', '{state}', '{zone}', {modifier})
ON CONFLICT (zip_code) DO UPDATE SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    risk_zone = EXCLUDED.risk_zone,
    rate_modifier = EXCLUDED.rate_modifier;
""")

    return "\n".join(sql_parts)


def generate_config(data: dict, source: str = "unknown") -> dict:
    """Generate training config JSON."""
    config = {
        "source": source,
        "timestamp": datetime.now().isoformat(),
        "event_types": data.get("event_types", []),
        "locations": data.get("locations", []),
        "training_params": data.get("training_params", {
            "record_count": 1100,
            "tier_distribution": [0.55, 0.37, 0.08],
            "ai_agent_rate": 0.88,
            "target_acceptance": 0.74
        }),
        "pricing_context": data.get("pricing_context", {
            "year": 2026,
            "unarmed_range": [25, 45],
            "armed_premium": 18.00,
            "vehicle_premium": 65.00
        })
    }
    return config


def apply_to_database(sql: str) -> bool:
    """Apply generated SQL to PostgreSQL."""
    if not HAS_PSYCOPG2:
        print("Error: psycopg2 not installed. Cannot apply to database.")
        return False

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Execute SQL statements
        cursor.execute(sql)
        conn.commit()

        print(f"Successfully applied SQL to database at {DB_CONFIG['host']}")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"Database error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Parse AI training specs for GuardQuote ML")
    parser.add_argument("--input", "-i", help="Input file path")
    parser.add_argument("--stdin", action="store_true", help="Read from stdin")
    parser.add_argument("--apply", action="store_true", help="Apply SQL to database")
    parser.add_argument("--output-dir", "-o", default=".", help="Output directory")
    args = parser.parse_args()

    # Read input
    if args.stdin:
        content = sys.stdin.read()
        source = "stdin"
    elif args.input:
        with open(args.input, 'r') as f:
            content = f.read()
        source = Path(args.input).name
    else:
        print("Error: Must specify --input or --stdin")
        sys.exit(1)

    # Detect format and parse
    fmt = detect_format(content)
    print(f"Detected format: {fmt}")

    if fmt == "sql":
        data = parse_sql_inserts(content)
    elif fmt == "markdown_table":
        data = parse_markdown_table(content)
    elif fmt == "csv":
        # For CSV, just store the spec for later use
        data = {"training_data_spec": content}
    else:
        data = parse_prose(content)

    # Generate outputs
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate SQL
    sql = generate_sql(data)
    sql_path = output_dir / "seed_from_spec.sql"
    with open(sql_path, 'w') as f:
        f.write(sql)
    print(f"Generated SQL: {sql_path}")

    # Generate config
    config = generate_config(data, source)
    config_path = output_dir / "training_config.json"
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2, default=str)
    print(f"Generated config: {config_path}")

    # Apply to database if requested
    if args.apply:
        apply_to_database(sql)

    # Print summary
    print(f"\n=== Ingestion Summary ===")
    print(f"Source: {source}")
    print(f"Format: {fmt}")
    print(f"Event types: {len(data.get('event_types', []))}")
    print(f"Locations: {len(data.get('locations', []))}")

    if not args.apply:
        print(f"\nTo apply to database, run with --apply flag")


if __name__ == "__main__":
    main()
