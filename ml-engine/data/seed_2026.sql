-- GuardQuote 2026 Seed Data
-- Based on 2026 pricing benchmarks: unarmed guards $25-$45/hr, specialized event security $35-$65/hr
-- Matches existing PostgreSQL schema on Pi1

-- =============================================================================
-- EVENT TYPES (2026 Premiums for Physical AI integration)
-- Using UPSERT to update existing records safely
-- =============================================================================

INSERT INTO event_types (code, name, description, base_rate, risk_multiplier) VALUES
    ('tech_summit', 'Tech Summit', 'High-value intellectual property and hardware focus', 55.00, 1.10),
    ('music_festival', 'Music Festival', 'Crowd density and high substance-risk management', 65.00, 1.80),
    ('retail_lp', 'Retail Loss Prevention', 'AI-integrated theft prevention in high-shrink urban areas', 32.00, 1.40),
    ('vip_protection', 'VIP Protection', 'Close protection for executives and high-net-worth individuals', 110.00, 1.00),
    ('industrial', 'Industrial Site', 'Critical infrastructure; drone-threat monitoring included', 45.00, 1.50),
    ('social_wedding', 'Social Wedding', 'Low-risk concierge and ushering services', 40.00, 0.90),
    ('gov_rally', 'Government Rally', 'Extreme risk; crowd control and perimeter hardening', 58.00, 2.00)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_rate = EXCLUDED.base_rate,
    risk_multiplier = EXCLUDED.risk_multiplier;

-- Update existing legacy types to 2026 pricing
UPDATE event_types SET base_rate = 42.00, risk_multiplier = 1.25 WHERE code = 'corporate';
UPDATE event_types SET base_rate = 55.00, risk_multiplier = 1.75 WHERE code = 'concert';
UPDATE event_types SET base_rate = 48.00, risk_multiplier = 1.65 WHERE code = 'sports';
UPDATE event_types SET base_rate = 35.00, risk_multiplier = 1.30 WHERE code = 'private';
UPDATE event_types SET base_rate = 38.00, risk_multiplier = 1.45 WHERE code = 'construction';
UPDATE event_types SET base_rate = 32.00, risk_multiplier = 1.40 WHERE code = 'retail';
UPDATE event_types SET base_rate = 28.00, risk_multiplier = 1.25 WHERE code = 'residential';

-- =============================================================================
-- LOCATIONS (2026 Regional Modifiers)
-- Based on 2026 salary trends: CA and NY remain high-cost leaders (~$21-$23/hr mean base wage)
-- =============================================================================

INSERT INTO locations (zip_code, city, state, risk_zone, rate_modifier) VALUES
    -- California (High-cost leader)
    ('94102', 'San Francisco', 'CA', 'high', 1.45),
    ('92101', 'San Diego', 'CA', 'medium', 1.25),
    ('95814', 'Sacramento', 'CA', 'medium', 1.20),
    -- New York (High-cost leader)
    ('10019', 'Manhattan', 'NY', 'critical', 1.50),
    ('11201', 'Brooklyn', 'NY', 'high', 1.35),
    -- Texas (Growth market)
    ('78701', 'Austin', 'TX', 'medium', 1.15),
    ('77001', 'Houston', 'TX', 'high', 1.20),
    ('75201', 'Dallas', 'TX', 'medium', 1.18),
    -- Florida
    ('33602', 'Tampa', 'FL', 'medium', 1.15),
    ('32801', 'Orlando', 'FL', 'medium', 1.18),
    -- Illinois
    ('60611', 'Chicago Loop', 'IL', 'critical', 1.40),
    -- Other major markets
    ('98101', 'Seattle', 'WA', 'medium', 1.30),
    ('02101', 'Boston', 'MA', 'high', 1.35),
    ('30301', 'Atlanta', 'GA', 'medium', 1.20),
    ('80201', 'Denver', 'CO', 'medium', 1.15),
    ('85001', 'Phoenix', 'AZ', 'low', 1.10),
    ('89101', 'Las Vegas', 'NV', 'high', 1.35),
    ('20001', 'Washington DC', 'DC', 'critical', 1.45),
    ('97201', 'Portland', 'OR', 'medium', 1.22)
ON CONFLICT (zip_code) DO UPDATE SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    risk_zone = EXCLUDED.risk_zone,
    rate_modifier = EXCLUDED.rate_modifier;

