-- Domain Expiry System Migration
-- Adds expires_at column for yearly renewal like DNS

DO $$ 
BEGIN
    -- Add expires_at if not exists (default 1 year from now for new domains)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'expires_at') THEN
        ALTER TABLE domains ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year');
    END IF;

    -- Add renewal_count to track how many times renewed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'renewal_count') THEN
        ALTER TABLE domains ADD COLUMN renewal_count INT DEFAULT 0;
    END IF;

    -- Add last_renewed_at timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domains' AND column_name = 'last_renewed_at') THEN
        ALTER TABLE domains ADD COLUMN last_renewed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update existing domains to have 1 year from their creation date
UPDATE domains 
SET expires_at = created_at + INTERVAL '1 year'
WHERE expires_at IS NULL AND created_at IS NOT NULL;

-- Create index for faster expiry queries
CREATE INDEX IF NOT EXISTS idx_domains_expires_at ON domains(expires_at);
-- Note: Partial indexes with NOW() are not allowed (not immutable)
-- Query expiring domains using: WHERE expires_at < NOW() + INTERVAL '30 days'

-- Function to check if domain is expired
CREATE OR REPLACE FUNCTION is_domain_expired(domain_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM domains 
        WHERE name = domain_name 
        AND expires_at < NOW()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get days until expiry
CREATE OR REPLACE FUNCTION days_until_expiry(domain_name TEXT)
RETURNS INT AS $$
DECLARE
    expiry_date TIMESTAMPTZ;
BEGIN
    SELECT expires_at INTO expiry_date FROM domains WHERE name = domain_name;
    IF expiry_date IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN EXTRACT(DAY FROM (expiry_date - NOW()));
END;
$$ LANGUAGE plpgsql;
