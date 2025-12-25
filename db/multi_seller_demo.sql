-- ============================================================
-- MULTI-SELLER DEMO DATA
-- Creates multiple airlines with different trust levels
-- Uses existing agent_metrics table for trust scoring
-- Including one scammer to test filtering
-- ============================================================

-- ============================================================
-- 1. ENSURE REQUIRED COLUMNS EXIST
-- ============================================================
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS quote_url TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS book_url TEXT;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS rating DECIMAL DEFAULT 0;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS owner_wallet TEXT;

-- ============================================================
-- 2. REGISTER SELLERS IN AGENT_METRICS TABLE
-- ============================================================

-- Good Seller 1: NexusAir (Highest trust - Master tier)
INSERT INTO agent_metrics (
    agent_name,
    display_name,
    description,
    category,
    owner_wallet,
    total_transactions,
    successful_transactions,
    stake_amount_sol,
    total_volume_sol,
    peer_feedback_score,
    srt_score,
    trust_tier,
    is_verified,
    is_flagged,
    quote_url,
    book_url,
    rating,
    reviews_count
) VALUES (
    'agent://nexusair',
    'NexusAir',
    'Premium Indian carrier with modern fleet and excellent service',
    'flights',
    'NexusAirWallet1111111111111111111111111111111',
    1250,
    1225,
    10.0,
    125000.00,
    0.95,
    92,
    'master',
    true,
    false,
    '/api/nexusair/flights/search',
    '/api/nexusair/bookings/create',
    4.5,
    2847
) ON CONFLICT (agent_name) DO UPDATE SET
    display_name = 'NexusAir',
    category = 'flights',
    srt_score = 92,
    trust_tier = 'master',
    stake_amount_sol = 10.0,
    is_verified = true,
    is_flagged = false;

-- Good Seller 2: SkyIndia (High trust - Master tier)
INSERT INTO agent_metrics (
    agent_name,
    display_name,
    description,
    category,
    owner_wallet,
    total_transactions,
    successful_transactions,
    stake_amount_sol,
    total_volume_sol,
    peer_feedback_score,
    srt_score,
    trust_tier,
    is_verified,
    is_flagged,
    quote_url,
    book_url,
    rating,
    reviews_count
) VALUES (
    'agent://skyindia',
    'SkyIndia Airways',
    'Indias leading full-service carrier with international routes',
    'flights',
    'SkyIndiaWallet2222222222222222222222222222222',
    3200,
    3040,
    7.5,
    280000.00,
    0.88,
    85,
    'master',
    true,
    false,
    '/api/sellers/skyindia/search',
    '/api/sellers/skyindia/book',
    4.3,
    5621
) ON CONFLICT (agent_name) DO UPDATE SET
    display_name = 'SkyIndia Airways',
    category = 'flights',
    srt_score = 85,
    trust_tier = 'master',
    stake_amount_sol = 7.5,
    is_verified = true,
    is_flagged = false;

-- Medium Seller: JetStar India (Decent trust - Adept tier)
INSERT INTO agent_metrics (
    agent_name,
    display_name,
    description,
    category,
    owner_wallet,
    total_transactions,
    successful_transactions,
    stake_amount_sol,
    total_volume_sol,
    peer_feedback_score,
    srt_score,
    trust_tier,
    is_verified,
    is_flagged,
    quote_url,
    book_url,
    rating,
    reviews_count
) VALUES (
    'agent://jetstarindia',
    'JetStar India',
    'Budget-friendly domestic flights for smart travelers',
    'flights',
    'JetStarWallet3333333333333333333333333333333',
    580,
    516,
    3.0,
    45000.00,
    0.72,
    58,
    'adept',
    true,
    false,
    '/api/sellers/jetstar/search',
    '/api/sellers/jetstar/book',
    3.8,
    1892
) ON CONFLICT (agent_name) DO UPDATE SET
    display_name = 'JetStar India',
    category = 'flights',
    srt_score = 58,
    trust_tier = 'adept',
    stake_amount_sol = 3.0,
    is_verified = true,
    is_flagged = false;

-- SCAMMER: FlyDeal (Low trust - Flagged for fraud)
INSERT INTO agent_metrics (
    agent_name,
    display_name,
    description,
    category,
    owner_wallet,
    total_transactions,
    successful_transactions,
    stake_amount_sol,
    total_volume_sol,
    peer_feedback_score,
    srt_score,
    trust_tier,
    is_verified,
    is_flagged,
    flag_reason,
    quote_url,
    book_url,
    rating,
    reviews_count
) VALUES (
    'agent://flydeal',
    'FlyDeal Super Saver',
    'Unbelievably cheap flights - 90% OFF! Too good to be true!',
    'flights',
    'FlyDealScamWallet444444444444444444444444444',
    23,
    8,
    0.1,
    1200.00,
    0.15,
    12,
    'initiate',
    false,
    true,
    'Multiple refund disputes, suspected fraudulent listings, no delivery on 65% of bookings, fake inventory',
    '/api/sellers/flydeal/search',
    '/api/sellers/flydeal/book',
    1.2,
    47
) ON CONFLICT (agent_name) DO UPDATE SET
    display_name = 'FlyDeal Super Saver',
    category = 'flights',
    srt_score = 12,
    trust_tier = 'initiate',
    stake_amount_sol = 0.1,
    is_verified = false,
    is_flagged = true,
    flag_reason = 'Multiple refund disputes, suspected fraudulent listings, no delivery on 65% of bookings, fake inventory';

-- ============================================================
-- 3. CREATE SELLER RANKINGS VIEW
-- ============================================================
DROP VIEW IF EXISTS seller_rankings;
CREATE VIEW seller_rankings AS
SELECT 
    agent_name,
    display_name,
    category,
    srt_score,
    trust_tier,
    total_transactions,
    successful_transactions,
    CASE 
        WHEN total_transactions > 0 
        THEN successful_transactions::decimal / total_transactions 
        ELSE 0 
    END as success_rate,
    stake_amount_sol as stake_amount,
    is_verified,
    COALESCE(is_flagged, false) as is_flagged,
    flag_reason,
    rating,
    reviews_count,
    
    -- Risk level
    CASE 
        WHEN COALESCE(is_flagged, false) = true THEN 'BLOCKED'
        WHEN srt_score < 30 THEN 'HIGH_RISK'
        WHEN srt_score < 50 THEN 'MEDIUM_RISK'
        WHEN srt_score < 70 THEN 'LOW_RISK'
        ELSE 'TRUSTED'
    END as risk_level,
    
    quote_url,
    book_url
    
FROM agent_metrics
WHERE category = 'flights'
ORDER BY 
    CASE WHEN COALESCE(is_flagged, false) THEN 1 ELSE 0 END,
    srt_score DESC;

-- ============================================================
-- 4. VERIFY DATA
-- ============================================================
SELECT agent_name, display_name, srt_score, trust_tier, is_flagged, risk_level 
FROM seller_rankings;
