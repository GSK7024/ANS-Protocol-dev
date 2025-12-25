-- Add network column to domains table for Mainnet/Devnet separation
-- This migration supports the "Two Worlds" architecture

-- 1. Add network column to domains
ALTER TABLE domains ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet' CHECK (network IN ('mainnet', 'devnet'));

-- 2. Add network column to agent_metrics
ALTER TABLE agent_metrics ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet' CHECK (network IN ('mainnet', 'devnet'));

-- 3. Add network column to escrow_transactions
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'mainnet' CHECK (network IN ('mainnet', 'devnet'));

-- 4. Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_domains_network ON domains(network);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_network ON agent_metrics(network);
CREATE INDEX IF NOT EXISTS idx_escrow_network ON escrow_transactions(network);

-- 5. Update existing domains to be mainnet (they were created before devnet existed)
UPDATE domains SET network = 'mainnet' WHERE network IS NULL;
UPDATE agent_metrics SET network = 'mainnet' WHERE network IS NULL;

-- Note: presale_purchases table does NOT need network column
-- Presale is MAINNET ONLY - this ensures token economics are protected
