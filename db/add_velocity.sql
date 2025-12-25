-- PHASE 9: THE VELOCITY UPDATE
-- We track 'daily_volume' (Tx per day) to allow new agents to rise up.

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS daily_volume INTEGER DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN domains.daily_volume IS 'Number of successful transactions in the last 24 hours. Used for Velocity Ranking.';
