-- GuardQuote PostgreSQL Schema (3NF Normalized)
-- Migrated from MySQL to PostgreSQL with Bun.sql() native driver

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (for clean migration)
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS ml_training_data CASCADE;
DROP TABLE IF EXISTS quote_status_history CASCADE;
DROP TABLE IF EXISTS quote_line_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS service_options CASCADE;
DROP TABLE IF EXISTS event_types CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS - Authentication & Authorization
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'iam', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. LOCATIONS - Normalized location data with risk zones
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(10) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100),
    region VARCHAR(50),
    risk_zone VARCHAR(20) DEFAULT 'medium' CHECK (risk_zone IN ('low', 'medium', 'high', 'critical')),
    base_multiplier DECIMAL(4, 2) DEFAULT 1.00,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7)
);

-- 3. EVENT_TYPES - Normalized event categories with pricing
CREATE TABLE event_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_hourly_rate DECIMAL(8, 2) NOT NULL,
    risk_weight DECIMAL(4, 2) NOT NULL,
    min_guards INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- 4. SERVICE_OPTIONS - Pricing for add-on services
CREATE TABLE service_options (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('flat', 'hourly', 'per_guard', 'percentage')),
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 5. CLIENTS - Customer information
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(255),
    location_id INT REFERENCES locations(id),
    tax_id VARCHAR(50),
    credit_limit DECIMAL(12, 2),
    payment_terms INT DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. QUOTES - Main quote header
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    client_id INT NOT NULL REFERENCES clients(id),
    created_by INT NOT NULL REFERENCES users(id),
    event_type_id INT NOT NULL REFERENCES event_types(id),
    location_id INT NOT NULL REFERENCES locations(id),

    -- Event details
    event_date TIMESTAMP NOT NULL,
    event_end_date TIMESTAMP,
    event_name VARCHAR(255),
    event_description TEXT,

    -- Requirements
    num_guards INT NOT NULL,
    hours_per_guard DECIMAL(5, 2) NOT NULL,
    crowd_size INT DEFAULT 0,

    -- Calculated values
    subtotal DECIMAL(12, 2),
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    tax_amount DECIMAL(12, 2),
    total_price DECIMAL(12, 2),

    -- ML-generated fields
    risk_score DECIMAL(4, 3),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score DECIMAL(4, 3),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'completed')),
    valid_until TIMESTAMP,
    notes TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. QUOTE_LINE_ITEMS - Itemized pricing breakdown
CREATE TABLE quote_line_items (
    id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    service_option_id INT REFERENCES service_options(id),
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    sort_order INT DEFAULT 0
);

-- 8. QUOTE_STATUS_HISTORY - Audit trail
CREATE TABLE quote_status_history (
    id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by INT REFERENCES users(id),
    reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ML_TRAINING_DATA - Denormalized for ML performance
CREATE TABLE ml_training_data (
    id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL REFERENCES quotes(id),

    -- Features
    event_type_code VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    state VARCHAR(2) NOT NULL,
    risk_zone VARCHAR(20),
    num_guards INT NOT NULL,
    hours_per_guard DECIMAL(5, 2) NOT NULL,
    total_guard_hours DECIMAL(8, 2) NOT NULL,
    crowd_size INT DEFAULT 0,
    day_of_week INT NOT NULL,
    hour_of_day INT NOT NULL,
    month INT NOT NULL,
    is_weekend BOOLEAN DEFAULT false,
    is_night_shift BOOLEAN DEFAULT false,
    is_armed BOOLEAN DEFAULT false,
    has_vehicle BOOLEAN DEFAULT false,

    -- Targets
    final_price DECIMAL(12, 2) NOT NULL,
    risk_score DECIMAL(4, 3),
    was_accepted BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. WEBHOOKS - Event notifications
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL, -- PostgreSQL array for event types
    is_active BOOLEAN DEFAULT true,
    retry_count INT DEFAULT 3,
    timeout_ms INT DEFAULT 5000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. WEBHOOK_LOGS - Delivery tracking
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_id INT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    delivered_at TIMESTAMP,
    error_message TEXT,
    attempt_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. BLOG_POSTS - Team blog/updates
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. BLOG_COMMENTS - Blog post comments
CREATE TABLE blog_comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. FEATURE_REQUESTS - Feature tracking
CREATE TABLE feature_requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    category VARCHAR(100),
    requested_by INT REFERENCES users(id),
    assignee_id INT REFERENCES users(id),
    monday_item_id VARCHAR(100),
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. FEATURE_VOTES - Unique vote tracking
CREATE TABLE feature_votes (
    id SERIAL PRIMARY KEY,
    feature_id INT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feature_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at);
CREATE INDEX idx_ml_training_event ON ml_training_data(event_type_code);
CREATE INDEX idx_ml_training_state ON ml_training_data(state);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);

-- Insert default event types
INSERT INTO event_types (code, name, base_hourly_rate, risk_weight) VALUES
    ('corporate', 'Corporate Event', 35.00, 0.20),
    ('concert', 'Concert / Festival', 45.00, 0.70),
    ('sports', 'Sporting Event', 42.00, 0.60),
    ('private', 'Private Event', 30.00, 0.30),
    ('construction', 'Construction Site', 32.00, 0.40),
    ('retail', 'Retail Security', 28.00, 0.35),
    ('residential', 'Residential', 25.00, 0.25);

-- Insert default service options
INSERT INTO service_options (code, name, price_type, price) VALUES
    ('armed', 'Armed Guards', 'hourly', 15.00),
    ('vehicle', 'Vehicle Patrol', 'per_guard', 50.00),
    ('k9', 'K-9 Unit', 'hourly', 75.00),
    ('supervisor', 'On-site Supervisor', 'flat', 150.00);

-- Insert a demo user
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
    ('admin@guardquote.com', '$2b$10$demo', 'Admin', 'User', 'admin');

-- Insert some locations
INSERT INTO locations (zip_code, city, state, risk_zone, base_multiplier) VALUES
    ('90001', 'Los Angeles', 'CA', 'high', 1.20),
    ('90210', 'Beverly Hills', 'CA', 'low', 1.00),
    ('10001', 'New York', 'NY', 'high', 1.25),
    ('33101', 'Miami', 'FL', 'medium', 1.10),
    ('60601', 'Chicago', 'IL', 'high', 1.15);
