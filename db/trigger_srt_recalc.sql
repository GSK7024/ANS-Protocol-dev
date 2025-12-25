-- Trigger SRT recalculation for all agents
-- Run this after seeding to update srt_score values

UPDATE agent_metrics SET updated_at = NOW();

-- Verify the recalculated scores
SELECT agent_name, srt_score, trust_tier, stake_amount_sol, total_volume_sol, peer_feedback_score
FROM agent_metrics 
ORDER BY srt_score DESC;
