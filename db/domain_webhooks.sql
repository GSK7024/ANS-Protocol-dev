-- Domain Webhooks Configuration Table
-- Stores webhook endpoints for each domain/seller

CREATE TABLE IF NOT EXISTS domain_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL REFERENCES domains(name) ON DELETE CASCADE,
    
    -- Endpoint configuration
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',  -- Array of event types to subscribe to
    secret TEXT NOT NULL,                  -- Webhook signing secret (whsec_xxx)
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one URL per domain
    UNIQUE(domain_name, url)
);

-- Index for quick lookup by domain
CREATE INDEX IF NOT EXISTS idx_domain_webhooks_domain 
ON domain_webhooks(domain_name) WHERE active = TRUE;

-- Enable RLS
ALTER TABLE domain_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Domain owners can manage their webhooks
CREATE POLICY "Domain owners can view their webhooks"
ON domain_webhooks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM domains d 
        WHERE d.name = domain_webhooks.domain_name 
        AND d.owner_wallet = auth.jwt() ->> 'wallet_address'
    )
);

CREATE POLICY "Domain owners can insert webhooks"
ON domain_webhooks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM domains d 
        WHERE d.name = domain_webhooks.domain_name 
        AND d.owner_wallet = auth.jwt() ->> 'wallet_address'
    )
);

CREATE POLICY "Domain owners can update webhooks"
ON domain_webhooks FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM domains d 
        WHERE d.name = domain_webhooks.domain_name 
        AND d.owner_wallet = auth.jwt() ->> 'wallet_address'
    )
);

CREATE POLICY "Domain owners can delete webhooks"
ON domain_webhooks FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM domains d 
        WHERE d.name = domain_webhooks.domain_name 
        AND d.owner_wallet = auth.jwt() ->> 'wallet_address'
    )
);

-- For service role access (bypass RLS for backend)
GRANT ALL ON domain_webhooks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_webhooks TO authenticated;

-- Function to trigger webhooks when escrow events occur
CREATE OR REPLACE FUNCTION notify_domain_webhooks()
RETURNS TRIGGER AS $$
DECLARE
    webhook_record RECORD;
    event_type TEXT;
BEGIN
    -- Determine event type based on status change
    IF TG_OP = 'INSERT' THEN
        event_type := 'escrow.created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'locked' AND OLD.status != 'locked' THEN
            event_type := 'escrow.locked';
        ELSIF NEW.status = 'released' AND OLD.status != 'released' THEN
            event_type := 'escrow.released';
        ELSIF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
            event_type := 'escrow.refunded';
        ELSE
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    -- Find active webhooks for this seller that subscribe to this event
    FOR webhook_record IN
        SELECT dw.* FROM domain_webhooks dw
        WHERE dw.domain_name = NEW.seller_agent
        AND dw.active = TRUE
        AND event_type = ANY(dw.events)
    LOOP
        -- Queue webhook for delivery
        INSERT INTO webhook_queue (
            url,
            method,
            payload,
            webhook_type,
            escrow_id,
            headers
        ) VALUES (
            webhook_record.url,
            'POST',
            jsonb_build_object(
                'event', event_type,
                'escrow_id', NEW.id,
                'seller_agent', NEW.seller_agent,
                'buyer_wallet', NEW.buyer_wallet,
                'amount', NEW.amount,
                'status', NEW.status,
                'timestamp', NOW()
            ),
            event_type,
            NEW.id,
            jsonb_build_object(
                'X-ANS-Webhook-Secret', webhook_record.secret,
                'X-ANS-Event', event_type
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically queue webhooks on escrow changes
DROP TRIGGER IF EXISTS trigger_escrow_webhooks ON escrow_transactions;
CREATE TRIGGER trigger_escrow_webhooks
AFTER INSERT OR UPDATE ON escrow_transactions
FOR EACH ROW EXECUTE FUNCTION notify_domain_webhooks();

SELECT 'Domain webhooks table and triggers created successfully!' as result;
