-- Add metadata columns to the domains table
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS category text DEFAULT 'uncategorized',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Ensure RLS allows updates to these columns (already covered by unrestricted update policy if flexible, but good to note)
-- The existing policy "Enable update for users based on owner_id" naturally covers these new columns.
