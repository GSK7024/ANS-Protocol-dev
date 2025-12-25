-- Phase 16: Zero-Trust Verification Configuration (IPv4 Fix)

-- 1. Configure AirIndia Test Agent with Verification URL (Using 127.0.0.1)
UPDATE domains 
SET api_config = jsonb_set(
    jsonb_set(
        api_config, 
        '{verify_url}', 
        '"http://127.0.0.1:3000/api/testing/airlines/backend"'
    ),
    '{api_key}', 
    '"backend-key-secret"'
)
WHERE name = 'airindia-test';

-- 2. Verify configuration
SELECT name, api_config->>'verify_url' as verify_url FROM domains WHERE name = 'airindia-test';
