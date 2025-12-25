-- =====================================================
-- ANS Analytics Enhancements
-- =====================================================
-- Run AFTER the main analytics_migration.sql

-- =====================================================
-- 1. FOREIGN KEYS (Data Integrity)
-- =====================================================
-- Note: Run only if domains table uses 'name' as unique key
-- ALTER TABLE domain_analytics 
-- ADD CONSTRAINT fk_analytics_domain 
-- FOREIGN KEY (domain_name) REFERENCES domains(name) ON DELETE CASCADE;

-- =====================================================
-- 2. ENHANCED JSONB INDEXES (Performance)
-- =====================================================
-- Index for querying revenue from event_data
CREATE INDEX IF NOT EXISTS idx_event_amount 
ON analytics_events USING GIN ((event_data->'amount'));

-- Index for resolver agent lookups
CREATE INDEX IF NOT EXISTS idx_event_resolver 
ON analytics_events(resolver_agent) WHERE resolver_agent IS NOT NULL;

-- Composite index for time-range queries
CREATE INDEX IF NOT EXISTS idx_events_domain_time 
ON analytics_events(domain_name, created_at DESC);

-- =====================================================
-- 3. MATERIALIZED VIEW FOR FAST DASHBOARD (Performance)
-- =====================================================
-- Drop if exists to allow recreation
DROP MATERIALIZED VIEW IF EXISTS mv_analytics_summary;

CREATE MATERIALIZED VIEW mv_analytics_summary AS
SELECT 
    da.domain_name,
    da.network,
    d.category,
    
    -- 7-day metrics
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '7 days' THEN da.lookup_count ELSE 0 END) as lookups_7d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '7 days' THEN da.revenue_sol ELSE 0 END) as revenue_7d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '7 days' THEN da.escrow_created ELSE 0 END) as escrows_7d,
    
    -- 30-day metrics
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '30 days' THEN da.lookup_count ELSE 0 END) as lookups_30d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '30 days' THEN da.revenue_sol ELSE 0 END) as revenue_30d,
    SUM(CASE WHEN da.date >= CURRENT_DATE - INTERVAL '30 days' THEN da.escrow_created ELSE 0 END) as escrows_30d,
    
    -- 90-day metrics  
    SUM(da.lookup_count) as lookups_90d,
    SUM(da.revenue_sol) as revenue_90d,
    SUM(da.escrow_created) as escrows_90d,
    
    -- Aggregates
    SUM(da.escrow_completed) as completed_escrows,
    SUM(da.escrow_disputed) as disputed_escrows,
    AVG(da.srt_score) as avg_srt,
    SUM(da.reviews_received) as total_reviews,
    AVG(da.avg_rating) as avg_rating
FROM domain_analytics da
LEFT JOIN domains d ON da.domain_name = d.name
WHERE da.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY da.domain_name, da.network, d.category;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_summary_domain 
ON mv_analytics_summary(domain_name, network);

CREATE INDEX IF NOT EXISTS idx_mv_summary_category 
ON mv_analytics_summary(category);

-- =====================================================
-- 4. CATEGORY BENCHMARKS VIEW (For Comparisons)
-- =====================================================
-- Shows avg metrics per category for "vs industry avg" comparisons
DROP VIEW IF EXISTS category_benchmarks;

CREATE VIEW category_benchmarks AS
SELECT 
    d.category,
    mv.network,
    COUNT(DISTINCT mv.domain_name) as domain_count,
    AVG(mv.lookups_30d) as avg_lookups_30d,
    AVG(mv.revenue_30d) as avg_revenue_30d,
    AVG(mv.escrows_30d) as avg_escrows_30d,
    AVG(mv.avg_srt) as avg_srt_score,
    AVG(mv.avg_rating) as avg_rating
FROM mv_analytics_summary mv
LEFT JOIN domains d ON mv.domain_name = d.name
WHERE d.category IS NOT NULL
GROUP BY d.category, mv.network;

