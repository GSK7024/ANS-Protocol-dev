-- Economic Tiers Migration
-- Adds stake_amount and transaction_limit to domains table

DO $$ 
BEGIN
    -- Add stake_amount if not exists (default 0)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'stake_amount') THEN
        ALTER TABLE domains ADD COLUMN stake_amount NUMERIC DEFAULT 0;
    END IF;

    -- Add transaction_limit if not exists (default 100 for legacy/micro)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'transaction_limit') THEN
        ALTER TABLE domains ADD COLUMN transaction_limit NUMERIC DEFAULT 100;
    END IF;

    -- Add tier column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'tier') THEN
        ALTER TABLE domains ADD COLUMN tier TEXT DEFAULT 'micro';
    END IF;
END $$;

-- Update existing records to logical defaults based on name length or existing data
-- (Optional: Promoting 'brand' agents to 'premium' if we had a way to distinguish them, 
--  but for now default to 'micro'/100 limit to be safe and force upgrades)

-- Create index for faster lookups on tier/staking
CREATE INDEX IF NOT EXISTS idx_domains_tier ON domains(tier);
CREATE INDEX IF NOT EXISTS idx_domains_stake ON domains(stake_amount);
