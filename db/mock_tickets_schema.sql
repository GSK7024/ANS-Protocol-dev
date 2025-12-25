-- Mock Tickets Table for Airline Backend Testing
-- This provides persistent storage for issued tickets

CREATE TABLE IF NOT EXISTS mock_tickets (
    pnr TEXT PRIMARY KEY,
    passenger_name TEXT NOT NULL,
    passenger_age INTEGER,
    flight_id TEXT,
    flight_from TEXT,
    flight_to TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mock_tickets ENABLE ROW LEVEL SECURITY;

-- Allow full access for testing
CREATE POLICY "Public read/write for mock_tickets" ON mock_tickets FOR ALL USING (true);

-- Index for fast PNR lookups
CREATE INDEX IF NOT EXISTS idx_mock_tickets_pnr ON mock_tickets(pnr);
