-- ============================================================
-- NEXUSAIR SEED DATA
-- Realistic airline data for demonstration
-- ============================================================

-- ============================================================
-- 1. SEED AIRPORTS (Major Indian Airports)
-- ============================================================
INSERT INTO airports (code, name, city, city_aliases, state, terminals, latitude, longitude, is_international) VALUES
-- Metro Cities
('DEL', 'Indira Gandhi International Airport', 'Delhi', ARRAY['New Delhi', 'NCR', 'Dilli', 'IGI'], 'Delhi', ARRAY['T1', 'T2', 'T3'], 28.5562, 77.1000, true),
('BOM', 'Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', ARRAY['Bombay', 'CSMIA'], 'Maharashtra', ARRAY['T1', 'T2'], 19.0896, 72.8656, true),
('BLR', 'Kempegowda International Airport', 'Bangalore', ARRAY['Bengaluru', 'BLR', 'KIA'], 'Karnataka', ARRAY['T1', 'T2'], 13.1986, 77.7066, true),
('MAA', 'Chennai International Airport', 'Chennai', ARRAY['Madras', 'Meenambakkam'], 'Tamil Nadu', ARRAY['T1', 'T4'], 12.9941, 80.1709, true),
('CCU', 'Netaji Subhas Chandra Bose International Airport', 'Kolkata', ARRAY['Calcutta', 'Dum Dum'], 'West Bengal', ARRAY['T1', 'T2'], 22.6520, 88.4463, true),
('HYD', 'Rajiv Gandhi International Airport', 'Hyderabad', ARRAY['Shamshabad', 'RGIA'], 'Telangana', ARRAY['T1'], 17.2403, 78.4294, true),

