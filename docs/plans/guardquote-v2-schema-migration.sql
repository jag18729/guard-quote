-- ============================================================================
-- GuardQuote v2.0 Schema Migration
-- OAuth SSO + SIEM Auth Events + ML Predictions + Pricing Rules + Enrichment
-- ============================================================================
-- Run AFTER existing schema.sql. Non-destructive — ALTER/ADD only.
-- Rollback at bottom.

BEGIN;

-- ============================================================================
-- 1. OAUTH PROVIDERS — Link users to GitHub/Google identities
-- ============================================================================
-- Captures ALL relevant user info from each provider

CREATE TABLE oauth_providers (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Provider identity
    provider        VARCHAR(20) NOT NULL CHECK (provider IN ('github', 'google')),
    provider_user_id VARCHAR(255) NOT NULL,          -- GitHub: numeric id, Google: sub
    
    -- Profile data (captured at login, updated each sign-in)
    email           VARCHAR(255),                     -- Primary verified email
    name            VARCHAR(255),                     -- Display name
    avatar_url      VARCHAR(500),                     -- Profile picture URL
    
    -- GitHub-specific fields
    github_login    VARCHAR(100),                     -- GitHub username (e.g., jag18729)
    github_company  VARCHAR(255),                     -- Company field
    github_location VARCHAR(255),                     -- Location field
    github_bio      TEXT,                             -- Bio
    github_public_repos INT,                          -- Public repo count
    github_followers INT,                             -- Follower count
    github_following INT,                             -- Following count
    github_html_url VARCHAR(500),                     -- Profile URL
    
    -- Google-specific fields
    google_locale   VARCHAR(10),                      -- e.g., 'en'
    google_hd       VARCHAR(255),                     -- Hosted domain (Google Workspace)
    google_verified_email BOOLEAN,                    -- Email verified by Google
    google_given_name VARCHAR(100),                   -- First name from Google
    google_family_name VARCHAR(100),                  -- Last name from Google
    google_picture  VARCHAR(500),                     -- Google profile picture (higher res)
    
    -- Metadata
    raw_profile     JSONB,                            -- Full raw profile JSON (future-proofing)
    scopes_granted  TEXT[],                           -- OAuth scopes the user granted
    linked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_count     INT DEFAULT 1,
    
    -- Constraints
    UNIQUE(provider, provider_user_id),               -- One link per provider identity
    UNIQUE(user_id, provider)                         -- One provider type per user
);

CREATE INDEX idx_oauth_provider_lookup ON oauth_providers(provider, provider_user_id);
CREATE INDEX idx_oauth_user ON oauth_providers(user_id);
CREATE INDEX idx_oauth_email ON oauth_providers(email);

-- ============================================================================
-- 2. USER EMAILS — Track all verified emails across providers
-- ============================================================================
-- GitHub users can have multiple emails. Google gives one.
-- This lets us match/link accounts by ANY verified email.

CREATE TABLE user_emails (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    source          VARCHAR(20) NOT NULL CHECK (source IN ('local', 'github', 'google')),
    is_primary      BOOLEAN DEFAULT false,
    is_verified     BOOLEAN DEFAULT false,
    verified_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(email, source)                             -- Same email can exist from different sources
);

CREATE INDEX idx_user_emails_email ON user_emails(email);
CREATE INDEX idx_user_emails_user ON user_emails(user_id);

-- ============================================================================
-- 3. AUTH SESSIONS — Track active sessions for security
-- ============================================================================

CREATE TABLE auth_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identity
    auth_method     VARCHAR(20) NOT NULL CHECK (auth_method IN ('password', 'github', 'google')),
    provider_id     INT REFERENCES oauth_providers(id),
    
    -- Session metadata
    ip_address      INET,
    user_agent      TEXT,
    country         VARCHAR(2),                       -- GeoIP (if available)
    city            VARCHAR(100),
    
    -- Token management
    token_hash      VARCHAR(255) NOT NULL,            -- SHA-256 of session token (never store raw)
    refresh_token_hash VARCHAR(255),
    
    -- Lifecycle
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    revoked_at      TIMESTAMP,                        -- NULL = active, set = revoked
    revoke_reason   VARCHAR(100),                     -- 'logout', 'password_change', 'admin_revoke', 'suspicious'
    
    is_active       BOOLEAN GENERATED ALWAYS AS (revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP) STORED
);

CREATE INDEX idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth_sessions(token_hash);
CREATE INDEX idx_sessions_active ON auth_sessions(user_id) WHERE is_active = true;

