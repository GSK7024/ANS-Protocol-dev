-- =====================================================
-- ANS COMPLETE DATABASE MIGRATION (FIXED & IDEMPOTENT V4)
-- Run this in Supabase SQL Editor
-- =====================================================
-- Created: 2024-12-22
-- Combines: api_keys, analytics, audit_logs with ROBUST idempotency
-- Fixes: "cannot change return type" by dropping functions
-- Fixes: "column event_type does not exist" by expecting partial tables
-- =====================================================

-- 1. API KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash TEXT UNIQUE NOT NULL
);

-- Safely add columns if they don't exist
DO $$ 
BEGIN
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS owner_wallet TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_per_minute INT DEFAULT 120;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS total_requests BIGINT DEFAULT 0;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_request_at TIMESTAMPTZ;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 1b. DOMAINS TABLE (Fixing the missing column error)
-- =====================================================
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

DO $$ 
BEGIN
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS owner_wallet TEXT;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS price_paid DECIMAL DEFAULT 0;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_genesis BOOLEAN DEFAULT false;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_user_domain BOOLEAN DEFAULT false; -- FIX FOR ERROR
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SOL';
END $$;

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON api_keys;
CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (true);

-- Fix: Drop function first to allow return type changes
DROP FUNCTION IF EXISTS increment_api_key_usage(UUID);
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE api_keys
    SET total_requests = total_requests + 1, last_request_at = NOW()
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- 2. ANALYTICS TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS domain_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL
);

-- Safely add columns for domain_analytics
DO $$ 
BEGIN
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet';
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS total_lookups INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS unique_lookups INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS escrows_created INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS escrows_completed INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS escrows_disputed INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS escrows_refunded INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS revenue_sol DECIMAL(18, 9) DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3, 2) DEFAULT 0;
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS top_resolvers JSONB DEFAULT '[]';
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS unique_ip_hashes TEXT[] DEFAULT '{}';
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Add constraints safely
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domain_analytics_domain_name_date_network_key') THEN
        ALTER TABLE domain_analytics ADD CONSTRAINT domain_analytics_domain_name_date_network_key UNIQUE(domain_name, date, network);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL
);

-- Safely add columns for analytics_events
DO $$ 
BEGIN
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet';
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_type TEXT;
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_data JSONB DEFAULT '{}';
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS resolver_agent TEXT;
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_hash TEXT;
    ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_da_domain_date ON domain_analytics(domain_name, date);
CREATE INDEX IF NOT EXISTS idx_da_network ON domain_analytics(network);
CREATE INDEX IF NOT EXISTS idx_ae_domain ON analytics_events(domain_name);
CREATE INDEX IF NOT EXISTS idx_ae_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_created ON analytics_events(created_at);

ALTER TABLE domain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role analytics access" ON domain_analytics;
DROP POLICY IF EXISTS "Service role events access" ON analytics_events;
CREATE POLICY "Service role analytics access" ON domain_analytics FOR ALL USING (true);
CREATE POLICY "Service role events access" ON analytics_events FOR ALL USING (true);

-- Analytics functions
DROP FUNCTION IF EXISTS increment_analytics(TEXT, TEXT, TEXT, INT);
CREATE OR REPLACE FUNCTION increment_analytics(
    p_domain TEXT, p_network TEXT, p_field TEXT, p_amount INT DEFAULT 1
) RETURNS void AS $$
BEGIN
    INSERT INTO domain_analytics (domain_name, network, date)
    VALUES (p_domain, p_network, CURRENT_DATE)
    ON CONFLICT (domain_name, date, network) DO NOTHING;
    
    EXECUTE format('UPDATE domain_analytics SET %I = %I + $1, updated_at = NOW() WHERE domain_name = $2 AND date = CURRENT_DATE AND network = $3', p_field, p_field)
    USING p_amount, p_domain, p_network;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS update_unique_lookups(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_unique_lookups(
    p_domain TEXT, p_network TEXT, p_ip_hash TEXT
) RETURNS void AS $$
BEGIN
    UPDATE domain_analytics 
    SET unique_ip_hashes = array_append(unique_ip_hashes, p_ip_hash),
        unique_lookups = unique_lookups + 1,
        updated_at = NOW()
    WHERE domain_name = p_domain 
    AND date = CURRENT_DATE 
    AND network = p_network
    AND NOT (p_ip_hash = ANY(unique_ip_hashes));
END;
$$ LANGUAGE plpgsql;

-- 3. ANALYTICS VIEWS & MATERIALIZED VIEWS
-- =====================================================
DROP VIEW IF EXISTS analytics_summary_30d;
CREATE VIEW analytics_summary_30d AS
SELECT 
    domain_name, network,
    SUM(total_lookups) as total_lookups,
    SUM(unique_lookups) as unique_lookups,
    SUM(escrows_completed) as completed_escrows,
    SUM(revenue_sol) as total_revenue,
    AVG(avg_rating) as avg_rating
FROM domain_analytics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY domain_name, network;

-- JSONB indexes for event data
CREATE INDEX IF NOT EXISTS idx_ae_event_amount ON analytics_events ((event_data->>'amount'));
CREATE INDEX IF NOT EXISTS idx_ae_resolver ON analytics_events (resolver_agent) WHERE resolver_agent IS NOT NULL;

-- Materialized view for fast dashboard queries
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_summary CASCADE;
CREATE MATERIALIZED VIEW mv_analytics_summary AS
SELECT 
    da.domain_name,
    da.network,
    d.owner_wallet,
    d.category,
    -- 7d metrics
    SUM(CASE WHEN da.date >= CURRENT_DATE - 7 THEN da.total_lookups ELSE 0 END) as lookups_7d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - 7 THEN da.revenue_sol ELSE 0 END) as revenue_7d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - 7 THEN da.escrows_completed ELSE 0 END) as escrows_7d,
    -- 30d metrics
    SUM(CASE WHEN da.date >= CURRENT_DATE - 30 THEN da.total_lookups ELSE 0 END) as lookups_30d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - 30 THEN da.revenue_sol ELSE 0 END) as revenue_30d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - 30 THEN da.escrows_completed ELSE 0 END) as escrows_30d,
    -- 90d metrics
    SUM(da.total_lookups) as lookups_90d,
    SUM(da.revenue_sol) as revenue_90d,
    SUM(da.escrows_completed) as escrows_90d,
    -- Ratings
    AVG(da.avg_rating) FILTER (WHERE da.avg_rating > 0) as avg_rating,
    MAX(da.updated_at) as last_activity
