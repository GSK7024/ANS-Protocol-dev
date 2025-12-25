-- Table to track valid payments that failed to Result in a domain mint (Potential Refunds)
CREATE TABLE IF NOT EXISTS failed_transactions (
    signature TEXT PRIMARY KEY, -- The Tx Signature is the unique ID
    wallet_address TEXT NOT NULL,
    domain_attempted TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    error_reason TEXT,
    refund_status TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending', 'processing', 'refunded', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Only admins (service role) should really touch this, but users could theoretically view their own?
-- For now, keep it restricted.
ALTER TABLE failed_transactions ENABLE ROW LEVEL SECURITY;

-- No public policies (Admin only by default)
