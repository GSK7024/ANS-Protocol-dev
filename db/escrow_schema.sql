-- NEXUS Escrow Protocol Schema
-- Phase 13: Agent-to-Agent Commerce

-- Escrow Transactions Table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parties
    buyer_wallet TEXT NOT NULL,          -- Solana address of buyer
    seller_agent TEXT NOT NULL,          -- agent://airindia (domain name)
    seller_wallet TEXT,                  -- Resolved Solana address of seller
    
    -- Financials
    amount DECIMAL(20, 9) NOT NULL,      -- SOL amount (up to 9 decimals)
    fee DECIMAL(20, 9) DEFAULT 0,        -- 0.0005% platform fee
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Created, awaiting payment
        'locked',       -- SOL received in vault
        'confirmed',    -- Seller submitted proof
        'released',     -- Funds sent to seller
        'refunded',     -- Funds returned to buyer
        'disputed',     -- Under review
        'expired'       -- Timed out
    )),
    
    -- Transaction Details
    service_details JSONB NOT NULL,      -- What was purchased (flight, etc.)
    proof_of_delivery JSONB,             -- Confirmation from seller
    
    -- Blockchain References
    lock_tx_signature TEXT,              -- TX when buyer paid
    release_tx_signature TEXT,           -- TX when seller received
    refund_tx_signature TEXT,            -- TX if refunded
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    locked_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    notes TEXT
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_transactions(seller_agent);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_expires ON escrow_transactions(expires_at);

-- RLS Policies
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own escrows
CREATE POLICY "Buyers can view own escrows" ON escrow_transactions
    FOR SELECT USING (true);  -- Public read for MVP, restrict later

-- Service role can do everything
CREATE POLICY "Service role full access" ON escrow_transactions
    FOR ALL USING (true);

-- Function to calculate fee (0.0005%)
CREATE OR REPLACE FUNCTION calculate_escrow_fee(amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN amount * 0.000005;  -- 0.0005%
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE escrow_transactions IS 'NEXUS Escrow Protocol - Trustless Agent Commerce';
