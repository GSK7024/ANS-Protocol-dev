-- ============================================
-- Register REAL Seller Agents in ANS Database
-- Run in Supabase SQL Editor
-- ============================================

-- 1. AIR INDIA (Flight Booking)
INSERT INTO domains (
    name, 
    owner_wallet, 
    status, 
    category, 
    service_type,
    trust_score,
    trust_tier,
    is_verified,
    api_config,
    payment_config
)
VALUES (
    'airindia', 
    '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
    'active', 
    'airlines',
    'travel',
    4.8,
    'master',
    true,
    '{
        "quote_url": "https://ans-protocol.vercel.app/api/sellers/airindia",
        "book_url": "https://ans-protocol.vercel.app/api/sellers/airindia",
        "supported_actions": ["search", "book"],
        "required_fields": ["full_name", "date_of_birth", "passport_number", "email", "phone"]
    }'::jsonb,
    '{"solana_address": "6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv", "ans_fee_percent": 0.5}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET 
    status = 'active',
    category = 'airlines',
    service_type = 'travel',
    trust_score = 4.8,
    trust_tier = 'master',
    is_verified = true,
    api_config = EXCLUDED.api_config,
    payment_config = EXCLUDED.payment_config;

-- Add endpoint for Air India
INSERT INTO endpoints (domain_id, url, docs_url)
SELECT d.id, 
    'https://ans-protocol.vercel.app/api/sellers/airindia', 
    'https://ans-protocol.vercel.app/api/sellers/airindia'
FROM domains d WHERE d.name = 'airindia'
ON CONFLICT (domain_id) DO UPDATE SET url = EXCLUDED.url, docs_url = EXCLUDED.docs_url;


-- 2. MARRIOTT (Hotel Booking)
INSERT INTO domains (
    name, 
    owner_wallet, 
    status, 
    category, 
    service_type,
    trust_score,
    trust_tier,
    is_verified,
    api_config,
    payment_config
)
VALUES (
    'marriott', 
    '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
    'active', 
    'hotels',
    'hotel',
    4.9,
    'master',
    true,
    '{
        "quote_url": "https://ans-protocol.vercel.app/api/sellers/marriott",
        "book_url": "https://ans-protocol.vercel.app/api/sellers/marriott",
        "supported_actions": ["search", "book"],
        "required_fields": ["full_name", "email", "phone"]
    }'::jsonb,
    '{"solana_address": "6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv", "ans_fee_percent": 0.5}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET 
    status = 'active',
    category = 'hotels',
    service_type = 'hotel',
    trust_score = 4.9,
    trust_tier = 'master',
    is_verified = true,
    api_config = EXCLUDED.api_config,
    payment_config = EXCLUDED.payment_config;

-- Add endpoint for Marriott
INSERT INTO endpoints (domain_id, url, docs_url)
SELECT d.id, 
    'https://ans-protocol.vercel.app/api/sellers/marriott', 
    'https://ans-protocol.vercel.app/api/sellers/marriott'
FROM domains d WHERE d.name = 'marriott'
ON CONFLICT (domain_id) DO UPDATE SET url = EXCLUDED.url, docs_url = EXCLUDED.docs_url;


-- 3. FLIPKART (Shopping)
INSERT INTO domains (
    name, 
    owner_wallet, 
    status, 
    category, 
    service_type,
    trust_score,
    trust_tier,
    is_verified,
    api_config,
    payment_config
)
VALUES (
    'flipkart', 
    '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
    'active', 
    'shopping',
    'ecommerce',
    4.7,
    'master',
    true,
    '{
        "quote_url": "https://ans-protocol.vercel.app/api/sellers/flipkart",
        "book_url": "https://ans-protocol.vercel.app/api/sellers/flipkart",
        "supported_actions": ["search", "buy"],
        "required_fields": ["full_name", "address", "phone"]
    }'::jsonb,
    '{"solana_address": "6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv", "ans_fee_percent": 0.5}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET 
    status = 'active',
    category = 'shopping',
    service_type = 'ecommerce',
    trust_score = 4.7,
    trust_tier = 'master',
    is_verified = true,
    api_config = EXCLUDED.api_config,
    payment_config = EXCLUDED.payment_config;

-- Add endpoint for Flipkart
INSERT INTO endpoints (domain_id, url, docs_url)
SELECT d.id, 
    'https://ans-protocol.vercel.app/api/sellers/flipkart', 
    'https://ans-protocol.vercel.app/api/sellers/flipkart'
FROM domains d WHERE d.name = 'flipkart'
ON CONFLICT (domain_id) DO UPDATE SET url = EXCLUDED.url, docs_url = EXCLUDED.docs_url;


-- 4. Seller requirements (what personal data they need from vault)
INSERT INTO seller_requirements (seller_agent, required_fields, optional_fields, field_purposes)
VALUES 
('airindia', 
 ARRAY['full_name', 'date_of_birth', 'passport_number', 'email', 'phone'], 
 ARRAY['gender', 'nationality'], 
 '{"full_name": "Ticket name", "passport_number": "International travel", "email": "E-ticket delivery"}'::jsonb)
ON CONFLICT (seller_agent) DO UPDATE SET required_fields = EXCLUDED.required_fields;

INSERT INTO seller_requirements (seller_agent, required_fields, optional_fields, field_purposes)
VALUES 
('marriott', 
 ARRAY['full_name', 'email', 'phone'], 
 ARRAY['address'], 
 '{"full_name": "Reservation name", "email": "Confirmation", "phone": "Contact"}'::jsonb)
ON CONFLICT (seller_agent) DO UPDATE SET required_fields = EXCLUDED.required_fields;

INSERT INTO seller_requirements (seller_agent, required_fields, optional_fields, field_purposes)
VALUES 
('flipkart', 
 ARRAY['full_name', 'address', 'phone'], 
 ARRAY['email'], 
 '{"full_name": "Delivery", "address": "Shipping", "phone": "Delivery updates"}'::jsonb)
ON CONFLICT (seller_agent) DO UPDATE SET required_fields = EXCLUDED.required_fields;


-- ============================================
-- VERIFY REGISTRATIONS
-- ============================================
SELECT 
    d.name as agent,
    d.category,
    d.service_type,
    d.trust_tier,
    d.trust_score,
    d.is_verified,
    e.url as api_endpoint,
    d.api_config->>'supported_actions' as actions
FROM domains d 
LEFT JOIN endpoints e ON e.domain_id = d.id 
WHERE d.name IN ('airindia', 'marriott', 'flipkart');
