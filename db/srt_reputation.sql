-- Sybil-Resistant Trust (SRT) Reputation System Schema
-- Migration to add dynamic reputation tracking

-- 1. Extend agent_metrics with new reputation factors
ALTER TABLE agent_metrics
ADD COLUMN IF NOT EXISTS stake_amount_sol DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_volume_sol DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS peer_feedback_score DECIMAL DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS srt_score DECIMAL DEFAULT 50,
ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'initiate';

-- 2. Create agent_reviews table for peer feedback
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_agent TEXT NOT NULL,
    reviewed_agent TEXT NOT NULL,
    escrow_id UUID REFERENCES escrow_transactions(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reviewer_srt_at_time DECIMAL, -- Weight their vote by their own SRT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escrow_id, reviewer_agent) -- One review per transaction per agent
);

-- 3. Trust tier definitions
COMMENT ON COLUMN agent_metrics.trust_tier IS 'initiate | adept | master | sovereign';

-- Tier thresholds:
-- initiate: SRT 0-40
-- adept: SRT 40-70
-- master: SRT 70-90
-- sovereign: SRT 90+

-- 4. Function to calculate SRT score
CREATE OR REPLACE FUNCTION calculate_srt_score(agent TEXT)
RETURNS DECIMAL AS $$
DECLARE
    stake DECIMAL;
    perf DECIMAL;
    feedback DECIMAL;
    volume DECIMAL;
    srt DECIMAL;
BEGIN
    SELECT 
        COALESCE(stake_amount_sol, 0),
        CASE 
            WHEN COALESCE(total_transactions, 0) = 0 THEN 0.5
            ELSE COALESCE(successful_transactions, 0)::DECIMAL / total_transactions::DECIMAL
        END,
        COALESCE(peer_feedback_score, 0.5),
        COALESCE(total_volume_sol, 0)
    INTO stake, perf, feedback, volume
    FROM agent_metrics WHERE agent_name = agent;

    -- Normalize factors to 0-100 scale
    -- Stake: 10 SOL = 100 points (capped)
    stake := LEAST(stake * 10, 100);
    -- Performance: 0-1 -> 0-100
    perf := perf * 100;
    -- Feedback: 0-1 -> 0-100
    feedback := feedback * 100;
    -- Volume: 100 SOL = 100 points (capped)
    volume := LEAST(volume, 100);

    -- Weighted sum (40% stake, 30% perf, 20% feedback, 10% volume)
    srt := (0.40 * stake) + (0.30 * perf) + (0.20 * feedback) + (0.10 * volume);

    RETURN srt;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get tier from SRT
CREATE OR REPLACE FUNCTION get_trust_tier(srt DECIMAL)
RETURNS TEXT AS $$
BEGIN
    IF srt >= 90 THEN RETURN 'sovereign';
    ELSIF srt >= 70 THEN RETURN 'master';
    ELSIF srt >= 40 THEN RETURN 'adept';
    ELSE RETURN 'initiate';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to recalculate SRT after metric updates
CREATE OR REPLACE FUNCTION update_srt_on_metric_change()
RETURNS TRIGGER AS $$
DECLARE
    new_srt DECIMAL;
    new_tier TEXT;
BEGIN
    new_srt := calculate_srt_score(NEW.agent_name);
    new_tier := get_trust_tier(new_srt);

    NEW.srt_score := new_srt;
    NEW.trust_tier := new_tier;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_srt ON agent_metrics;
CREATE TRIGGER trg_update_srt
BEFORE UPDATE ON agent_metrics
FOR EACH ROW
EXECUTE FUNCTION update_srt_on_metric_change();

-- 7. Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_srt_score ON agent_metrics(srt_score DESC);

-- 8. RLS for agent_reviews
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for reviews" ON agent_reviews FOR SELECT USING (true);
CREATE POLICY "Service role write for reviews" ON agent_reviews FOR ALL USING (true);

COMMENT ON TABLE agent_reviews IS 'Peer-to-peer agent reviews weighted by reviewer SRT';
