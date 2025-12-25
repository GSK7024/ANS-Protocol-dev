-- Add payment_signature column to domains table to prevent replay attacks
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS payment_signature TEXT UNIQUE;

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_domains_payment_signature ON domains(payment_signature);
