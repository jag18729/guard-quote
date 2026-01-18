# GuardQuote Database Skill

Use this skill when working with the database, running queries, or managing schema.

## Connection Info

| Property | Value |
|----------|-------|
| Host | 100.66.167.62 (Pi1) |
| Port | 5432 (direct) or 6432 (PgBouncer) |
| Database | guardquote |
| User | guardquote |
| Password | WPU8bj3nbwFyZFEtHZQz |

**Connection String (PgBouncer - recommended):**
```
postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@100.66.167.62:6432/guardquote
```

## Schema

### users
Admin and client accounts.
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',  -- 'admin', 'user'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### clients
Business clients requesting quotes.
```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### quotes
Security service quotes.
```sql
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  event_type VARCHAR(100),
  event_date DATE,
  location TEXT,
  guest_count INTEGER,
  duration_hours INTEGER,
  base_price DECIMAL(10,2),
  risk_multiplier DECIMAL(4,2),
  final_price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### event_types
Event categories with 2026 pricing benchmarks.
```sql
CREATE TABLE event_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_rate DECIMAL(10,2) NOT NULL,
  risk_multiplier DECIMAL(4,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2026 Event Types:**
| Code | Name | Base Rate | Risk Multiplier |
|------|------|-----------|-----------------|
| tech_summit | Tech Summit | $55/hr | 1.10x |
| music_festival | Music Festival | $65/hr | 1.80x |
| vip_protection | VIP Protection | $110/hr | 1.00x |
| gov_rally | Government Rally | $58/hr | 2.00x |
| industrial | Industrial Site | $45/hr | 1.50x |
| retail_lp | Retail Loss Prevention | $32/hr | 1.40x |
| social_wedding | Social Wedding | $40/hr | 0.90x |

### locations
Service areas with risk zones.
```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  zip_code VARCHAR(10) UNIQUE NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  risk_zone VARCHAR(20) DEFAULT 'medium',
  rate_modifier DECIMAL(4,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Risk Zone Modifiers:**
| City | ZIP Prefix | Risk Zone | Modifier |
|------|------------|-----------|----------|
| San Francisco | 941xx | high | 1.35x |
| New York | 100xx | high | 1.40x |
| Austin | 787xx | medium | 1.15x |
| Miami | 331xx | medium | 1.20x |
| Chicago | 606xx | high | 1.30x |

## ML Tables

### ml_training_data_2026
Training data for ML models (1100 records).
```sql
CREATE TABLE ml_training_data_2026 (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  risk_zone VARCHAR(20),
  num_guards INTEGER NOT NULL,
  hours_per_guard DECIMAL(5,2) NOT NULL,
  crowd_size INTEGER,
  tier VARCHAR(20) DEFAULT 'standard',  -- standard, armed, executive
  is_weekend BOOLEAN DEFAULT FALSE,
  is_holiday BOOLEAN DEFAULT FALSE,
  is_night BOOLEAN DEFAULT FALSE,
  has_vehicle BOOLEAN DEFAULT FALSE,
  price DECIMAL(12,2) NOT NULL,
  accepted BOOLEAN DEFAULT TRUE,
  satisfaction INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Current Stats:**
- Records: 1,100
- Price range: $253.55 - $517,538.10
- Acceptance rate: 74%
- Tier distribution: Standard 541, Armed 404, Executive 155

### ai_workflow_logs
Audit trail for AI-assisted workflows.
```sql
CREATE TABLE ai_workflow_logs (
  id SERIAL PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  model_version VARCHAR(50),
  confidence_score DECIMAL(5,4),
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Common Queries

### Connect via psql
```bash
# From local machine
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@100.66.167.62:5432/guardquote

# From Pi1
ssh pi1 "sudo -u postgres psql guardquote"
```

### List all tables
```sql
\dt
```

### View table schema
```sql
\d users
\d quotes
```

### Get all users
```sql
SELECT id, email, first_name, last_name, role, is_active, created_at FROM users;
```

### Get recent quotes
```sql
SELECT q.*, c.name as client_name
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
ORDER BY q.created_at DESC
LIMIT 20;
```

### Dashboard stats
```sql
SELECT
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  SUM(CASE WHEN status = 'approved' THEN final_price ELSE 0 END) as revenue
FROM quotes;
```

### ML training data summary
```sql
SELECT
  event_type,
  COUNT(*) as records,
  ROUND(AVG(price)::numeric, 2) as avg_price,
  ROUND(AVG(num_guards)::numeric, 1) as avg_guards,
  ROUND(SUM(accepted::int)::float / COUNT(*) * 100, 1) as accept_rate
FROM ml_training_data_2026
GROUP BY event_type
ORDER BY records DESC;
```

### ML data by tier
```sql
SELECT
  tier,
  COUNT(*) as count,
  ROUND(AVG(price)::numeric, 2) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM ml_training_data_2026
GROUP BY tier;
```

### Event types with pricing
```sql
SELECT code, name, base_rate, risk_multiplier
FROM event_types
ORDER BY base_rate DESC;
```

### Locations by risk zone
```sql
SELECT zip_code, city, state, risk_zone, rate_modifier
FROM locations
WHERE risk_zone = 'high'
ORDER BY rate_modifier DESC;
```

### Create admin user
```sql
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES ('admin@guardquote.com', '<argon2_hash>', 'Admin', 'User', 'admin', true);
```

## Drizzle ORM

Schema file: `backend/src/db/schema.ts`

### Run migrations
```bash
cd backend
bunx drizzle-kit push
```

### Generate migration
```bash
cd backend
bunx drizzle-kit generate
```

### View pending changes
```bash
cd backend
bunx drizzle-kit check
```

## Troubleshooting

### Connection timeout
1. Check Pi1 is reachable: `ping 100.66.167.62`
2. Check PostgreSQL running: `ssh pi1 "systemctl status postgresql"`
3. Check UFW allows your IP: `ssh pi1 "sudo ufw status"`
4. Check pg_hba.conf: `ssh pi1 "sudo cat /etc/postgresql/15/main/pg_hba.conf"`

### Add network to pg_hba.conf
```bash
ssh pi1 "echo 'host guardquote guardquote 192.168.1.0/24 md5' | sudo tee -a /etc/postgresql/15/main/pg_hba.conf"
ssh pi1 "sudo systemctl reload postgresql"
```

### Reset user password
```sql
-- Must generate hash via Bun.password.hash() first
UPDATE users SET password_hash = '<new_hash>' WHERE email = 'user@example.com';
```

---

*Last updated: January 15, 2026*