-- Update existing locations to 2026 pricing
UPDATE locations SET rate_modifier = 1.35, risk_zone = 'high' WHERE zip_code = '90001';  -- Los Angeles
UPDATE locations SET rate_modifier = 1.40, risk_zone = 'medium' WHERE zip_code = '90210';  -- Beverly Hills
UPDATE locations SET rate_modifier = 1.40, risk_zone = 'critical' WHERE zip_code = '10001';  -- New York
UPDATE locations SET rate_modifier = 1.30, risk_zone = 'high' WHERE zip_code = '33101';  -- Miami
UPDATE locations SET rate_modifier = 1.35, risk_zone = 'high' WHERE zip_code = '60601';  -- Chicago

-- =============================================================================
-- ML TRAINING DATA 2026 TABLE
-- For storing the 1000+ record training dataset
-- =============================================================================

DROP TABLE IF EXISTS ml_training_data_2026 CASCADE;

CREATE TABLE ml_training_data_2026 (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    location_risk DECIMAL(4, 2) NOT NULL,
    state VARCHAR(2) NOT NULL,
    risk_zone VARCHAR(20),
    duration DECIMAL(8, 2) NOT NULL,
    guards INT NOT NULL,
    total_guard_hours DECIMAL(10, 2) NOT NULL,
    crowd_size INT DEFAULT 0,
    tier INT NOT NULL,                           -- 1=Standard, 2=Armed, 3=Executive
    cloud INT NOT NULL,                          -- 1=AWS, 2=Azure, 3=GCP
    ai_agent INT DEFAULT 1,                      -- 1=Agentic AI, 0=Static logic
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
);

CREATE INDEX idx_ml_2026_event ON ml_training_data_2026(event_type);
CREATE INDEX idx_ml_2026_state ON ml_training_data_2026(state);
CREATE INDEX idx_ml_2026_tier ON ml_training_data_2026(tier);
CREATE INDEX idx_ml_2026_accepted ON ml_training_data_2026(accepted);

-- =============================================================================
-- AI WORKFLOW AUDIT LOG TABLE
-- Tracks Agentic AI reasoning for model refinement (88% of early adopters see positive ROI)
-- =============================================================================

DROP TABLE IF EXISTS ai_workflow_logs CASCADE;

CREATE TABLE ai_workflow_logs (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL,
    ai_orchestrator VARCHAR(50) NOT NULL,         -- Azure OpenAI, GCP Vertex, AWS Bedrock
    edge_security VARCHAR(50),                     -- Cloudflare WAF, Google Model Armor, etc.
    reasoning_token_count INT DEFAULT 0,
    risk_score_adjustment DECIMAL(4, 2) DEFAULT 0.00,
    adjustment_reason TEXT,
    model_version VARCHAR(20),
    inference_latency_ms INT,
    confidence_threshold DECIMAL(4, 3) DEFAULT 0.850,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_workflow_quote ON ai_workflow_logs(quote_id);
CREATE INDEX idx_ai_workflow_orchestrator ON ai_workflow_logs(ai_orchestrator);

-- Sample AI workflow logs
INSERT INTO ai_workflow_logs (quote_id, ai_orchestrator, edge_security, reasoning_token_count, risk_score_adjustment, adjustment_reason, model_version, inference_latency_ms) VALUES
    ('Q-1001', 'Azure OpenAI', 'Cloudflare WAF', 450, 0.05, 'Crime spike detected in area', 'gpt-4-turbo-2026', 145),
    ('Q-1002', 'GCP Vertex', 'Google Model Armor', 320, -0.10, 'Volume discount applied for repeat client', 'gemini-pro-2026', 98),
    ('Q-1003', 'AWS Bedrock', 'Cloudflare Workers', 510, 0.20, 'Holiday premium and high crowd density', 'claude-3-2026', 167),
    ('Q-1004', 'Azure OpenAI', 'Cloudflare WAF', 380, 0.00, 'Standard risk assessment', 'gpt-4-turbo-2026', 132),
    ('Q-1005', 'GCP Vertex', 'Google Model Armor', 290, -0.05, 'Off-peak timing discount', 'gemini-pro-2026', 87);

-- Show summary
SELECT 'event_types' as table_name, COUNT(*) as row_count FROM event_types
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'ai_workflow_logs', COUNT(*) FROM ai_workflow_logs;