FROM domain_analytics da
LEFT JOIN domains d ON da.domain_name = d.name AND da.network = d.network
WHERE da.date >= CURRENT_DATE - 90
GROUP BY da.domain_name, da.network, d.owner_wallet, d.category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_domain ON mv_analytics_summary (domain_name, network);
CREATE INDEX IF NOT EXISTS idx_mv_analytics_wallet ON mv_analytics_summary (owner_wallet);
CREATE INDEX IF NOT EXISTS idx_mv_analytics_category ON mv_analytics_summary (category);

-- Category benchmarks view
DROP VIEW IF EXISTS category_benchmarks;
CREATE VIEW category_benchmarks AS
SELECT 
    category,
    network,
    COUNT(*) as domain_count,
    AVG(lookups_30d) as avg_lookups_30d,
    AVG(revenue_30d) as avg_revenue_30d,
    AVG(escrows_30d) as avg_escrows_30d,
    AVG(avg_rating) as avg_rating,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lookups_30d) as median_lookups,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY lookups_30d) as p90_lookups
FROM mv_analytics_summary
WHERE category IS NOT NULL
GROUP BY category, network;

-- Comparison metrics function
DROP FUNCTION IF EXISTS get_comparison_metrics(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_comparison_metrics(p_domain TEXT, p_network TEXT)
RETURNS TABLE (
    metric TEXT,
    value_7d NUMERIC,
    value_30d NUMERIC,
    change_pct NUMERIC,
    category_avg NUMERIC,
    vs_category_pct NUMERIC
) AS $$
DECLARE
    v_category TEXT;
BEGIN
    SELECT category INTO v_category FROM domains WHERE name = p_domain AND network = p_network;
    RETURN QUERY
    WITH domain_data AS (
        SELECT * FROM mv_analytics_summary WHERE domain_name = p_domain AND network = p_network
    ),
    cat_data AS (
        SELECT * FROM category_benchmarks WHERE category = v_category AND network = p_network
    )
    SELECT 'lookups'::TEXT, dd.lookups_7d::NUMERIC, dd.lookups_30d::NUMERIC,
        CASE WHEN dd.lookups_7d > 0 THEN ROUND(((dd.lookups_30d - dd.lookups_7d * 4.3) / NULLIF(dd.lookups_7d * 4.3, 0)) * 100, 1) ELSE 0 END,
        cd.avg_lookups_30d::NUMERIC,
        CASE WHEN cd.avg_lookups_30d > 0 THEN ROUND(((dd.lookups_30d - cd.avg_lookups_30d) / cd.avg_lookups_30d) * 100, 1) ELSE 0 END
    FROM domain_data dd, cat_data cd
    UNION ALL
    SELECT 'revenue'::TEXT, dd.revenue_7d::NUMERIC, dd.revenue_30d::NUMERIC,
        CASE WHEN dd.revenue_7d > 0 THEN ROUND(((dd.revenue_30d - dd.revenue_7d * 4.3) / NULLIF(dd.revenue_7d * 4.3, 0)) * 100, 1) ELSE 0 END,
        cd.avg_revenue_30d::NUMERIC,
        CASE WHEN cd.avg_revenue_30d > 0 THEN ROUND(((dd.revenue_30d - cd.avg_revenue_30d) / cd.avg_revenue_30d) * 100, 1) ELSE 0 END
    FROM domain_data dd, cat_data cd;
END;
$$ LANGUAGE plpgsql;

-- Refresh function
DROP FUNCTION IF EXISTS refresh_analytics_summary();
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- 4. AUDIT LOGS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Safely add columns for audit_logs
DO $$ 
BEGIN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_type TEXT; -- ADDED FIX
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_wallet TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_ip_hash TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_wallet);
CREATE INDEX IF NOT EXISTS idx_audit_risk ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role audit access" ON audit_logs;
CREATE POLICY "Service role audit access" ON audit_logs FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON domain_analytics TO service_role;
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON mv_analytics_summary TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run: SELECT refresh_analytics_summary(); after first use
