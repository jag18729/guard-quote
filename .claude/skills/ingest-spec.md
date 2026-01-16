# Ingest Spec Skill

Use this skill when user provides training data specifications from Gemini, ChatGPT, or other AI sources.

## Trigger Phrases
- "use this Gemini output"
- "ingest this training spec"
- "add these event types"
- "update pricing from..."
- User pastes SQL INSERT statements
- User pastes markdown tables with pricing data

## Input Detection

### Format 1: SQL INSERT Statements
```sql
INSERT INTO event_types (name, base_rate, risk_multiplier, description) VALUES
('Tech Summit', 55.00, 1.1, 'High-value IP focus');
```

**Action:** Extract values, map columns to schema, generate UPSERT SQL.

### Format 2: Markdown Tables
```
| name | base_rate | risk_multiplier |
|------|-----------|-----------------|
| Tech Summit | 55.00 | 1.1 |
```

**Action:** Parse table, generate INSERT statements.

### Format 3: CSV Specification
```csv
event_type,location_risk,duration,guards,tier,price,accepted
tech_summit,1.45,8,4,1,2400.00,1
```

**Action:** Use as template for data generation script.

### Format 4: Prose/Mixed Format
```
Based on 2026 pricing benchmarks:
- Unarmed guards: $25-$45/hr
- Tech Summit events should be $55/hr with 1.1x risk multiplier
```

**Action:** Extract structured data from natural language.

## Column Mapping Reference

### Event Types
| Input Variations | Maps To |
|-----------------|---------|
| base_hourly_rate, hourly_rate, rate | base_rate |
| risk_weight, risk_factor, multiplier | risk_multiplier |
| event_name, type_name | name |
| event_code, type_code, slug | code |

### Locations
| Input Variations | Maps To |
|-----------------|---------|
| base_multiplier, location_multiplier | rate_modifier |
| risk_level, zone | risk_zone |
| zip, zipcode, postal_code | zip_code |

### Training Data
| Input Variations | Maps To |
|-----------------|---------|
| hours, duration_hours | duration |
| num_guards, guard_count | guards |
| final_price, total_price, quote_price | price |
| was_accepted, is_accepted | accepted |
| customer_satisfaction, rating | satisfaction |

## Processing Steps

### Step 1: Parse Input
```python
# Detect format
if "INSERT INTO" in input:
    format = "sql"
elif "|" in input and "---" in input:
    format = "markdown_table"
elif "," in input and "\n" in input:
    format = "csv"
else:
    format = "prose"
```

### Step 2: Extract Data
For SQL:
```python
# Extract table name and values
# Handle column name variations
# Map to actual schema columns
```

For Markdown:
```python
# Split by | delimiter
# First row = headers
# Map headers to schema columns
# Parse remaining rows as data
```

### Step 3: Generate Config
Output to `/ml-engine/data/training_config.json`:
```json
{
  "source": "gemini",
  "timestamp": "2026-01-15T17:30:00Z",
  "event_types": [
    {
      "code": "tech_summit",
      "name": "Tech Summit",
      "base_rate": 55.00,
      "risk_multiplier": 1.10,
      "description": "High-value IP focus"
    }
  ],
  "locations": [
    {
      "zip_code": "94102",
      "city": "San Francisco",
      "state": "CA",
      "risk_zone": "high",
      "rate_modifier": 1.45
    }
  ],
  "training_params": {
    "record_count": 1100,
    "tier_distribution": [0.55, 0.37, 0.08],
    "ai_agent_rate": 0.88,
    "target_acceptance": 0.74
  },
  "pricing_context": {
    "year": 2026,
    "unarmed_range": [25, 45],
    "armed_premium": 18.00,
    "vehicle_premium": 65.00
  }
}
```

### Step 4: Generate SQL
Output to `/ml-engine/data/seed_from_spec.sql`:
```sql
-- Auto-generated from AI spec
-- Source: gemini
-- Generated: 2026-01-15

-- Event Types (UPSERT)
INSERT INTO event_types (code, name, description, base_rate, risk_multiplier)
VALUES ('tech_summit', 'Tech Summit', 'High-value IP focus', 55.00, 1.10)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_rate = EXCLUDED.base_rate,
    risk_multiplier = EXCLUDED.risk_multiplier;

-- Locations (UPSERT)
INSERT INTO locations (zip_code, city, state, risk_zone, rate_modifier)
VALUES ('94102', 'San Francisco', 'CA', 'high', 1.45)
ON CONFLICT (zip_code) DO UPDATE SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    risk_zone = EXCLUDED.risk_zone,
    rate_modifier = EXCLUDED.rate_modifier;
```

## Validation Rules

### Event Types
- `code`: Required, lowercase, underscores only, max 50 chars
- `name`: Required, max 100 chars
- `base_rate`: Required, positive decimal, typically $25-$150
- `risk_multiplier`: Required, 0.5-3.0 range

### Locations
- `zip_code`: Required, 5-10 chars
- `city`: Required, max 100 chars
- `state`: Required, 2-char code preferred
- `risk_zone`: Must be low/medium/high/critical
- `rate_modifier`: Required, 0.8-2.0 range

### Training Data Spec
- `tier`: Must be 1, 2, or 3
- `cloud`: Must be 1, 2, or 3
- `accepted`: Must be 0 or 1
- `satisfaction`: Must be 1-5
- `price`: Must be positive

## Error Handling

### Missing Required Columns
```
Warning: 'code' column missing from event_types
Action: Auto-generating from 'name' (slugify)
Example: "Tech Summit" → "tech_summit"
```

### Invalid Values
```
Warning: risk_multiplier 5.0 out of range (0.5-3.0)
Action: Clamping to max value 3.0
```

### Schema Mismatch
```
Warning: Column 'venue_type' not in schema
Action: Ignoring column (not needed for current schema)
```

## Output Summary

After processing, report:
```
=== Ingestion Summary ===
Source: Gemini output
Format: SQL INSERT statements

Event Types:
  - Added: 7 new types
  - Updated: 3 existing types
  - Skipped: 0 (validation errors)

Locations:
  - Added: 19 new locations
  - Updated: 5 existing locations
  - Skipped: 0 (validation errors)

Training Config:
  - Record count: 1100
  - Tier distribution: 55/37/8
  - Target acceptance: 74%

Files generated:
  - /ml-engine/data/training_config.json
  - /ml-engine/data/seed_from_spec.sql

Next steps:
  1. Review generated SQL
  2. Run: /generate-data
  3. Run: /load-training
```

---

*Last updated: January 15, 2026*
