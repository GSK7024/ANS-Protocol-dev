-- ============================================================
-- SELLER REGISTRATION SYSTEM
-- Production-ready multi-seller marketplace for ANS Protocol
-- ============================================================

-- 1. Add seller configuration to domains table
ALTER TABLE domains ADD COLUMN IF NOT EXISTS seller_config JSONB DEFAULT NULL;
-- Structure: {
--   "quote_url": "https://api.seller.com/quote",
--   "book_url": "https://api.seller.com/book",
--   "supported_routes": ["DEL-BOM", "BOM-GOA"],
--   "required_fields": ["full_name", "dob", "passport_number"],
--   "optional_fields": ["email", "phone"],
--   "category": "flights",
--   "display_name": "SkyIndia Airlines",
--   "description": "Premium domestic flights"
-- }

ALTER TABLE domains ADD COLUMN IF NOT EXISTS owner_wallet TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS trust_score NUMERIC(4,2) DEFAULT 0.0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS stake_amount NUMERIC(12,4) DEFAULT 0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'agent';

-- 2. Create seller_requirements table for field requirements
CREATE TABLE IF NOT EXISTS seller_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_agent TEXT NOT NULL UNIQUE,
    required_fields TEXT[] DEFAULT '{}',
    optional_fields TEXT[] DEFAULT '{}',
    consent_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add column if table already exists but column doesn't
ALTER TABLE seller_requirements ADD COLUMN IF NOT EXISTS consent_message TEXT;

