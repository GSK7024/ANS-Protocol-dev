-- ============================================
-- NEXUS Account Vault System - Fresh Install
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- STEP 1: Drop tables (CASCADE handles indexes and policies automatically)
DROP TABLE IF EXISTS vault_access_log CASCADE;
DROP TABLE IF EXISTS account_vaults CASCADE;
DROP TABLE IF EXISTS agent_vaults CASCADE;

-- STEP 2: Create account_vaults table
CREATE TABLE account_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_wallet TEXT UNIQUE NOT NULL,
    encrypted_data BYTEA NOT NULL,
    data_hash TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Create vault_access_log table
CREATE TABLE vault_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_wallet TEXT NOT NULL,
    accessor_agent TEXT NOT NULL,
    fields_accessed TEXT[] NOT NULL,
    purpose TEXT,
    escrow_id UUID,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create indexes
CREATE INDEX idx_vaults_wallet ON account_vaults(owner_wallet);
CREATE INDEX idx_access_log_wallet ON vault_access_log(vault_wallet);
CREATE INDEX idx_access_log_time ON vault_access_log(accessed_at DESC);

-- STEP 5: Enable RLS and create policies
ALTER TABLE account_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_service_access" ON account_vaults FOR ALL USING (true);
CREATE POLICY "log_service_access" ON vault_access_log FOR ALL USING (true);

-- DONE! ✅
