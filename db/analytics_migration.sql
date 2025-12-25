-- =====================================================
-- ANS Analytics Database Schema
-- =====================================================
-- Run this in Supabase SQL Editor to enable analytics

-- 1. Daily aggregated analytics per domain
CREATE TABLE IF NOT EXISTS domain_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    network TEXT DEFAULT 'mainnet' CHECK (network IN ('mainnet', 'devnet')),
    
    -- Lookup Metrics
    lookup_count INTEGER DEFAULT 0,
    unique_lookups INTEGER DEFAULT 0,
    
    -- Escrow Metrics  
    escrow_created INTEGER DEFAULT 0,
    escrow_completed INTEGER DEFAULT 0,
    escrow_disputed INTEGER DEFAULT 0,
    escrow_refunded INTEGER DEFAULT 0,
    revenue_sol DECIMAL(18,9) DEFAULT 0,
    
    -- Reputation Metrics
    srt_score DECIMAL(5,2),
    reviews_received INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    
    -- Marketplace
    marketplace_views INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(domain_name, date, network)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_analytics_domain ON domain_analytics(domain_name);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON domain_analytics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_network ON domain_analytics(network);
CREATE INDEX IF NOT EXISTS idx_analytics_domain_date ON domain_analytics(domain_name, date DESC);

-- 2. Real-time analytics events (for detailed tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'lookup', 
        'escrow_create', 
        'escrow_lock',
        'escrow_complete', 
        'escrow_dispute',
        'escrow_refund',
        'review', 
        'marketplace_view',
        'api_call'
    )),
    network TEXT DEFAULT 'mainnet' CHECK (network IN ('mainnet', 'devnet')),
    event_data JSONB,
    ip_hash TEXT,
    resolver_agent TEXT, -- The agent that resolved this domain
    amount_sol DECIMAL(18,9), -- For escrow events
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_events_domain ON analytics_events(domain_name);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_network ON analytics_events(network);

-- 3. Function to increment daily analytics (called on each event)
CREATE OR REPLACE FUNCTION increment_analytics(
    p_domain_name TEXT,
    p_network TEXT,
    p_field TEXT,
    p_amount DECIMAL DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    INSERT INTO domain_analytics (domain_name, date, network)
    VALUES (p_domain_name, CURRENT_DATE, p_network)
    ON CONFLICT (domain_name, date, network) DO NOTHING;
    
    EXECUTE format(
        'UPDATE domain_analytics SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() 
         WHERE domain_name = $2 AND date = CURRENT_DATE AND network = $3',
        p_field, p_field
    ) USING p_amount, p_domain_name, p_network;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to update unique lookups (counts distinct IPs)
CREATE OR REPLACE FUNCTION update_unique_lookups(
    p_domain_name TEXT,
    p_network TEXT
) RETURNS VOID AS $$
DECLARE
    unique_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT ip_hash) INTO unique_count
    FROM analytics_events
    WHERE domain_name = p_domain_name
      AND event_type = 'lookup'
      AND network = p_network
      AND DATE(created_at) = CURRENT_DATE;
    
    UPDATE domain_analytics 
    SET unique_lookups = unique_count, updated_at = NOW()
    WHERE domain_name = p_domain_name 
      AND date = CURRENT_DATE 
      AND network = p_network;
END;
$$ LANGUAGE plpgsql;

-- 5. View for dashboard summary (last 30 days)
CREATE OR REPLACE VIEW analytics_summary_30d AS
SELECT 
    domain_name,
    network,
    SUM(lookup_count) as total_lookups,
    SUM(unique_lookups) as total_unique_lookups,
    SUM(escrow_created) as total_escrows,
    SUM(escrow_completed) as completed_escrows,
    SUM(escrow_disputed) as disputed_escrows,
    SUM(revenue_sol) as total_revenue,
    AVG(srt_score) as avg_srt_score,
    SUM(reviews_received) as total_reviews,
    AVG(avg_rating) as avg_rating,
    SUM(marketplace_views) as total_marketplace_views
FROM domain_analytics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY domain_name, network;

-- 6. RLS Policies
ALTER TABLE domain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on analytics" ON domain_analytics
    FOR ALL USING (true);
    
CREATE POLICY "Service role full access on events" ON analytics_events
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON domain_analytics TO service_role;
GRANT ALL ON analytics_events TO service_role;
GRANT EXECUTE ON FUNCTION increment_analytics TO service_role;
GRANT EXECUTE ON FUNCTION update_unique_lookups TO service_role;

-- =====================================================
-- Migration complete!
-- =====================================================
