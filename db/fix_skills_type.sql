-- FIX: The 'skills' column was created as text[], but we need jsonb for prices/inputs.
-- This script Drops and Re-adds the column.
-- WARNING: This deletes existing skills data (but the crawler will re-populate it).

ALTER TABLE domains 
  DROP COLUMN IF EXISTS skills;

ALTER TABLE domains 
  ADD COLUMN skills jsonb; 

-- Re-create the index for JSONB searching
DROP INDEX IF EXISTS idx_domains_skills;
CREATE INDEX idx_domains_skills ON domains USING gin (skills);
