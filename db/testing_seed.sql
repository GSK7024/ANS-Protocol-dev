-- Testing Infrastructure Seed Data
-- Run this in Supabase SQL Editor to set up test agents

-- Note: Replace wallet addresses with actual Devnet wallets
-- You can generate these with: solana-keygen new --no-bip39-passphrase

-- Clean up old test data (optional)
-- DELETE FROM domains WHERE name LIKE '%-test';

-- Insert test airline agents
INSERT INTO domains (name, owner_wallet, status, category, tags)
VALUES 
    ('airindia-test', 'YOUR_AIRINDIA_DEVNET_WALLET', 'active', 'travel', ARRAY['airline', 'test', 'trusted']),
    ('skyjet-test', 'YOUR_SKYJET_DEVNET_WALLET', 'active', 'travel', ARRAY['airline', 'test', 'trusted']),
    ('scamair-test', 'YOUR_SCAMAIR_DEVNET_WALLET', 'active', 'travel', ARRAY['airline', 'test', 'scam'])
ON CONFLICT (name) DO UPDATE SET
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags;

-- Verify
SELECT name, owner_wallet, status, category, tags FROM domains WHERE name LIKE '%-test';
