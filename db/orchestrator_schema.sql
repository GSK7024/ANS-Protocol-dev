-- NEXUS Core Orchestrator Schema Extensions
-- Phase 15: The Brain

-- 1. Add API configuration to domains table
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS api_config JSONB DEFAULT '{}';

-- api_config structure:
-- {
--   "quote_url": "https://agent.example/api/quote",
--   "book_url": "https://agent.example/api/book",  
--   "webhook_url": "https://agent.example/api/nexus-webhook",
--   "api_key": "encrypted_key_here",
--   "supported_actions": ["search", "book", "cancel"],
--   "response_time_avg_ms": 1500
-- }

-- 2. Index for fast agent discovery
CREATE INDEX IF NOT EXISTS idx_domains_category ON domains(category);
CREATE INDEX IF NOT EXISTS idx_domains_api_config ON domains USING GIN(api_config);

-- 3. Orchestration events table (webhook tracking)
CREATE TABLE IF NOT EXISTS orchestration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrow_transactions(id),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'payment_received',
        'delivery_confirmed',
        'funds_released',
        'escrow_expired',
        'dispute_opened',
        'refund_processed'
    )),
    direction TEXT NOT NULL CHECK (direction IN ('to_seller', 'to_buyer', 'internal')),
    recipient_agent TEXT,
    recipient_webhook TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for webhook retry logic
CREATE INDEX IF NOT EXISTS idx_events_status ON orchestration_events(status);
CREATE INDEX IF NOT EXISTS idx_events_escrow ON orchestration_events(escrow_id);

-- 4. Agent performance metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
    agent_name TEXT PRIMARY KEY,
    total_transactions INT DEFAULT 0,
    successful_transactions INT DEFAULT 0,
    failed_transactions INT DEFAULT 0,
    avg_response_time_ms INT DEFAULT 0,
    avg_delivery_time_ms INT DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Function to calculate completion rate
CREATE OR REPLACE FUNCTION get_agent_completion_rate(agent TEXT)
RETURNS DECIMAL AS $$
DECLARE
    total INT;
    successful INT;
BEGIN
    SELECT total_transactions, successful_transactions 
    INTO total, successful
    FROM agent_metrics WHERE agent_name = agent;
    
    IF total IS NULL OR total = 0 THEN
        RETURN 0.5; -- Default for new agents
    END IF;
    
    RETURN successful::DECIMAL / total::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- 6. RLS for orchestration events
ALTER TABLE orchestration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for events" ON orchestration_events FOR SELECT USING (true);
CREATE POLICY "Service role write" ON orchestration_events FOR ALL USING (true);

-- 7. Update existing test agents with API config
UPDATE domains SET api_config = '{
    "quote_url": "http://localhost:3000/api/testing/flights",
    "webhook_url": "internal://airindia-agent",
    "supported_actions": ["search", "book"],
    "response_time_avg_ms": 2000
}'::jsonb WHERE name = 'airindia-test';

UPDATE domains SET api_config = '{
    "quote_url": "http://localhost:3000/api/testing/flights",
    "webhook_url": "internal://skyjet-agent",
    "supported_actions": ["search", "book"],
    "response_time_avg_ms": 3000
}'::jsonb WHERE name = 'skyjet-test';

UPDATE domains SET api_config = '{
    "quote_url": "http://localhost:3000/api/testing/flights",
    "webhook_url": "internal://scamair-agent",
    "supported_actions": ["search", "book"],
    "response_time_avg_ms": 9999
}'::jsonb WHERE name = 'scamair-test';

COMMENT ON TABLE orchestration_events IS 'Tracks all webhook events sent to/from agents';
COMMENT ON TABLE agent_metrics IS 'Performance metrics for ranking agents';
