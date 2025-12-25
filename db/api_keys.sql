-- NEXUS API Keys Schema
-- Enables external AIs to authenticate with the NEXUS registry

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Key Identity
    key_hash TEXT UNIQUE NOT NULL,      -- SHA256 hash (never store raw key)
    key_prefix TEXT NOT NULL,           -- "nxs_abc1..." for display
    name TEXT NOT NULL,                 -- "My GPT Agent", "Perplexity Bot"
    
    -- Ownership
    owner_wallet TEXT,                  -- Optional Solana wallet link
    
    -- Rate Limiting (120/min for all - FREE)
    rate_limit_per_minute INT DEFAULT 120,
    
    -- Usage Tracking
    total_requests BIGINT DEFAULT 0,
    last_request_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Public can check if key is valid (via hash lookup)
DROP POLICY IF EXISTS "Service role full access" ON api_keys;
CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (true);

-- Function to increment request count
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE api_keys
    SET 
        total_requests = total_requests + 1,
        last_request_at = NOW()
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE api_keys IS 'NEXUS API Keys - Authentication for external AI consumers';
