
-- Register Mock Hotel Agent
INSERT INTO domains (
    name, 
    owner_wallet, 
    status, 
    category, 
    tags, 
    skills,
    marketplace_status,
    list_price,
    api_config,
    endpoints
) VALUES (
    'grand-hotel', 
    'HotelWalletAddressMOCK123456789', -- Mock Seller Wallet
    'active', 
    'Travel', 
    ARRAY['hotel', 'luxury', 'tokyo', 'accommodation'], 
    '[
        {"name": "Room Booking", "description": "Book luxury rooms", "pricing": {"amount": 1.5, "currency": "SOL"}},
        {"name": "Concierge", "description": "24/7 AI Service"}
    ]'::jsonb,
    'active',
    500.0, -- Sell price of the agent domain itself (optional)
    '{
        "quote_url": "http://localhost:3000/api/sellers/hotel", 
        "verify_url": "http://localhost:3000/api/sellers/hotel",
        "api_key": "mock-hotel-key"
    }'::jsonb, -- Using same local route for simplicity acting as the external API
    NULL
) ON CONFLICT (name) DO UPDATE SET 
    api_config = EXCLUDED.api_config,
    skills = EXCLUDED.skills;
