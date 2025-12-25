-- Phase 20: Add Mock Agents for Multi-Vertical Testing
-- Run in Supabase SQL Editor

-- IRCTC (Indian Railways - Trains)
INSERT INTO domains (name, owner_wallet, status, category, service_type, trust_score, trust_tier, stake_amount, api_config, payment_config)
VALUES (
    'irctc-test', 
    'IRCTCWalletAddress', 
    'active', 
    'travel', 
    'travel',
    4.5, 
    'adept',
    5, 
    '{"quote_url": "http://127.0.0.1:3000/api/testing/flights", "verify_url": "http://127.0.0.1:3000/api/testing/airlines/backend"}',
    '{"solana_address": "IRCTCPayoutAddress"}'
) ON CONFLICT (name) DO UPDATE SET trust_tier = 'adept', service_type = 'travel';

-- Amazon (E-commerce)
INSERT INTO domains (name, owner_wallet, status, category, service_type, trust_score, trust_tier, stake_amount, api_config, payment_config)
VALUES (
    'amazon-test', 
    'AmazonWalletAddress', 
    'active', 
    'ecommerce', 
    'ecommerce',
    4.9, 
    'master',
    100, 
    '{"quote_url": "http://127.0.0.1:3000/api/testing/ecommerce/quote", "verify_url": "http://127.0.0.1:3000/api/testing/airlines/backend"}',
    '{"solana_address": "AmazonPayoutAddress"}'
) ON CONFLICT (name) DO UPDATE SET trust_tier = 'master', service_type = 'ecommerce';

-- OYO (Hotels)
INSERT INTO domains (name, owner_wallet, status, category, service_type, trust_score, trust_tier, stake_amount, api_config, payment_config)
VALUES (
    'oyo-test', 
    'OYOWalletAddress', 
    'active', 
    'hotel', 
    'hotel',
    4.2, 
    'initiate',
    0.1, 
    '{"quote_url": "http://127.0.0.1:3000/api/testing/hotel/quote", "verify_url": "http://127.0.0.1:3000/api/testing/airlines/backend"}',
    '{"solana_address": "OYOPayoutAddress"}'
) ON CONFLICT (name) DO UPDATE SET trust_tier = 'initiate', service_type = 'hotel';

-- Verify
SELECT name, category, service_type, trust_tier, trust_score FROM domains WHERE name LIKE '%-test';
