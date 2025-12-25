-- Add is_genesis column to domains table
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS is_genesis BOOLEAN DEFAULT FALSE;

-- Update existing records if needed (optional)
-- UPDATE domains SET is_genesis = FALSE WHERE is_genesis IS NULL;
