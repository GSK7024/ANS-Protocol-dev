-- =============================================
-- REGISTER ALL MOCK SELLERS
-- Run this in your Supabase SQL Editor
-- =============================================

-- Replace this with your actual wallet address
-- Get it from: Your connected wallet in the dashboard
DO $$
DECLARE
    owner_wallet TEXT := '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv';
BEGIN

-- ============ FLIGHTS ============

-- 1. Indigo Flights
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'indigo-flights',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['flights', 'domestic', 'india', 'cheap'],
    '{"quote_url": "http://localhost:3000/api/sellers/indigo-flights"}'::jsonb,
    0.85
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 2. SkyJet Airways (with verify_url!)
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, payment_config, trust_score)
VALUES (
    'skyjet-airways',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['flights', 'international', 'premium'],
    '{"quote_url": "http://localhost:3000/api/sellers/skyjet-airways", "verify_url": "http://localhost:3000/api/sellers/skyjet-airways/verify"}'::jsonb,
    '{"solana_address": "6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv"}'::jsonb,
    0.9
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config, payment_config = EXCLUDED.payment_config;

-- 3. BudgetAir
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'budget-air',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['flights', 'budget', 'cheap', 'domestic'],
    '{"quote_url": "http://localhost:3000/api/sellers/budget-air"}'::jsonb,
    0.75
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 4. Scammer Airways (Low Trust - for testing)
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score, is_verified)
VALUES (
    'scammer-airways',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['flights', 'scam', 'cheap'],
    '{"quote_url": "http://localhost:3000/api/sellers/scammer-airways"}'::jsonb,
    0.1,
    false
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config, trust_score = 0.1;

-- ============ HOTELS ============

-- 5. Grand Cyberpunk Hotel
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'grand-cyberpunk-hotel',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['hotel', 'luxury', 'tokyo', 'cyberpunk'],
    '{"quote_url": "http://localhost:3000/api/sellers/grand-cyberpunk-hotel"}'::jsonb,
    0.95
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 6. Neon Pods
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'neon-pods',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['hotel', 'capsule', 'budget', 'tokyo', 'akihabara'],
    '{"quote_url": "http://localhost:3000/api/sellers/neon-pods"}'::jsonb,
    0.8
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 7. Mars Base Alpha
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'mars-base-alpha',
    owner_wallet,
    'active',
    'Travel',
    ARRAY['hotel', 'space', 'premium', 'mars', 'futuristic'],
    '{"quote_url": "http://localhost:3000/api/sellers/mars-base-alpha"}'::jsonb,
    0.98
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- ============ E-COMMERCE ============

-- 8. TechMart (Electronics)
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'techmart',
    owner_wallet,
    'active',
    'Shopping',
    ARRAY['electronics', 'phones', 'laptops', 'gaming'],
    '{"quote_url": "http://localhost:3000/api/sellers/techmart"}'::jsonb,
    0.92
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 9. FashionHub (Fashion)
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'fashionhub',
    owner_wallet,
    'active',
    'Shopping',
    ARRAY['fashion', 'shoes', 'clothes', 'accessories'],
    '{"quote_url": "http://localhost:3000/api/sellers/fashionhub"}'::jsonb,
    0.88
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

-- 10. HomeEssentials (Home)
INSERT INTO domains (name, owner_wallet, status, category, tags, api_config, trust_score)
VALUES (
    'home-essentials',
    owner_wallet,
    'active',
    'Shopping',
    ARRAY['home', 'kitchen', 'furniture', 'smart-home'],
    '{"quote_url": "http://localhost:3000/api/sellers/home-essentials"}'::jsonb,
    0.90
) ON CONFLICT (name) DO UPDATE SET api_config = EXCLUDED.api_config;

RAISE NOTICE '✅ All 10 sellers registered successfully!';

END $$;
npm