-- ============================================================
-- NEXUSAIR COMPLETE DATABASE SCHEMA
-- A production-grade airline reservation system
-- ============================================================

-- ============================================================
-- 1. AIRPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS airports (
    code VARCHAR(3) PRIMARY KEY,  -- IATA code: DEL, BOM, BLR
    name TEXT NOT NULL,           -- Indira Gandhi International Airport
    city TEXT NOT NULL,           -- Delhi
    city_aliases TEXT[] DEFAULT '{}',  -- ["New Delhi", "NCR", "Dilli"]
    state TEXT,                   -- Delhi
    country VARCHAR(2) DEFAULT 'IN',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    terminals TEXT[] DEFAULT '{}',     -- ["T1", "T2", "T3"]
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    is_international BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for city search
CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(LOWER(city));
CREATE INDEX IF NOT EXISTS idx_airports_aliases ON airports USING GIN(city_aliases);

-- ============================================================
-- 2. AIRLINES
-- ============================================================
CREATE TABLE IF NOT EXISTS airlines (
    code VARCHAR(2) PRIMARY KEY,  -- NX, 6E, AI, SG
    name TEXT NOT NULL,           -- NexusAir
    full_name TEXT,              -- NexusAir Private Limited
    logo_url TEXT,
    website TEXT,
    rating DECIMAL(2, 1) DEFAULT 4.0,  -- 4.5
    total_reviews INTEGER DEFAULT 0,
    headquarters TEXT,
    founded_year INTEGER,
    fleet_size INTEGER DEFAULT 0,
    
    -- Policies
    baggage_policy JSONB DEFAULT '{
        "cabin": {"weight": 7, "pieces": 1},
        "checked": {"weight": 15, "pieces": 1, "free": true}
    }'::jsonb,
    
    cancellation_policy JSONB DEFAULT '{
        "refundable": true,
        "fee_percent": 10,
        "deadline_hours": 24
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. AIRCRAFT TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS aircraft_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(10) NOT NULL,   -- A320, B737, A380
    manufacturer TEXT,                 -- Airbus, Boeing
    model TEXT,                        -- A320neo
    
    -- Capacity
    seats_economy INTEGER DEFAULT 150,
    seats_premium_economy INTEGER DEFAULT 20,
    seats_business INTEGER DEFAULT 16,
    seats_first INTEGER DEFAULT 8,
    
    -- Config
    rows_economy INTEGER DEFAULT 25,
    seats_per_row_economy INTEGER DEFAULT 6,  -- 3-3 config
    rows_business INTEGER DEFAULT 4,
    seats_per_row_business INTEGER DEFAULT 4,  -- 2-2 config
    
    -- Amenities
    has_wifi BOOLEAN DEFAULT false,
    has_entertainment BOOLEAN DEFAULT true,
    has_power_outlets BOOLEAN DEFAULT true,
    
    -- Performance
    range_km INTEGER,
    cruise_speed_kmh INTEGER DEFAULT 850,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. ROUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    from_airport VARCHAR(3) REFERENCES airports(code),
    to_airport VARCHAR(3) REFERENCES airports(code),
    distance_km INTEGER NOT NULL,
    typical_duration_minutes INTEGER NOT NULL,  -- 130 for 2h 10m
    base_price_economy DECIMAL(10, 2) NOT NULL,
    base_price_business DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(from_airport, to_airport)
);

CREATE INDEX IF NOT EXISTS idx_routes_from ON routes(from_airport);
CREATE INDEX IF NOT EXISTS idx_routes_to ON routes(to_airport);

-- ============================================================
-- 5. FLIGHTS (Schedule Template)
-- ============================================================
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(10) NOT NULL,  -- NX-101
    airline_code VARCHAR(2) REFERENCES airlines(code),
    route_id INTEGER REFERENCES routes(id),
    aircraft_type_id INTEGER REFERENCES aircraft_types(id),
    
    -- Schedule
    departure_time TIME NOT NULL,  -- 06:00
    arrival_time TIME NOT NULL,    -- 08:10
    
    -- Operating days (1=Mon, 7=Sun)
    operates_on INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(flight_number, airline_code)
);

CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(route_id);
CREATE INDEX IF NOT EXISTS idx_flights_time ON flights(departure_time);

