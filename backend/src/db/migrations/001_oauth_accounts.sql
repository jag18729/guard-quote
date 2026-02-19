-- OAuth accounts table for linking external identity providers to users
-- Run this migration: psql $DATABASE_URL -f src/db/migrations/001_oauth_accounts.sql

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,        -- 'microsoft', 'google', 'github'
  provider_id VARCHAR(255) NOT NULL,    -- Unique ID from provider
  email VARCHAR(255),                   -- Email from provider (may differ from user email)
  access_token TEXT,                    -- Optional: store for API access
  refresh_token TEXT,                   -- Optional: for token refresh
  token_expires_at TIMESTAMP,           -- Optional: token expiration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)         -- One provider account per user
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_email ON oauth_accounts(email);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_oauth_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_accounts_updated_at();

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_accounts TO guardquote;
-- GRANT USAGE, SELECT ON SEQUENCE oauth_accounts_id_seq TO guardquote;
