-- Abuse Logs Table for Security Monitoring
-- Tracks rate limit violations and auto-bans

CREATE TABLE IF NOT EXISTS abuse_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'wallet')),
    violation_count INT NOT NULL,
    action_taken TEXT NOT NULL CHECK (action_taken IN ('warning', 'auto_ban', 'manual_ban', 'permanent_ban')),
    ban_expires_at TIMESTAMP WITH TIME ZONE,
    reviewed BOOLEAN DEFAULT false,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_abuse_identifier ON abuse_logs(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_abuse_unreviewed ON abuse_logs(reviewed) WHERE reviewed = false;

-- Enable RLS
ALTER TABLE abuse_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON abuse_logs FOR ALL USING (true);

-- Audit Logs Table for all actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    actor_wallet TEXT,
    actor_ip_hash TEXT, -- SHA256 of IP for privacy
    target_entity TEXT,
    target_id TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    request_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_wallet);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_entity, target_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON audit_logs FOR ALL USING (true);

COMMENT ON TABLE abuse_logs IS 'Security monitoring for rate limit violations and bans';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all system actions';
