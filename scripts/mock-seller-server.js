/**
 * Mock Seller Server
 * 
 * Run this to simulate an external flight seller's API.
 * Devs can use this to test the multi-seller system.
 * 
 * Usage:
 *   node scripts/mock-seller-server.js
 *   OR
 *   npm run seller-mock
 * 
 * This creates a seller at localhost:4001 that responds to:
 *   POST /quote - Returns flight prices
 *   POST /book  - Confirms a booking
 */

const http = require('http');

const PORT = process.env.SELLER_PORT || 4001;
const SELLER_NAME = process.env.SELLER_NAME || 'MockAir';

// Sample flight data
const FLIGHTS = {
    'DEL-BOM': [
        { flight_number: 'MA-101', departure: '06:30', arrival: '08:30', price: 3800, seats: 120 },
        { flight_number: 'MA-102', departure: '10:00', arrival: '12:00', price: 4200, seats: 80 },
        { flight_number: 'MA-103', departure: '14:30', arrival: '16:30', price: 4500, seats: 95 },
        { flight_number: 'MA-104', departure: '19:00', arrival: '21:00', price: 5100, seats: 60 }
    ],
    'DEL-BLR': [
        { flight_number: 'MA-201', departure: '07:00', arrival: '09:45', price: 4800, seats: 110 },
        { flight_number: 'MA-202', departure: '13:00', arrival: '15:45', price: 5200, seats: 75 }
    ],
    'BOM-GOA': [
        { flight_number: 'MA-301', departure: '08:00', arrival: '09:15', price: 2800, seats: 90 },
        { flight_number: 'MA-302', departure: '16:00', arrival: '17:15', price: 3200, seats: 85 }
    ],
    'DEL-GOA': [
        { flight_number: 'MA-401', departure: '09:00', arrival: '12:00', price: 5500, seats: 70 }
    ]
};

// Parse request body helper
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Generate a random booking reference
function generatePNR() {
    return SELLER_NAME.toUpperCase().slice(0, 2) +
        Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Request handler
async function handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`📥 ${req.method} ${path}`);

    try {
        // QUOTE endpoint - return available flights
        if (path === '/quote' && req.method === 'POST') {
            const body = await parseBody(req);
            const { from, to, date, passengers = 1 } = body;

            console.log(`   Searching ${from} → ${to} for ${date}`);

            const routeKey = `${from}-${to}`;
            const flights = FLIGHTS[routeKey] || [];

            if (flights.length === 0) {
                console.log(`   ⚠️ No flights for route ${routeKey}`);
            } else {
                console.log(`   ✅ Found ${flights.length} flights`);
            }

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                seller: SELLER_NAME,
                route: { from, to, date },
                flights: flights.map(f => ({
                    ...f,
                    price: f.price * passengers,
                    passengers
                }))
            }));
            return;
        }

        // BOOK endpoint - confirm a booking
        if (path === '/book' && req.method === 'POST') {
            const body = await parseBody(req);
            const { escrow_id, buyer_data, booking_params, amount } = body;

            console.log(`   📋 Booking request for escrow: ${escrow_id}`);
            console.log(`   👤 Buyer data received: ${JSON.stringify(Object.keys(buyer_data || {}))}`);

            const pnr = generatePNR();

            console.log(`   ✅ Booking confirmed: ${pnr}`);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                pnr: pnr,
                status: 'CONFIRMED',
                escrow_id,
                message: `Booking confirmed by ${SELLER_NAME}`,
                ticket_url: `https://${SELLER_NAME.toLowerCase()}.example.com/tickets/${pnr}`
            }));
            return;
        }

        // Health check
        if (path === '/health' || path === '/') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                seller: SELLER_NAME,
                port: PORT,
                routes: Object.keys(FLIGHTS)
            }));
            return;
        }

        // 404 for unknown paths
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found', path }));

    } catch (err) {
        console.error('Error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║           🛫 ${SELLER_NAME} Mock Seller Server           ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Listening on: http://localhost:${PORT}                 ║
║                                                      ║
║  Endpoints:                                          ║
║    POST /quote  - Get flight prices                  ║
║    POST /book   - Confirm booking                    ║
║    GET  /health - Health check                       ║
║                                                      ║
║  Supported Routes:                                   ║
║    ${Object.keys(FLIGHTS).join(', ').padEnd(43)}║
║                                                      ║
║  To register with ANS:                               ║
║    POST /api/seller/register                         ║
║    {                                                 ║
║      "domain": "mockair",                            ║
║      "seller_wallet": "YOUR_WALLET",                 ║
║      "quote_url": "http://localhost:${PORT}/quote",     ║
║      "book_url": "http://localhost:${PORT}/book",       ║
║      "stake_amount": 10                              ║
║    }                                                 ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down mock seller...');
    server.close(() => process.exit(0));
});
