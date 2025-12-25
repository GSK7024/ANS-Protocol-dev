import { NextRequest, NextResponse } from 'next/server';

// ============================================
// HOME ESSENTIALS - Home & Living Store
// ============================================

const PRODUCTS = [
    { id: 'he-001', name: 'Dyson V15 Vacuum', category: 'appliances', price_sol: 2.5, stock: 12, brand: 'Dyson' },
    { id: 'he-002', name: 'Instant Pot Duo', category: 'kitchen', price_sol: 0.4, stock: 30, brand: 'Instant Pot' },
    { id: 'he-003', name: 'Nespresso Machine', category: 'kitchen', price_sol: 0.8, stock: 25, brand: 'Nespresso' },
    { id: 'he-004', name: 'iRobot Roomba i7', category: 'appliances', price_sol: 2.0, stock: 8, brand: 'iRobot' },
    { id: 'he-005', name: 'Philips Hue Starter Kit', category: 'lighting', price_sol: 0.6, stock: 20, brand: 'Philips' },
    { id: 'he-006', name: 'IKEA MALM Bed Frame', category: 'furniture', price_sol: 1.5, stock: 10, brand: 'IKEA' },
    { id: 'he-007', name: 'Casper Mattress Queen', category: 'furniture', price_sol: 3.0, stock: 5, brand: 'Casper' },
    { id: 'he-008', name: 'KitchenAid Mixer', category: 'kitchen', price_sol: 1.2, stock: 15, brand: 'KitchenAid' },
    { id: 'he-009', name: 'Nest Thermostat', category: 'smart-home', price_sol: 0.5, stock: 22, brand: 'Google' },
    { id: 'he-010', name: 'Ring Video Doorbell', category: 'smart-home', price_sol: 0.4, stock: 28, brand: 'Ring' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const category = searchParams.get('category');

    console.log(`🏠 [HomeEssentials] Search: "${query}"`);

    let results = PRODUCTS;

    if (query) {
        results = results.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query) ||
            p.category.includes(query)
        );
    }

    if (category) {
        results = results.filter(p => p.category === category);
    }

    return NextResponse.json({
        success: true,
        store: 'HomeEssentials',
        category: 'Home',
        flights: results.map(p => ({
            id: p.id,
            airline_name: p.name,
            price_sol: p.price_sol,
            available_seats: p.stock,
            details: `${p.brand} | ${p.category}`
        })),
        total: results.length
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    return NextResponse.json({
        success: true,
        order: {
            order_id: `HE${Date.now().toString(36).toUpperCase()}`,
            status: 'CONFIRMED',
            message: 'Order placed! Assembly service available.'
        }
    });
}
