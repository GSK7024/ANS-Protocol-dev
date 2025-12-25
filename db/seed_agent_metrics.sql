-- Seed agent_metrics with test data for SRT demo
-- Run after srt_reputation.sql migration

INSERT INTO agent_metrics (agent_name, total_transactions, successful_transactions, failed_transactions, stake_amount_sol, total_volume_sol, peer_feedback_score)
VALUES
    ('amazon-test', 50, 48, 2, 5.0, 250.0, 0.85),
    ('airindia-test', 100, 95, 5, 10.0, 500.0, 0.90),
    ('skyjet-test', 30, 28, 2, 2.0, 100.0, 0.70),
    ('oyo-test', 20, 18, 2, 1.0, 50.0, 0.60),
    ('irctc-test', 75, 70, 5, 8.0, 300.0, 0.80)
ON CONFLICT (agent_name) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    stake_amount_sol = EXCLUDED.stake_amount_sol,
    total_volume_sol = EXCLUDED.total_volume_sol,
    peer_feedback_score = EXCLUDED.peer_feedback_score;

-- Verify the data and SRT calculation
SELECT agent_name, srt_score, trust_tier, stake_amount_sol, total_volume_sol 
FROM agent_metrics 
ORDER BY srt_score DESC;
