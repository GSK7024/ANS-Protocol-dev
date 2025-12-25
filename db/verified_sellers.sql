-- Add Verified Seller Columns to Domains Table
-- This enables the "Blue Checkmark" system for trusted businesses

-- 1. Add verification columns
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS verification_tier TEXT DEFAULT 'none' 
CHECK (verification_tier IN ('none', 'bronze', 'silver', 'gold'));

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS kyb_data JSONB DEFAULT '{}';

-- 2. Index for fast verified seller lookups
CREATE INDEX IF NOT EXISTS idx_domains_verified ON domains(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_domains_verification_tier ON domains(verification_tier);

-- 3. Verification tier multipliers for ranking
-- gold = 2.0x boost
-- silver = 1.5x boost  
-- bronze = 1.2x boost
-- none = 1.0x (no boost)

COMMENT ON COLUMN domains.is_verified IS 'Whether the seller has passed KYB verification';
COMMENT ON COLUMN domains.verification_tier IS 'Tier level: gold (2x), silver (1.5x), bronze (1.2x), none (1x)';
COMMENT ON COLUMN domains.kyb_data IS 'Business verification data (business name, registration, etc)';