-- ============================================================
-- 6. FLIGHT INVENTORY (Per-Date Availability & Pricing)
-- ============================================================
CREATE TABLE IF NOT EXISTS flight_inventory (
    id SERIAL PRIMARY KEY,
    flight_id INTEGER REFERENCES flights(id),
    flight_date DATE NOT NULL,
    
    -- Economy Class
    economy_total INTEGER DEFAULT 150,
    economy_available INTEGER DEFAULT 150,
    economy_price DECIMAL(10, 2) NOT NULL,
    
    -- Business Class
    business_total INTEGER DEFAULT 16,
    business_available INTEGER DEFAULT 16,
    business_price DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'SCHEDULED',  -- SCHEDULED, DELAYED, CANCELLED, DEPARTED, ARRIVED
    delay_minutes INTEGER DEFAULT 0,
    
    -- Dynamic pricing factors applied
    pricing_factors JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(flight_id, flight_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_date ON flight_inventory(flight_date);
CREATE INDEX IF NOT EXISTS idx_inventory_flight ON flight_inventory(flight_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON flight_inventory(status);

-- ============================================================
-- 7. SEATS (Individual Seat Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES flight_inventory(id),
    
    -- Seat info
    seat_number VARCHAR(4) NOT NULL,  -- 12A, 1B
    row_number INTEGER NOT NULL,
    position VARCHAR(10) NOT NULL,    -- WINDOW, MIDDLE, AISLE
    
    -- Class
    class VARCHAR(20) DEFAULT 'ECONOMY',  -- ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
    
    -- Features
    is_emergency_row BOOLEAN DEFAULT false,
    extra_legroom BOOLEAN DEFAULT false,
    has_power BOOLEAN DEFAULT true,
    near_lavatory BOOLEAN DEFAULT false,
    near_galley BOOLEAN DEFAULT false,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,  -- Crew seats, etc.
    
    -- Extra charge (if any)
    extra_charge DECIMAL(10, 2) DEFAULT 0,
    
    -- Booking reference
    booking_id UUID,  -- NULL if available
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(inventory_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seats_inventory ON seats(inventory_id);
CREATE INDEX IF NOT EXISTS idx_seats_available ON seats(inventory_id) WHERE is_available = true;

-- ============================================================
-- 8. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS airline_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference numbers
    pnr VARCHAR(8) UNIQUE,  -- NX4K8M2P
    booking_ref VARCHAR(20),
    
    -- Flight details
    inventory_id INTEGER REFERENCES flight_inventory(id),
    flight_number VARCHAR(10),
    flight_date DATE,
    
    -- Counts
    passenger_count INTEGER DEFAULT 1,
    adult_count INTEGER DEFAULT 1,
    child_count INTEGER DEFAULT 0,
    infant_count INTEGER DEFAULT 0,
    
    -- Class
    booking_class VARCHAR(20) DEFAULT 'ECONOMY',
    
    -- Pricing
    base_fare DECIMAL(10, 2) NOT NULL,
    taxes DECIMAL(10, 2) DEFAULT 0,
    fees DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, PAID, REFUNDED, FAILED
    escrow_id UUID,  -- Link to ANS escrow
    payment_tx TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
    
    -- Contact
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Timestamps
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    booking_source VARCHAR(50) DEFAULT 'ANS',  -- ANS, WEBSITE, APP
    special_requests TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON airline_bookings(pnr);
CREATE INDEX IF NOT EXISTS idx_bookings_escrow ON airline_bookings(escrow_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON airline_bookings(flight_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON airline_bookings(status);

-- ============================================================
-- 9. PASSENGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES airline_bookings(id) ON DELETE CASCADE,
    
    -- Identity
    title VARCHAR(10),  -- Mr, Mrs, Ms, Dr, Master
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    
    -- Demographics
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(1),  -- M, F, O
    nationality VARCHAR(2) DEFAULT 'IN',
    
    -- Passenger type
    passenger_type VARCHAR(10) DEFAULT 'ADULT',  -- ADULT, CHILD, INFANT
    
    -- ID Document
    id_type VARCHAR(20),  -- PASSPORT, AADHAAR, PAN, DRIVING_LICENSE, VOTER_ID
    id_number TEXT,
    id_expiry DATE,
    id_issuing_country VARCHAR(2),
    
    -- Seat
    seat_number VARCHAR(4),
    seat_id INTEGER REFERENCES seats(id),
    
    -- Preferences
    meal_preference VARCHAR(20) DEFAULT 'NONE',  -- VEG, NON_VEG, VEGAN, JAIN, KOSHER, HALAL
    special_meal_note TEXT,
    
    -- Frequent flyer
    ff_number TEXT,
    ff_program TEXT,
    
    -- Special assistance
    special_assistance TEXT[],  -- WHEELCHAIR, BLIND, DEAF, UNACCOMPANIED_MINOR
    medical_requirements TEXT,
    
    -- Contact (for lead passenger)
    email TEXT,
    phone TEXT,
    
    -- Baggage
    baggage_allowance_kg INTEGER DEFAULT 15,
    extra_baggage_kg INTEGER DEFAULT 0,
    
    -- Status
    check_in_status VARCHAR(20) DEFAULT 'NOT_CHECKED_IN',  -- NOT_CHECKED_IN, CHECKED_IN, BOARDED
    boarding_pass_issued BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_passengers_name ON passengers(LOWER(first_name), LOWER(last_name));

-- ============================================================
-- 10. PRICING RULES (Dynamic Pricing)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_type VARCHAR(20) NOT NULL,  -- TIME, DEMAND, ADVANCE, DAY, ROUTE, SPECIAL
    
    -- Conditions (JSONB for flexibility)
    conditions JSONB NOT NULL,
    /* Examples:
       {"departure_time_after": "06:00", "departure_time_before": "09:00"}
       {"seats_available_less_than": 20}
       {"booking_days_before_less_than": 3}
       {"day_of_week_in": [6, 7]}  -- Weekend
       {"route_ids": [1, 5]}
       {"date_range": ["2024-12-25", "2024-12-31"]}  -- Holiday
    */
    
    -- Effect
    multiplier DECIMAL(4, 2) DEFAULT 1.0,  -- 1.2 = 20% increase
    flat_adjustment DECIMAL(10, 2) DEFAULT 0,  -- +500 or -200
    
    -- Priority (higher = applied first)
    priority INTEGER DEFAULT 0,
    
    -- Limits
    max_multiplier DECIMAL(4, 2) DEFAULT 2.0,
    min_multiplier DECIMAL(4, 2) DEFAULT 0.5,
    
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;

-- ============================================================
-- 11. BOOKING ADDONS
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_addons (
    id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES airline_bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES passengers(id),
    
    addon_type VARCHAR(50) NOT NULL,  -- MEAL, BAGGAGE, SEAT, INSURANCE, LOUNGE, PRIORITY_BOARDING
    addon_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 12. FARE RULES (Cancellation, Changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS fare_rules (
    id SERIAL PRIMARY KEY,
    fare_type VARCHAR(20) NOT NULL,  -- SAVER, FLEX, PREMIUM
    
    -- Cancellation
    is_refundable BOOLEAN DEFAULT true,
    cancellation_fee_percent DECIMAL(5, 2) DEFAULT 10,
    cancellation_deadline_hours INTEGER DEFAULT 24,
    
    -- Changes
    is_changeable BOOLEAN DEFAULT true,
    change_fee DECIMAL(10, 2) DEFAULT 500,
    
    -- Baggage
    cabin_baggage_kg INTEGER DEFAULT 7,
    checked_baggage_kg INTEGER DEFAULT 15,
    
    -- Seat selection
    free_seat_selection BOOLEAN DEFAULT false,
    
    -- Other
    priority_boarding BOOLEAN DEFAULT false,
    lounge_access BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Generate PNR
CREATE OR REPLACE FUNCTION generate_pnr()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'NX';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate PNR on booking confirmation
CREATE OR REPLACE FUNCTION set_booking_pnr()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CONFIRMED' AND NEW.pnr IS NULL THEN
        NEW.pnr := generate_pnr();
        NEW.confirmed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_pnr
    BEFORE UPDATE ON airline_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_pnr();

-- Update inventory on seat booking
CREATE OR REPLACE FUNCTION update_inventory_on_seat_book()
RETURNS TRIGGER AS $$
BEGIN
    -- When seat becomes unavailable
    IF OLD.is_available = true AND NEW.is_available = false THEN
        UPDATE flight_inventory
        SET economy_available = economy_available - 1,
            updated_at = NOW()
        WHERE id = NEW.inventory_id;
    END IF;
    
    -- When seat becomes available again (cancellation)
    IF OLD.is_available = false AND NEW.is_available = true THEN
        UPDATE flight_inventory
        SET economy_available = economy_available + 1,
            updated_at = NOW()
        WHERE id = NEW.inventory_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seat_inventory
    AFTER UPDATE ON seats
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_seat_book();
