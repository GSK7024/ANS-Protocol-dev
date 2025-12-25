-- Add skills column to the domains table
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
