-- PHASE 8: THE SHIELD (Audit & Security)

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL, -- 'SEARCH', 'CRAWL', 'QUOTE', 'BOOK', 'ERROR'
    actor_id TEXT, -- The Agent or User IP who initiated the action
    target_id TEXT, -- The Agent being interacted with
    metadata JSONB, -- Details (e.g. search query, price quoted, error message)
    risk_score FLOAT DEFAULT 0.0 -- 0.0 = Safe, 1.0 = High Risk (Spam/Attack)
);

-- 2. Enable RLS (Read-only for public, Write for System)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert logs" ON audit_logs
    FOR INSERT WITH CHECK (true); -- Ideally restricted to service role, but for demo allowing inserts

CREATE POLICY "Admins can view logs" ON audit_logs
    FOR SELECT USING (true);

-- 3. Create Index for fast forensics
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_event ON audit_logs(event_type);
