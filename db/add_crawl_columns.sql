-- Add new columns to store crawled metadata
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS peers text[], -- Array of peer URLs
ADD COLUMN IF NOT EXISTS payment_config jsonb; -- Payment details (address, tokens)

-- Allow full-text search on peers/payment if needed (optional for now)
