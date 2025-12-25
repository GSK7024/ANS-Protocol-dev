-- Enable RLS (if not already enabled)
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow Public Read Access
-- Everyone can see which domains are taken/reserved (Needed for Search & Dashboard)
DROP POLICY IF EXISTS "Public Read Access" ON domains;
CREATE POLICY "Public Read Access"
ON domains FOR SELECT
USING (true);

-- Policy 2: Allow Service Role to Insert/Update (Implicit, but good to know)
-- (Service Key bypasses RLS, so no explicit policy needed for it)

-- Policy 3: Allow Users to Update their OWN domains (Optional, for future)
-- CREATE POLICY "Users Update Own" ON domains FOR UPDATE
-- USING (auth.uid()::text = owner_wallet);