-- Tier 2 Cities
('PNQ', 'Pune Airport', 'Pune', ARRAY['Poona', 'Lohegaon'], 'Maharashtra', ARRAY['T1'], 18.5822, 73.9197, false),
('GOI', 'Goa International Airport', 'Goa', ARRAY['Dabolim'], 'Goa', ARRAY['T1'], 15.3808, 73.8314, true),
('COK', 'Cochin International Airport', 'Kochi', ARRAY['Cochin', 'CIAL'], 'Kerala', ARRAY['T1', 'T2', 'T3'], 10.1520, 76.3920, true),
('AMD', 'Sardar Vallabhbhai Patel International Airport', 'Ahmedabad', ARRAY['Amdavad'], 'Gujarat', ARRAY['T1', 'T2'], 23.0772, 72.6347, true),
('JAI', 'Jaipur International Airport', 'Jaipur', ARRAY['Pink City'], 'Rajasthan', ARRAY['T1', 'T2'], 26.8242, 75.8122, true),
('LKO', 'Chaudhary Charan Singh International Airport', 'Lucknow', ARRAY['Amausi'], 'Uttar Pradesh', ARRAY['T1', 'T2', 'T3'], 26.7606, 80.8893, true),
('GAU', 'Lokpriya Gopinath Bordoloi International Airport', 'Guwahati', ARRAY['Borjhar'], 'Assam', ARRAY['T1'], 26.1061, 91.5859, true),
('IXC', 'Chandigarh International Airport', 'Chandigarh', ARRAY['Mohali'], 'Punjab', ARRAY['T1'], 30.6735, 76.7885, false),
('PAT', 'Jay Prakash Narayan International Airport', 'Patna', ARRAY['Patliputra'], 'Bihar', ARRAY['T1'], 25.5913, 85.0880, false),
('VNS', 'Lal Bahadur Shastri International Airport', 'Varanasi', ARRAY['Banaras', 'Kashi'], 'Uttar Pradesh', ARRAY['T1'], 25.4524, 82.8593, true),
('BBI', 'Biju Patnaik International Airport', 'Bhubaneswar', ARRAY['BPIA'], 'Odisha', ARRAY['T1'], 20.2444, 85.8178, true),
('IXB', 'Bagdogra Airport', 'Bagdogra', ARRAY['Siliguri', 'Darjeeling'], 'West Bengal', ARRAY['T1'], 26.6812, 88.3286, false),
('SXR', 'Sheikh ul-Alam International Airport', 'Srinagar', ARRAY['Kashmir'], 'Jammu and Kashmir', ARRAY['T1'], 33.9871, 74.7742, true),
('TRV', 'Trivandrum International Airport', 'Thiruvananthapuram', ARRAY['Trivandrum'], 'Kerala', ARRAY['T1'], 8.4821, 76.9200, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. SEED AIRLINES
-- ============================================================
INSERT INTO airlines (code, name, full_name, rating, fleet_size, headquarters, founded_year, baggage_policy, cancellation_policy) VALUES
('NX', 'NexusAir', 'NexusAir Private Limited', 4.5, 50, 'Mumbai', 2024, 
 '{"cabin": {"weight": 7, "pieces": 1}, "checked": {"weight": 15, "pieces": 1, "free": true}}',
 '{"refundable": true, "fee_percent": 10, "deadline_hours": 24}'
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. SEED AIRCRAFT TYPES
-- ============================================================
INSERT INTO aircraft_types (type_code, manufacturer, model, seats_economy, seats_business, has_wifi, has_entertainment, range_km) VALUES
('A320', 'Airbus', 'A320neo', 150, 16, true, true, 6300),
('A321', 'Airbus', 'A321neo', 180, 20, true, true, 7400),
('B737', 'Boeing', '737 MAX 8', 160, 16, true, true, 6570),
('ATR72', 'ATR', 'ATR 72-600', 70, 0, false, false, 1528)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. SEED ROUTES (Major city pairs with realistic distances)
-- ============================================================
INSERT INTO routes (from_airport, to_airport, distance_km, typical_duration_minutes, base_price_economy, base_price_business) VALUES
-- Delhi routes
('DEL', 'BOM', 1150, 130, 4500, 12000),
('DEL', 'BLR', 1745, 165, 5500, 14000),
('DEL', 'MAA', 1760, 170, 5500, 14000),
('DEL', 'CCU', 1305, 140, 4800, 12500),
('DEL', 'HYD', 1260, 135, 4600, 12000),
('DEL', 'GOI', 1520, 155, 5200, 13500),
('DEL', 'COK', 2370, 190, 6500, 16000),
('DEL', 'JAI', 260, 55, 2800, 7000),
('DEL', 'LKO', 500, 70, 3200, 8000),
('DEL', 'SXR', 650, 80, 3500, 9000),

-- Mumbai routes
('BOM', 'DEL', 1150, 130, 4500, 12000),
('BOM', 'BLR', 845, 100, 3800, 10000),
('BOM', 'MAA', 1035, 115, 4200, 11000),
('BOM', 'CCU', 1665, 160, 5400, 14000),
('BOM', 'HYD', 620, 85, 3500, 9000),
('BOM', 'GOI', 440, 60, 3000, 8000),
('BOM', 'PNQ', 120, 35, 2500, 6500),
('BOM', 'AMD', 450, 65, 3100, 8000),
('BOM', 'COK', 1080, 120, 4300, 11500),

-- Bangalore routes
('BLR', 'DEL', 1745, 165, 5500, 14000),
('BLR', 'BOM', 845, 100, 3800, 10000),
('BLR', 'MAA', 290, 55, 2600, 7000),
('BLR', 'CCU', 1560, 150, 5200, 13500),
('BLR', 'HYD', 500, 70, 3200, 8500),
('BLR', 'GOI', 520, 75, 3300, 8500),
('BLR', 'COK', 380, 60, 2900, 7500),

-- Chennai routes
('MAA', 'DEL', 1760, 170, 5500, 14000),
('MAA', 'BOM', 1035, 115, 4200, 11000),
('MAA', 'BLR', 290, 55, 2600, 7000),
('MAA', 'HYD', 520, 75, 3300, 8500),
('MAA', 'CCU', 1370, 145, 5000, 13000),
('MAA', 'COK', 510, 70, 3200, 8500),

-- Kolkata routes
('CCU', 'DEL', 1305, 140, 4800, 12500),
('CCU', 'BOM', 1665, 160, 5400, 14000),
('CCU', 'BLR', 1560, 150, 5200, 13500),
('CCU', 'MAA', 1370, 145, 5000, 13000),
('CCU', 'GAU', 510, 70, 3200, 8500),
('CCU', 'PAT', 470, 65, 3000, 8000),
('CCU', 'BBI', 380, 60, 2900, 7500),

-- Hyderabad routes
('HYD', 'DEL', 1260, 135, 4600, 12000),
('HYD', 'BOM', 620, 85, 3500, 9000),
('HYD', 'BLR', 500, 70, 3200, 8500),
('HYD', 'MAA', 520, 75, 3300, 8500),
('HYD', 'CCU', 1180, 130, 4500, 12000),
('HYD', 'VNS', 930, 110, 4000, 10500)

ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SEED FLIGHTS (Daily Schedule)
-- ============================================================
-- Get route IDs first, then insert flights
DO $$
DECLARE
    route_record RECORD;
    aircraft_id INTEGER;
    flight_num INTEGER := 100;
BEGIN
    -- Get A320 aircraft ID
    SELECT id INTO aircraft_id FROM aircraft_types WHERE type_code = 'A320' LIMIT 1;
    
    -- For each route, create 4-6 flights
    FOR route_record IN SELECT id, from_airport, to_airport FROM routes LOOP
        -- Morning flight
        INSERT INTO flights (flight_number, airline_code, route_id, aircraft_type_id, departure_time, arrival_time)
        VALUES (
            'NX-' || flight_num,
            'NX',
            route_record.id,
            aircraft_id,
            '06:00',
            ('06:00'::time + ((SELECT typical_duration_minutes FROM routes WHERE id = route_record.id) || ' minutes')::interval)::time
        ) ON CONFLICT DO NOTHING;
        flight_num := flight_num + 1;
        
        -- Late morning flight
        INSERT INTO flights (flight_number, airline_code, route_id, aircraft_type_id, departure_time, arrival_time)
        VALUES (
            'NX-' || flight_num,
            'NX',
            route_record.id,
            aircraft_id,
            '09:30',
            ('09:30'::time + ((SELECT typical_duration_minutes FROM routes WHERE id = route_record.id) || ' minutes')::interval)::time
        ) ON CONFLICT DO NOTHING;
        flight_num := flight_num + 1;
        
        -- Afternoon flight
        INSERT INTO flights (flight_number, airline_code, route_id, aircraft_type_id, departure_time, arrival_time)
        VALUES (
            'NX-' || flight_num,
            'NX',
            route_record.id,
            aircraft_id,
            '14:00',
            ('14:00'::time + ((SELECT typical_duration_minutes FROM routes WHERE id = route_record.id) || ' minutes')::interval)::time
        ) ON CONFLICT DO NOTHING;
        flight_num := flight_num + 1;
        
        -- Evening flight
        INSERT INTO flights (flight_number, airline_code, route_id, aircraft_type_id, departure_time, arrival_time)
        VALUES (
            'NX-' || flight_num,
            'NX',
            route_record.id,
            aircraft_id,
            '18:30',
            ('18:30'::time + ((SELECT typical_duration_minutes FROM routes WHERE id = route_record.id) || ' minutes')::interval)::time
        ) ON CONFLICT DO NOTHING;
        flight_num := flight_num + 1;
        
        -- Night flight (not all routes)
        IF MOD(route_record.id, 2) = 0 THEN
            INSERT INTO flights (flight_number, airline_code, route_id, aircraft_type_id, departure_time, arrival_time)
            VALUES (
                'NX-' || flight_num,
                'NX',
                route_record.id,
                aircraft_id,
                '21:00',
                ('21:00'::time + ((SELECT typical_duration_minutes FROM routes WHERE id = route_record.id) || ' minutes')::interval)::time
            ) ON CONFLICT DO NOTHING;
            flight_num := flight_num + 1;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 6. SEED PRICING RULES
-- ============================================================
INSERT INTO pricing_rules (rule_name, rule_type, conditions, multiplier, priority) VALUES
-- Time-based
('Early Morning Premium', 'TIME', '{"departure_time_after": "05:00", "departure_time_before": "07:00"}', 1.15, 10),
('Morning Rush', 'TIME', '{"departure_time_after": "07:00", "departure_time_before": "10:00"}', 1.25, 10),
('Evening Rush', 'TIME', '{"departure_time_after": "17:00", "departure_time_before": "20:00"}', 1.20, 10),
('Red Eye Discount', 'TIME', '{"departure_time_after": "21:00", "departure_time_before": "05:00"}', 0.85, 10),

-- Demand-based
('High Demand (< 20 seats)', 'DEMAND', '{"seats_available_less_than": 20}', 1.50, 20),
('Moderate Demand (< 50 seats)', 'DEMAND', '{"seats_available_less_than": 50}', 1.30, 15),
('Low Demand (> 120 seats)', 'DEMAND', '{"seats_available_greater_than": 120}', 0.90, 15),

-- Day-based
('Weekend Premium', 'DAY', '{"day_of_week_in": [6, 7]}', 1.20, 5),
('Tuesday Discount', 'DAY', '{"day_of_week_in": [2]}', 0.90, 5),

-- Advance booking
('Last Minute Premium', 'ADVANCE', '{"booking_days_before_less_than": 2}', 1.40, 25),
('Early Bird Discount', 'ADVANCE', '{"booking_days_before_greater_than": 30}', 0.85, 25),
('Normal Advance', 'ADVANCE', '{"booking_days_before_between": [7, 30]}', 1.00, 5)

ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. SEED FARE RULES
-- ============================================================
INSERT INTO fare_rules (fare_type, is_refundable, cancellation_fee_percent, cancellation_deadline_hours, is_changeable, change_fee, cabin_baggage_kg, checked_baggage_kg, free_seat_selection, priority_boarding) VALUES
('SAVER', false, 100, 0, false, 2000, 7, 15, false, false),
('FLEXI', true, 20, 24, true, 500, 7, 20, true, false),
('PREMIUM', true, 10, 2, true, 0, 10, 25, true, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. CREATE INVENTORY GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_flight_inventory(start_date DATE, num_days INTEGER)
RETURNS void AS $$
DECLARE
    flight_record RECORD;
    the_date DATE;
    day_of_week INTEGER;
    base_price DECIMAL(10,2);
    calculated_price DECIMAL(10,2);
    business_price DECIMAL(10,2);
BEGIN
    FOR flight_record IN SELECT f.id, f.operates_on, r.base_price_economy, r.base_price_business 
                         FROM flights f 
                         JOIN routes r ON f.route_id = r.id 
    LOOP
        FOR i IN 0..(num_days - 1) LOOP
            the_date := start_date + i;
            day_of_week := EXTRACT(ISODOW FROM the_date);
            
            -- Check if flight operates on this day
            IF day_of_week = ANY(flight_record.operates_on) THEN
                -- Calculate base price with some randomness (±10%)
                base_price := flight_record.base_price_economy * (0.9 + random() * 0.2);
                business_price := flight_record.base_price_business * (0.9 + random() * 0.2);
                
                -- Insert inventory
                INSERT INTO flight_inventory (
                    flight_id, 
                    flight_date, 
                    economy_total,
                    economy_available, 
                    economy_price,
                    business_total,
                    business_available,
                    business_price,
                    status
                ) VALUES (
                    flight_record.id,
                    the_date,
                    150,
                    145 + floor(random() * 6)::int,  -- 145-150 available
                    ROUND(base_price, 0),
                    16,
                    14 + floor(random() * 3)::int,  -- 14-16 available
                    ROUND(business_price, 0),
                    'SCHEDULED'
                ) ON CONFLICT (flight_id, flight_date) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Generate inventory for next 60 days
SELECT generate_flight_inventory(CURRENT_DATE, 60);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Check counts
-- SELECT 'airports' as table_name, COUNT(*) as count FROM airports
-- UNION ALL SELECT 'routes', COUNT(*) FROM routes
-- UNION ALL SELECT 'flights', COUNT(*) FROM flights  
-- UNION ALL SELECT 'flight_inventory', COUNT(*) FROM flight_inventory;