-- =====================================================
-- 5. FUNCTION: Get Comparison Metrics
-- =====================================================
-- Returns 7d, 30d metrics with % change
CREATE OR REPLACE FUNCTION get_comparison_metrics(
    p_domain_name TEXT,
    p_network TEXT DEFAULT 'mainnet'
) 
RETURNS TABLE (
    metric TEXT,
    value_7d DECIMAL,
    value_30d DECIMAL,
    change_pct DECIMAL,
    vs_category_avg DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH domain_data AS (
        SELECT * FROM mv_analytics_summary 
        WHERE domain_name = p_domain_name AND network = p_network
    ),
    category_data AS (
        SELECT cb.* 
        FROM category_benchmarks cb
        JOIN domains d ON d.category = cb.category
        WHERE d.name = p_domain_name AND cb.network = p_network
    )
    SELECT 
        'Lookups'::TEXT as metric,
        COALESCE(d.lookups_7d, 0)::DECIMAL as value_7d,
        COALESCE(d.lookups_30d, 0)::DECIMAL as value_30d,
        CASE 
            WHEN d.lookups_7d > 0 THEN 
                ROUND(((d.lookups_30d / d.lookups_7d) - 1) * 100, 1)
            ELSE 0 
        END as change_pct,
        CASE 
            WHEN c.avg_lookups_30d > 0 THEN 
                ROUND(((d.lookups_30d / c.avg_lookups_30d) - 1) * 100, 1)
            ELSE 0 
        END as vs_category_avg
    FROM domain_data d
    LEFT JOIN category_data c ON true
    
    UNION ALL
    
    SELECT 
        'Revenue (SOL)'::TEXT,
        COALESCE(d.revenue_7d, 0)::DECIMAL,
        COALESCE(d.revenue_30d, 0)::DECIMAL,
        CASE 
            WHEN d.revenue_7d > 0 THEN 
                ROUND(((d.revenue_30d / d.revenue_7d) - 1) * 100, 1)
            ELSE 0 
        END,
        CASE 
            WHEN c.avg_revenue_30d > 0 THEN 
                ROUND(((d.revenue_30d / c.avg_revenue_30d) - 1) * 100, 1)
            ELSE 0 
        END
    FROM domain_data d
    LEFT JOIN category_data c ON true

    UNION ALL
    
    SELECT 
        'Escrows'::TEXT,
        COALESCE(d.escrows_7d, 0)::DECIMAL,
        COALESCE(d.escrows_30d, 0)::DECIMAL,
        CASE 
            WHEN d.escrows_7d > 0 THEN 
                ROUND(((d.escrows_30d / d.escrows_7d) - 1) * 100, 1)
            ELSE 0 
        END,
        CASE 
            WHEN c.avg_escrows_30d > 0 THEN 
                ROUND(((d.escrows_30d / c.avg_escrows_30d) - 1) * 100, 1)
            ELSE 0 
        END
    FROM domain_data d
    LEFT JOIN category_data c ON true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. REFRESH FUNCTION (For cron jobs)
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. PARTITIONING PREP (For high-volume scale)
-- =====================================================
-- Note: Uncomment if expecting 1M+ events/month
-- This creates monthly partitions for analytics_events

-- CREATE TABLE analytics_events_partitioned (
--     LIKE analytics_events INCLUDING DEFAULTS INCLUDING CONSTRAINTS
-- ) PARTITION BY RANGE (created_at);
-- 
-- CREATE TABLE analytics_events_2025_12 
-- PARTITION OF analytics_events_partitioned 
-- FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- =====================================================
-- 8. GRANTS
-- =====================================================
GRANT SELECT ON mv_analytics_summary TO service_role;
GRANT SELECT ON category_benchmarks TO service_role;
GRANT EXECUTE ON FUNCTION get_comparison_metrics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_analytics_summary TO service_role;

-- =====================================================
-- Enhancement Migration Complete!
-- 
-- To refresh materialized view (run daily via cron):
-- SELECT refresh_analytics_summary();
-- =====================================================
