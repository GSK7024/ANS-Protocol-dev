-- Phase 17: Multi-Vertical & Dynamic Risk Schema

-- 1. Add Service Type & Trust Fields to Domains
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'travel',
ADD COLUMN IF NOT EXISTS stake_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'initiate', -- 'initiate' (Grey), 'adept' (Blue), 'master' (Gold)
ADD COLUMN IF NOT EXISTS pending_orders_count INTEGER DEFAULT 0;

-- 2. Create Verification Adapters Table
CREATE TABLE IF NOT EXISTS verification_adapters (
    category TEXT PRIMARY KEY,
    adapter_path TEXT NOT NULL,
    required_fields TEXT[]
);

-- 3. Seed Adapters
INSERT INTO verification_adapters (category, adapter_path, required_fields) VALUES
('travel', 'adapters/travel', ARRAY['pnr', 'passenger_name']),
('transport', 'adapters/transport', ARRAY['trip_id', 'driver_name']),
('ecommerce', 'adapters/ecommerce', ARRAY['order_id', 'tracking_url', 'delivery_photo']),
('hotel', 'adapters/hotel', ARRAY['booking_id', 'check_in_date'])
ON CONFLICT (category) DO NOTHING;

-- 4. Update Existing Agents
-- AirIndia/SkyJet -> Master (Gold)
UPDATE domains SET service_type = 'travel', trust_tier = 'master', stake_amount = 50 WHERE name IN ('airindia-test', 'skyjet-test');
-- ScamAir -> Initiate (Grey)
UPDATE domains SET service_type = 'travel', trust_tier = 'initiate', stake_amount = 0 WHERE name = 'scamair-test';

-- 5. Add "Transport" Agent (Uber) as 'Adept' (Blue)
INSERT INTO domains (name, owner_wallet, status, category, service_type, trust_score, trust_tier, stake_amount, api_config, payment_config)
VALUES (
    'uber-test', 
    'UberWalletAddressHere', 
    'active', 
    'transport', 
    'transport',
    4.8, 
    'adept', -- Starts at Tier 2 for demo purposes
    10, 
    '{
        "quote_url": "http://127.0.0.1:3000/api/testing/transport/quote", 
        "verify_url": "http://127.0.0.1:3000/api/testing/transport/verify",
        "api_key": "uber-secret-key"
    }',
    '{"solana_address": "UberPayoutAddress"}'
) ON CONFLICT (name) DO UPDATE SET 
    trust_tier = 'adept',
    service_type = 'transport',
    api_config = EXCLUDED.api_config,
    payment_config = EXCLUDED.payment_config;

