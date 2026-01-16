# Generate Data Skill

Use this skill to generate ML training data based on configuration.

## Trigger Phrases
- "/generate-data"
- "generate training data"
- "create training records"
- "build dataset"

## Prerequisites
- Training config exists at `/ml-engine/data/training_config.json`
- OR use default 2026 parameters

## Quick Command
```bash
cd /Users/rjgar/Projects/guard-quote/ml-engine
source .venv/bin/activate
python scripts/generate_training_data_2026.py
```

## Parameters

### Record Count
Default: 1100
Override: Set `RECORD_COUNT` environment variable
```bash
RECORD_COUNT=5000 python scripts/generate_training_data_2026.py
```

### Use Config File
```bash
python scripts/generate_training_data_2026.py --config data/training_config.json
```

## Output Files

| File | Description |
|------|-------------|
| `data/processed/training_data_2026.csv` | CSV export of all records |
| Database: `ml_training_data_2026` | PostgreSQL table |

## Data Distribution Targets

### Tier Distribution
| Tier | Name | Target % | Price Multiplier |
|------|------|----------|------------------|
| 1 | Standard | 55% | 1.0x |
| 2 | Armed | 37% | 1.35x |
| 3 | Executive | 8% | 2.0x |

### Event Type Distribution
Weighted by real-world frequency:
- Corporate events: High frequency, lower risk
- Concerts/Festivals: Medium frequency, high risk
- VIP Protection: Low frequency, high value
- Government: Low frequency, extreme risk

### Temporal Distribution
- Weekends: ~30% of events
- Night shifts (22:00-06:00): ~15%
- Holidays: ~5%
- Peak months (May-Sep): Higher weight

## Pricing Formula

```python
# Base calculation
hourly_rate = base_rate × location_modifier × risk_multiplier × tier_multiplier

# Subtotal
subtotal = hourly_rate × hours × num_guards

# Premiums
if armed:
    subtotal += 18.00 × hours × num_guards
if has_vehicle:
    subtotal += 65.00 × num_guards

# Time-based adjustments
if is_holiday:
    subtotal *= 1.15
if is_weekend:
    subtotal *= 1.08

price = round(subtotal, 2)
```

## Acceptance Modeling

```python
# Base acceptance probability by tier
if tier == 3:  # Executive - price inelastic
    accept_prob = 0.85
elif tier == 2:  # Armed
    accept_prob = 0.75
else:  # Standard - price sensitive
    accept_prob = 0.70

# Adjustments
if price > 100000:
    accept_prob -= 0.20
elif price > 50000:
    accept_prob -= 0.10
elif price < 1000:
    accept_prob += 0.10

if ai_agent:
    accept_prob += 0.05

accepted = random() < accept_prob
```

## Verification

After generation, verify with:
```bash
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote -c "
SELECT
  COUNT(*) as total_records,
  ROUND(AVG(price)::numeric, 2) as avg_price,
  ROUND(SUM(accepted)::float / COUNT(*) * 100, 1) as accept_rate
FROM ml_training_data_2026;
"
```

## Regeneration

To regenerate with new parameters:
```bash
# Clear existing data
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote -c "
TRUNCATE TABLE ml_training_data_2026;
"

# Regenerate
python scripts/generate_training_data_2026.py
```

---

*Last updated: January 15, 2026*
