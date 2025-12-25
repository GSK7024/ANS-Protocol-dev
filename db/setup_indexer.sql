-- Comprehensive Schema Update for the Indexer
-- We need to store everything the crawler finds so the AI can search it.

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS skills jsonb,       -- Stores the detailed skill objects (with pricing)
ADD COLUMN IF NOT EXISTS peers text[],       -- For viral discovery
ADD COLUMN IF NOT EXISTS payment_config jsonb, -- For transaction configuration
ADD COLUMN IF NOT EXISTS last_crawled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trust_score numeric default 0.0;

-- Create an index on skills to allowing searching inside the JSONB (Advanced)
-- This allows query like: select * from domains where skills @> '[{"name": "book_flight"}]'
CREATE INDEX IF NOT EXISTS idx_domains_skills ON domains USING gin (skills);
CREATE INDEX IF NOT EXISTS idx_domains_tags ON domains USING gin (tags);
