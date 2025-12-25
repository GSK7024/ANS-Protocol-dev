-- Migration: Add fulfillment and verification columns to escrow_transactions
-- Run this in Supabase SQL Editor

-- Add fulfillment_data column (stores seller's ticket response)
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS fulfillment_data JSONB;

-- Add verification columns
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS verification_data JSONB;

ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add seller_received and platform_fee_collected for tracking
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS seller_received DECIMAL(20, 9);

ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS platform_fee_collected DECIMAL(20, 9);

ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update status CHECK constraint to include new statuses
ALTER TABLE escrow_transactions 
DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE escrow_transactions 
ADD CONSTRAINT escrow_transactions_status_check 
CHECK (status IN (
    'pending',      -- Created, awaiting payment
    'locked',       -- SOL received in vault
    'verified',     -- Booking verified NEW
    'confirmed',    -- Seller submitted proof
    'released',     -- Funds sent to seller
    'refunded',     -- Funds returned to buyer
    'disputed',     -- Under review
    'dispute',      -- Under review (alias) NEW
    'release_failed', -- Transfer failed NEW
    'expired'       -- Timed out
));

-- Done!
SELECT 'Migration complete! escrow_transactions updated with fulfillment and verification columns.' as result;
