-- Agent Vault System - Privacy-Preserving Identity Layer
-- Stores encrypted personal data linked to WALLET ADDRESS (not per-agent)
-- One wallet = One vault = Shared across all agents owned by that wallet

-- 1. User's Personal Data Vault (encrypted)
-- NOTE: ONE vault per WALLET (not per agent!)
-- All agents owned by a wallet share the same personal data
CREATE TABLE IF NOT EXISTS account_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_wallet TEXT UNIQUE NOT NULL,     -- Primary key is WALLET, not agent
    
    -- Encrypted personal data (AES-256-GCM)
    encrypted_data BYTEA NOT NULL,
    
    -- For integrity verification
    data_hash TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,           -- Initialization vector for AES
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seller Field Requirements
-- What personal data each seller agent needs for bookings
CREATE TABLE IF NOT EXISTS seller_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_agent TEXT NOT NULL UNIQUE,     -- agent://airindia
    required_fields TEXT[] NOT NULL,       -- ['full_name', 'passport_number']
    optional_fields TEXT[] DEFAULT '{}',
    field_purposes JSONB DEFAULT '{}',     -- Why each field is needed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vault Access Audit Log
-- Who accessed what data, when, and why
CREATE TABLE IF NOT EXISTS vault_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_wallet TEXT NOT NULL,            -- Whose data was accessed (wallet address)
    accessor_agent TEXT NOT NULL,          -- Which seller agent accessed it
    fields_accessed TEXT[] NOT NULL,       -- Which fields
    purpose TEXT,                          -- 'flight_booking', 'kyc_verification'
    escrow_id UUID,                        -- Link to transaction if applicable
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Standard Field Definitions
-- Pre-defined field types that sellers can request
CREATE TABLE IF NOT EXISTS vault_field_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,                -- 'personal', 'travel', 'india_id', 'contact'
    display_name TEXT NOT NULL,
    description TEXT,
    validation_regex TEXT,                 -- Optional regex for validation
    is_sensitive BOOLEAN DEFAULT true
);

-- Insert standard field types
INSERT INTO vault_field_types (field_name, category, display_name, description, is_sensitive) VALUES
    -- Personal
    ('full_name', 'personal', 'Full Name', 'Legal full name as per documents', false),
    ('date_of_birth', 'personal', 'Date of Birth', 'YYYY-MM-DD format', true),
    ('gender', 'personal', 'Gender', 'Male/Female/Other', false),
    ('nationality', 'personal', 'Nationality', 'Country of citizenship', false),
    
    -- Contact
    ('email', 'contact', 'Email Address', 'Primary email', true),
    ('phone', 'contact', 'Phone Number', 'With country code', true),
    ('address', 'contact', 'Full Address', 'Residential address', true),
    
    -- Travel Documents
    ('passport_number', 'travel', 'Passport Number', 'Valid passport number', true),
    ('passport_expiry', 'travel', 'Passport Expiry', 'YYYY-MM-DD format', true),
    ('passport_country', 'travel', 'Passport Country', 'Issuing country', false),
    ('visa_type', 'travel', 'Visa Type', 'Tourist/Business/Work etc', false),
    
    -- National/Government IDs (Global)
    ('national_id', 'government_id', 'National ID Number', 'SSN (US), NIN (UK), Aadhaar (IN), etc.', true),
    ('tax_id', 'government_id', 'Tax ID', 'SSN (US), PAN (IN), TIN, VAT number', true),
    ('driving_license', 'government_id', 'Driving License', 'License number with country', true),
    ('resident_permit', 'government_id', 'Resident Permit', 'For non-citizens', true),
    
    -- Payment
    ('billing_address', 'payment', 'Billing Address', 'For invoicing', true),
    ('tax_number', 'payment', 'Business Tax Number', 'GST (IN), VAT (EU), EIN (US)', true)
ON CONFLICT (field_name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vaults_wallet ON account_vaults(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_access_log_vault ON vault_access_log(vault_wallet);
CREATE INDEX IF NOT EXISTS idx_access_log_time ON vault_access_log(accessed_at DESC);

-- RLS Policies
ALTER TABLE account_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON account_vaults FOR ALL USING (true);
CREATE POLICY "Service role full access" ON vault_access_log FOR ALL USING (true);

COMMENT ON TABLE account_vaults IS 'Encrypted personal data vaults linked to wallet address (one vault per account)';
COMMENT ON TABLE seller_requirements IS 'Fields each seller needs for transactions';
COMMENT ON TABLE vault_access_log IS 'Audit trail of who accessed what personal data';
COMMENT ON TABLE vault_access_log IS 'Audit trail of who accessed what personal data';