-- 3. Create vault_consent_requests table
CREATE TABLE IF NOT EXISTS vault_consent_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_wallet TEXT NOT NULL,         -- Buyer's wallet
    target_agent TEXT NOT NULL,              -- agent://friend
    seller_agent TEXT NOT NULL,              -- agent://nexusair
    fields_requested TEXT[] NOT NULL,
    purpose TEXT NOT NULL,
    booking_context JSONB DEFAULT '{}',      -- Route, date, etc.
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    fields_approved TEXT[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create index for faster consent lookups
CREATE INDEX IF NOT EXISTS idx_consent_target ON vault_consent_requests(target_agent, status);
CREATE INDEX IF NOT EXISTS idx_consent_requester ON vault_consent_requests(requester_wallet, status);

-- 5. Create vault_access_log if not exists
CREATE TABLE IF NOT EXISTS vault_access_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vault_wallet TEXT NOT NULL,
    accessor_agent TEXT NOT NULL,
    fields_accessed TEXT[] NOT NULL,
    purpose TEXT,
    consent_id UUID REFERENCES vault_consent_requests(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. View for active sellers with trust info
CREATE OR REPLACE VIEW active_sellers AS
SELECT 
    d.id,
    d.name as agent_name,
    d.owner_wallet,
    d.seller_config,
    d.trust_score,
    d.is_verified,
    d.is_flagged,
    d.stake_amount,
    d.seller_config->>'display_name' as display_name,
    d.seller_config->>'category' as category,
    d.seller_config->>'quote_url' as quote_url,
    d.seller_config->>'book_url' as book_url,
    d.seller_config->'supported_routes' as supported_routes,
    CASE 
        WHEN d.trust_score >= 0.8 THEN 'master'
        WHEN d.trust_score >= 0.5 THEN 'adept'
        ELSE 'initiate'
    END as trust_tier,
    CASE
        WHEN d.is_flagged THEN 'blocked'
        WHEN d.trust_score < 0.3 THEN 'risky'
        ELSE 'trusted'
    END as risk_level
FROM domains d
WHERE d.seller_config IS NOT NULL
  AND d.status = 'active';

-- 7. Function to calculate trust tier (drop first to avoid parameter name conflict)
DROP FUNCTION IF EXISTS get_trust_tier(NUMERIC);
CREATE OR REPLACE FUNCTION get_trust_tier(trust_score NUMERIC)
RETURNS TEXT AS $$
BEGIN
    IF trust_score >= 0.8 THEN RETURN 'master';
    ELSIF trust_score >= 0.5 THEN RETURN 'adept';
    ELSE RETURN 'initiate';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to check if seller can receive vault data
CREATE OR REPLACE FUNCTION can_receive_vault_data(seller_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    seller_record RECORD;
BEGIN
    SELECT trust_score, stake_amount, is_flagged, is_verified
    INTO seller_record
    FROM domains
    WHERE name = seller_name;
    
    -- Must not be flagged
    IF seller_record.is_flagged THEN RETURN FALSE; END IF;
    
    -- Must have minimum trust (50%)
    IF seller_record.trust_score < 0.5 THEN RETURN FALSE; END IF;
    
    -- Must have minimum stake (5 SOL)
    IF seller_record.stake_amount < 5 THEN RETURN FALSE; END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TEST FIXTURES: Sample sellers for development testing
-- ============================================================

-- Register NexusAir as a seller (trusted, verified)
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score, is_verified, stake_amount, seller_config)
VALUES (
    'nexusair',
    'active',
    'NexusAirWallet11111111111111111111111111111',
    'agent',
    0.92,
    true,
    25.0,
    '{
        "quote_url": "http://localhost:3000/api/nexusair/quote",
        "book_url": "http://localhost:3000/api/nexusair/book",
        "supported_routes": ["DEL-BOM", "DEL-BLR", "BOM-GOA", "DEL-CCU", "BLR-HYD"],
        "required_fields": ["full_name", "dob"],
        "optional_fields": ["email", "phone", "passport_number"],
        "category": "flights",
        "display_name": "NexusAir",
        "description": "Premium domestic flights with AI-powered booking"
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    seller_config = EXCLUDED.seller_config,
    trust_score = EXCLUDED.trust_score,
    is_verified = EXCLUDED.is_verified,
    stake_amount = EXCLUDED.stake_amount,
    owner_wallet = EXCLUDED.owner_wallet;

-- Register SkyIndia as a seller (trusted)
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score, is_verified, stake_amount, seller_config)
VALUES (
    'skyindia',
    'active',
    'SkyIndiaWallet22222222222222222222222222222',
    'agent',
    0.78,
    true,
    15.0,
    '{
        "quote_url": "http://localhost:4001/quote",
        "book_url": "http://localhost:4001/book",
        "supported_routes": ["DEL-BOM", "BOM-GOA", "DEL-GOA"],
        "required_fields": ["full_name", "dob", "email"],
        "optional_fields": ["phone"],
        "category": "flights",
        "display_name": "SkyIndia Airways",
        "description": "Affordable domestic travel"
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    seller_config = EXCLUDED.seller_config,
    trust_score = EXCLUDED.trust_score,
    stake_amount = EXCLUDED.stake_amount;

-- Register JetStar as a seller (risky - low trust)
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score, is_verified, stake_amount, seller_config)
VALUES (
    'jetstar',
    'active',
    'JetStarWallet33333333333333333333333333333',
    'agent',
    0.35,
    false,
    3.0,
    '{
        "quote_url": "http://localhost:4002/quote",
        "book_url": "http://localhost:4002/book",
        "supported_routes": ["DEL-BOM", "BOM-HYD"],
        "required_fields": ["full_name", "dob"],
        "category": "flights",
        "display_name": "JetStar Budget",
        "description": "Budget flights"
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    seller_config = EXCLUDED.seller_config,
    trust_score = EXCLUDED.trust_score,
    stake_amount = EXCLUDED.stake_amount;

-- Register FlyDeal as BLOCKED seller (scammer)
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score, is_verified, is_flagged, flag_reason, stake_amount, seller_config)
VALUES (
    'flydeal',
    'active',
    'FlyDealScamWallet44444444444444444444444444',
    'agent',
    0.05,
    false,
    true,
    'Fraudulent listings, no delivery on 65% of bookings, fake inventory',
    0.5,
    '{
        "quote_url": "http://localhost:4003/quote",
        "book_url": "http://localhost:4003/book",
        "supported_routes": ["DEL-BOM"],
        "required_fields": ["full_name", "dob", "passport_number", "aadhaar"],
        "category": "flights",
        "display_name": "FlyDeal Super Saver",
        "description": "Cheapest flights guaranteed"
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    seller_config = EXCLUDED.seller_config,
    trust_score = EXCLUDED.trust_score,
    is_flagged = EXCLUDED.is_flagged,
    flag_reason = EXCLUDED.flag_reason;

-- Insert seller requirements
INSERT INTO seller_requirements (seller_agent, required_fields, optional_fields, consent_message)
VALUES 
    ('nexusair', ARRAY['full_name', 'dob'], ARRAY['email', 'phone', 'passport_number'], 'NexusAir needs your details to complete the booking.'),
    ('skyindia', ARRAY['full_name', 'dob', 'email'], ARRAY['phone'], 'SkyIndia requires email for e-ticket delivery.'),
    ('jetstar', ARRAY['full_name', 'dob'], ARRAY[]::TEXT[], 'JetStar needs basic info for boarding pass.')
ON CONFLICT (seller_agent) DO UPDATE SET
    required_fields = EXCLUDED.required_fields,
    optional_fields = EXCLUDED.optional_fields;

-- ============================================================
-- TEST BUYER AGENTS for send_money testing
-- ============================================================

-- Test buyer: gk (the user's agent)
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score)
VALUES (
    'gk',
    'active',
    'Edv2q2qjzZ5pfjGRWabAbhwQQmDjxYrw9VPGG7oK8yZF',  -- Replace with actual wallet
    'agent',
    0.75
)
ON CONFLICT (name) DO UPDATE SET
    owner_wallet = EXCLUDED.owner_wallet,
    trust_score = EXCLUDED.trust_score;

-- Test buyer 1
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score)
VALUES (
    'testbuyer1',
    'active',
    'TestBuyer1Wallet111111111111111111111111111',
    'agent',
    0.60
)
ON CONFLICT (name) DO UPDATE SET
    owner_wallet = EXCLUDED.owner_wallet;

-- Test buyer 2
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score)
VALUES (
    'testbuyer2',
    'active',
    'TestBuyer2Wallet222222222222222222222222222',
    'agent',
    0.55
)
ON CONFLICT (name) DO UPDATE SET
    owner_wallet = EXCLUDED.owner_wallet;

-- Test friend: rahul
INSERT INTO domains (name, status, owner_wallet, domain_type, trust_score)
VALUES (
    'rahul',
    'active',
    'RahulFriendWallet333333333333333333333333333',
    'agent',
    0.70
)
ON CONFLICT (name) DO UPDATE SET
    owner_wallet = EXCLUDED.owner_wallet;

SELECT 'Seller registration and test buyer fixtures created successfully!' as result;
