# ML Pipeline Skill

Use this skill to orchestrate ML training data operations for GuardQuote.

## Quick Commands

### Full Pipeline (most common)
When user provides Gemini/AI output with training specs:
```bash
# 1. Parse the spec and generate SQL + Python config
# 2. Generate training data (default 1100 records)
# 3. Load into PostgreSQL on Pi1
# 4. Verify and report stats
```

### Individual Steps
- `/ingest-spec` - Parse AI output into structured config
- `/generate-data` - Create training records from config
- `/load-training` - Push data to PostgreSQL
- `/train-model` - Train ML models on loaded data

## Database Connection

PostgreSQL on Pi1 via Tailscale:
```
Host: 100.66.167.62 (Tailscale) or 192.168.2.70 (local)
Port: 5432
Database: guardquote
User: guardquote
Password: WPU8bj3nbwFyZFEtHZQz
```

Test connection:
```bash
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@100.66.167.62:5432/guardquote -c "SELECT 1"
```

## ML Engine API Schema

### QuoteRequest (POST /api/v1/quote)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| event_type | enum | Yes | corporate, concert, sports, private, construction, retail, residential |
| location_zip | string | Yes | 5-10 chars |
| num_guards | int | Yes | 1-100 |
| hours | float | Yes | 1-24 |
| date | datetime | Yes | ISO 8601 format |
| is_armed | bool | No | Default: false |
| requires_vehicle | bool | No | Default: false |
| crowd_size | int | No | Default: 0 |

### QuoteResponse
| Field | Type | Notes |
|-------|------|-------|
| base_price | float | Calculated base |
| risk_multiplier | float | Applied multiplier |
| final_price | float | base_price × risk_multiplier |
| risk_level | enum | low, medium, high, critical |
| confidence_score | float | 0-1 |
| breakdown | object | Model details, risk factors |

## Current Schema Reference

### event_types
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| code | VARCHAR(50) | UNIQUE, e.g., "tech_summit" |
| name | VARCHAR(100) | Display name |
| description | TEXT | Optional |
| base_rate | DECIMAL(10,2) | Hourly rate in USD |
| risk_multiplier | DECIMAL(4,2) | e.g., 1.80 for high-risk |
| is_active | BOOLEAN | Default true |

### locations
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| zip_code | VARCHAR(10) | UNIQUE |
| city | VARCHAR(100) | |
| state | VARCHAR(50) | 2-letter code preferred |
| risk_zone | VARCHAR(50) | low/medium/high/critical |
| rate_modifier | DECIMAL(4,2) | e.g., 1.45 for SF |

### ml_training_data_2026
| Column | Type | Notes |
|--------|------|-------|
| event_type | VARCHAR(50) | Event code |
| location_risk | DECIMAL(4,2) | Location multiplier |
| state | VARCHAR(2) | State code |
| risk_zone | VARCHAR(20) | Risk category |
| duration | DECIMAL(8,2) | Hours |
| guards | INT | Number of guards |
| total_guard_hours | DECIMAL(10,2) | guards × duration |
| crowd_size | INT | Expected attendance |
| tier | INT | 1=Standard, 2=Armed, 3=Executive |
| cloud | INT | 1=AWS, 2=Azure, 3=GCP |
| ai_agent | INT | 1=Agentic AI, 0=Static |
| is_weekend | INT | 0/1 |
| is_holiday | INT | 0/1 |
| is_night_shift | INT | 0/1 |
| is_armed | INT | 0/1 |
| has_vehicle | INT | 0/1 |
| day_of_week | INT | 0-6 |
| hour_of_day | INT | 0-23 |
| month | INT | 1-12 |
| risk_score | DECIMAL(4,3) | Calculated 0-1 |
| price | DECIMAL(12,2) | Final quote price |
| accepted | INT | 0/1 |
| satisfaction | INT | 1-5 |

## Parsing AI/Gemini Output

When user provides training spec from Gemini or other AI:

### 1. Identify Input Format
- **SQL INSERT statements** → Extract directly
- **Markdown tables** → Parse rows into records
- **CSV spec** → Use as column template
- **Prose description** → Extract key-value pairs

### 2. Map to Schema
Common mappings needed:
| AI Output | Actual Column |
|-----------|---------------|
| base_hourly_rate | base_rate |
| risk_weight | risk_multiplier |
| base_multiplier | rate_modifier |
| venue_type | (not in schema, ignore) |
| county, region | (not in schema, ignore) |

### 3. Generate Adapter SQL
Use UPSERT pattern:
```sql
INSERT INTO event_types (code, name, description, base_rate, risk_multiplier)
VALUES ('tech_summit', 'Tech Summit', '...', 55.00, 1.10)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    base_rate = EXCLUDED.base_rate,
    risk_multiplier = EXCLUDED.risk_multiplier;
```

## File Locations

| Purpose | Path |
|---------|------|
| Seed SQL | `/ml-engine/data/seed_2026.sql` |
| Training CSV | `/ml-engine/data/processed/training_data_2026.csv` |
| Generator Script | `/ml-engine/scripts/generate_training_data_2026.py` |
| Config Template | `/ml-engine/data/training_config.json` |
| ML Engine .env | `/ml-engine/.env` |

## Workflow Example

User provides:
```
INSERT INTO event_types (name, base_rate, risk_multiplier) VALUES
('New Event', 75.00, 1.5);
```

Claude should:
1. Detect it's SQL with event_types data
2. Check if columns match schema (they do)
3. Add `code` column: `'new_event'` (slugified name)
4. Apply to PostgreSQL with UPSERT
5. Regenerate training data if requested
6. Report: "Added 1 event type: new_event ($75/hr, 1.5x risk)"

## Training Data Generation

Default parameters:
- **Count:** 1100 records
- **Date range:** Past 2 years
- **Tier distribution:** 55% Standard, 37% Armed, 8% Executive
- **AI agent rate:** 88% (matches 2026 adoption stats)
- **Acceptance rate target:** ~74%

Pricing factors:
- Base rate × location modifier × risk multiplier × tier multiplier
- Armed premium: $18/hr per guard
- Vehicle premium: $65 per guard
- Weekend: +8%
- Holiday: +15%
- Night shift: Adds to risk score

## Verification Queries

After loading data:
```sql
-- Record counts
SELECT
  (SELECT COUNT(*) FROM ml_training_data_2026) as training,
  (SELECT COUNT(*) FROM event_types) as events,
  (SELECT COUNT(*) FROM locations) as locations;

-- Price distribution
SELECT
  MIN(price), AVG(price)::numeric(10,2), MAX(price),
  (SUM(accepted)::float / COUNT(*) * 100)::numeric(4,1) as accept_pct
FROM ml_training_data_2026;

-- By event type
SELECT event_type, COUNT(*), AVG(price)::numeric(10,2)
FROM ml_training_data_2026
GROUP BY event_type ORDER BY count DESC;
```

---

*Last updated: January 15, 2026*