-- ============================================================================
-- 4. SIEM AUTH EVENTS — Security event log for Wazuh/Loki/SIEM ingestion
-- ============================================================================
-- This table is the SIEM endpoint. Vector can tail it or the app can
-- emit structured JSON logs that Vector ships to Loki with security labels.
-- Also queryable directly for admin security dashboards.

CREATE TABLE siem_auth_events (
    id              BIGSERIAL PRIMARY KEY,            -- BIGSERIAL for high-volume events
    
    -- Event classification (CEF-inspired)
    event_type      VARCHAR(50) NOT NULL,             -- See CHECK below
    severity        VARCHAR(10) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    outcome         VARCHAR(10) NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked', 'error')),
    
    -- Actor
    user_id         INT REFERENCES users(id),         -- NULL for failed attempts with unknown user
    email           VARCHAR(255),                     -- Email attempted (even if user doesn't exist)
    provider        VARCHAR(20),                      -- 'password', 'github', 'google'
    oauth_provider_user_id VARCHAR(255),              -- Provider-side user ID
    
    -- Session
    session_id      UUID REFERENCES auth_sessions(id),
    
    -- Network context
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    origin          VARCHAR(500),                     -- Referer/Origin header
    country         VARCHAR(2),
    city            VARCHAR(100),
    
    -- Event details
    detail          JSONB,                            -- Flexible event-specific data
    -- Examples:
    -- login_success:  {"method": "github", "scopes": ["read:user"], "mfa": false}
    -- login_failure:  {"reason": "invalid_password", "attempts_remaining": 4}
    -- rate_limited:   {"endpoint": "/api/auth/login", "window": "15m", "count": 10}
    -- session_revoked: {"reason": "admin_action", "revoked_by": 1}
    -- oauth_linked:   {"provider": "google", "provider_email": "user@gmail.com"}
    -- suspicious:     {"reason": "impossible_travel", "prev_country": "US", "new_country": "RU"}
    
    -- Timestamps
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Event type validation
    CONSTRAINT valid_event_type CHECK (event_type IN (
        -- Authentication
        'login_success',
        'login_failure',
        'logout',
        'token_refresh',
        'token_expired',
        
        -- OAuth
        'oauth_authorize_start',
        'oauth_callback_success',
        'oauth_callback_failure',
        'oauth_linked',
        'oauth_unlinked',
        'oauth_token_exchange',
        
        -- Account security
        'password_change',
        'password_reset_request',
        'password_reset_complete',
        'email_change',
        'role_change',
        'account_locked',
        'account_unlocked',
        'account_disabled',
        'account_created',
        
        -- Session management
        'session_created',
        'session_revoked',
        'session_expired',
        'all_sessions_revoked',
        
        -- Rate limiting & abuse
        'rate_limited',
        'brute_force_detected',
        'suspicious_activity',
        'impossible_travel',
        'blocked_ip',
        
        -- Admin actions
        'admin_user_create',
        'admin_user_update',
        'admin_user_delete',
        'admin_role_change',
        'admin_session_revoke',
        
        -- CSRF / validation
        'csrf_validation_failed',
        'invalid_state_parameter',
        'malformed_token'
    ))
);

-- Indexes for SIEM queries
CREATE INDEX idx_siem_created ON siem_auth_events(created_at DESC);
CREATE INDEX idx_siem_type ON siem_auth_events(event_type);
CREATE INDEX idx_siem_severity ON siem_auth_events(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_siem_user ON siem_auth_events(user_id);
CREATE INDEX idx_siem_ip ON siem_auth_events(ip_address);
CREATE INDEX idx_siem_outcome ON siem_auth_events(outcome) WHERE outcome IN ('failure', 'blocked');
CREATE INDEX idx_siem_type_outcome ON siem_auth_events(event_type, outcome, created_at DESC);

-- Partial index for active investigations (last 24h failures)
CREATE INDEX idx_siem_recent_failures ON siem_auth_events(ip_address, created_at DESC)
    WHERE outcome IN ('failure', 'blocked') AND created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours');

-- ============================================================================
-- 5. ALTER EXISTING USERS TABLE — Add OAuth support fields
-- ============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash_type VARCHAR(20) DEFAULT 'bcrypt'
        CHECK (password_hash_type IN ('bcrypt', 'argon2id')),
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS lockout_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS requires_password BOOLEAN DEFAULT true;
    -- requires_password = false for OAuth-only accounts (no local password)

-- ============================================================================
-- 6. ML PREDICTIONS — Track model predictions per quote
-- ============================================================================

CREATE TABLE ml_predictions (
    id              SERIAL PRIMARY KEY,
    quote_id        INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Model info
    model_version   VARCHAR(50) NOT NULL,             -- e.g., 'xgboost-v1.2'
    model_type      VARCHAR(50) NOT NULL,             -- 'xgboost', 'ensemble', 'rule_engine'
    
    -- Prediction
    predicted_price DECIMAL(12, 2) NOT NULL,
    confidence      DECIMAL(4, 3) NOT NULL,           -- 0.000 to 1.000
    risk_score      DECIMAL(4, 3),
    risk_level      VARCHAR(20),
    
    -- Source breakdown (how much each source contributed)
    source_weights  JSONB NOT NULL,
    -- Example: {"trained_model": 0.60, "external_apis": 0.25, "rule_engine": 0.15}
    
    -- Per-source details
    model_prediction  DECIMAL(12, 2),                 -- XGBoost output
    model_confidence  DECIMAL(4, 3),
    api_prediction    DECIMAL(12, 2),                 -- External API-informed estimate
    api_confidence    DECIMAL(4, 3),
    rule_prediction   DECIMAL(12, 2),                 -- Rule engine output
    rule_confidence   DECIMAL(4, 3),
    
    -- Enrichment data used
    enrichment_data JSONB,
    -- Example: {
    --   "weather": {"temp": 72, "condition": "clear", "source": "nws"},
    --   "demographics": {"median_income": 65000, "population": 120000, "source": "census"},
    --   "events": {"concurrent_count": 3, "nearest_major": "NFL game 2mi", "source": "predicthq"}
    -- }
    
    -- Feature importance (top factors that drove the prediction)
    feature_importance JSONB,
    -- Example: [{"feature": "event_type", "importance": 0.32}, {"feature": "crowd_size", "importance": 0.21}]
    
    -- Timing
    inference_ms    INT,                              -- How long prediction took
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_pred_quote ON ml_predictions(quote_id);
CREATE INDEX idx_ml_pred_model ON ml_predictions(model_version);

-- ============================================================================
-- 7. ML MODELS — Track trained model versions
-- ============================================================================

CREATE TABLE ml_models (
    id              SERIAL PRIMARY KEY,
    version         VARCHAR(50) NOT NULL UNIQUE,
    model_type      VARCHAR(50) NOT NULL,
    
    -- Training metrics
    accuracy        DECIMAL(5, 4),                    -- R² or accuracy score
    mae             DECIMAL(12, 2),                   -- Mean absolute error
    rmse            DECIMAL(12, 2),                   -- Root mean square error
    training_samples INT,
    test_samples    INT,
    feature_count   INT,
    
    -- Configuration
    hyperparameters JSONB,                            -- XGBoost params
    feature_names   TEXT[],                           -- Ordered list of features used
    
    -- Storage
    model_path      VARCHAR(500),                     -- Path to serialized model file
    model_size_bytes BIGINT,
    
    -- Lifecycle
    trained_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trained_by      VARCHAR(100),                     -- 'auto', 'manual', user email
    is_active       BOOLEAN DEFAULT false,            -- Only one active model at a time
    promoted_at     TIMESTAMP,                        -- When it became the active model
    retired_at      TIMESTAMP,
    
    notes           TEXT
);

CREATE INDEX idx_ml_models_active ON ml_models(is_active) WHERE is_active = true;

-- ============================================================================
-- 8. PRICING RULES — Typed columns, simple operators
-- ============================================================================

CREATE TABLE pricing_rules (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    
    -- Conditions (NULL = matches anything)
    event_type_code VARCHAR(50),                      -- Match specific event type
    location_state  VARCHAR(2),                       -- Match state
    risk_zone       VARCHAR(20),                      -- Match risk zone
    min_guards      INT,                              -- Minimum guard count to trigger
    max_guards      INT,                              -- Maximum guard count to trigger
    min_crowd_size  INT,
    max_crowd_size  INT,
    is_weekend      BOOLEAN,                          -- Weekend-only rule
    is_night_shift  BOOLEAN,                          -- Night shift rule
    
    -- Action
    rule_type       VARCHAR(30) NOT NULL CHECK (rule_type IN (
        'rate_multiplier',     -- Multiply base rate by value
        'flat_adjustment',     -- Add/subtract flat amount
        'minimum_price',       -- Floor price
        'maximum_price',       -- Ceiling price
        'guard_rate_override', -- Override per-guard hourly rate
        'risk_adjustment'      -- Adjust risk score
    )),
    value           DECIMAL(12, 2) NOT NULL,          -- The multiplier, amount, or override
    
    -- Metadata
    priority        INT DEFAULT 100,                  -- Lower = applied first
    is_active       BOOLEAN DEFAULT true,
    effective_from  TIMESTAMP,
    effective_until TIMESTAMP,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active, priority) WHERE is_active = true;
CREATE INDEX idx_pricing_rules_event ON pricing_rules(event_type_code);

-- ============================================================================
-- 9. ALTER QUOTES — Add ML + enrichment columns
-- ============================================================================

ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS ml_prediction_id INT REFERENCES ml_predictions(id),
    ADD COLUMN IF NOT EXISTS ml_model_version VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ml_confidence DECIMAL(4, 3),
    ADD COLUMN IF NOT EXISTS enrichment_used JSONB,
    ADD COLUMN IF NOT EXISTS pricing_rules_applied INT[];   -- Array of pricing_rule IDs applied

-- ============================================================================
-- 10. SIEM VIEW — Flattened view for Vector/Loki/Grafana dashboards
-- ============================================================================

CREATE OR REPLACE VIEW siem_auth_events_flat AS
SELECT
    e.id,
    e.created_at AS timestamp,
    e.event_type,
    e.severity,
    e.outcome,
    e.ip_address::TEXT AS src_ip,
    e.provider AS auth_provider,
    e.email AS target_email,
    u.first_name || ' ' || u.last_name AS user_name,
    u.role AS user_role,
    e.user_agent,
    e.country,
    e.city,
    e.detail,
    -- CEF-style severity mapping for SIEM
    CASE e.severity
        WHEN 'info' THEN 1
        WHEN 'low' THEN 3
        WHEN 'medium' THEN 5
        WHEN 'high' THEN 7
        WHEN 'critical' THEN 9
    END AS cef_severity
FROM siem_auth_events e
LEFT JOIN users u ON e.user_id = u.id
ORDER BY e.created_at DESC;

-- ============================================================================
-- 11. FUNCTIONS — Account lockout + SIEM helpers
-- ============================================================================

-- Auto-lock account after N failed attempts
CREATE OR REPLACE FUNCTION check_account_lockout()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'login_failure' AND NEW.outcome = 'failure' THEN
        UPDATE users
        SET failed_login_count = failed_login_count + 1,
            locked_until = CASE
                WHEN failed_login_count >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                ELSE locked_until
            END,
            lockout_count = CASE
                WHEN failed_login_count >= 4 THEN lockout_count + 1
                ELSE lockout_count
            END
        WHERE id = NEW.user_id;
    END IF;
    
    IF NEW.event_type = 'login_success' AND NEW.outcome = 'success' THEN
        UPDATE users
        SET failed_login_count = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP,
            login_count = login_count + 1
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_lockout
    AFTER INSERT ON siem_auth_events
    FOR EACH ROW
    EXECUTE FUNCTION check_account_lockout();

-- ============================================================================
-- 12. TABLE PARTITIONING — Partition SIEM events by month for performance
-- ============================================================================
-- NOTE: PostgreSQL 12+ supports declarative partitioning.
-- For now, we use a simple retention policy instead of partitioning
-- (our volume doesn't justify partitioning yet).

-- Retention: keep 90 days of SIEM events, archive older
CREATE OR REPLACE FUNCTION siem_cleanup()
RETURNS void AS $$
BEGIN
    DELETE FROM siem_auth_events
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROLLBACK (run to undo this migration)
-- ============================================================================
-- DROP VIEW IF EXISTS siem_auth_events_flat;
-- DROP TRIGGER IF EXISTS trg_account_lockout ON siem_auth_events;
-- DROP FUNCTION IF EXISTS check_account_lockout();
-- DROP FUNCTION IF EXISTS siem_cleanup();
-- DROP TABLE IF EXISTS pricing_rules CASCADE;
-- DROP TABLE IF EXISTS ml_models CASCADE;
-- DROP TABLE IF EXISTS ml_predictions CASCADE;
-- DROP TABLE IF EXISTS siem_auth_events CASCADE;
-- DROP TABLE IF EXISTS auth_sessions CASCADE;
-- DROP TABLE IF EXISTS user_emails CASCADE;
-- DROP TABLE IF EXISTS oauth_providers CASCADE;
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash_type;
-- ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
-- ALTER TABLE users DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS login_count;
-- ALTER TABLE users DROP COLUMN IF EXISTS failed_login_count;
-- ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
-- ALTER TABLE users DROP COLUMN IF EXISTS lockout_count;
-- ALTER TABLE users DROP COLUMN IF EXISTS requires_password;
-- ALTER TABLE quotes DROP COLUMN IF EXISTS ml_prediction_id;
-- ALTER TABLE quotes DROP COLUMN IF EXISTS ml_model_version;
-- ALTER TABLE quotes DROP COLUMN IF EXISTS ml_confidence;
-- ALTER TABLE quotes DROP COLUMN IF EXISTS enrichment_used;
-- ALTER TABLE quotes DROP COLUMN IF EXISTS pricing_rules_applied;

COMMIT;
