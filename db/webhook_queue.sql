-- Webhook Queue Table
-- Used for reliable webhook delivery with retry support

CREATE TABLE IF NOT EXISTS webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Webhook details
    url TEXT NOT NULL,
    method TEXT DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    payload JSONB NOT NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Results
    response_status INTEGER,
    last_error TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Context
    escrow_id UUID REFERENCES escrow_transactions(id),
    webhook_type TEXT, -- booking, payment, delivery, refund
    
    -- Index for efficient queries
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Index for cron job queries
CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending 
ON webhook_queue(status, next_retry_at) 
WHERE status = 'pending';

-- Index for escrow lookup
CREATE INDEX IF NOT EXISTS idx_webhook_queue_escrow 
ON webhook_queue(escrow_id);

-- Add refund tracking columns to escrow_transactions if not exists
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS refund_tx TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_refund_attempt TIMESTAMP WITH TIME ZONE;

-- Grant access
GRANT ALL ON webhook_queue TO authenticated;
GRANT ALL ON webhook_queue TO anon;
