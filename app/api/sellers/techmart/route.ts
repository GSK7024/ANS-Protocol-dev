import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TECHMART - Electronics Store
// ============================================

const PRODUCTS = [
    { id: 'tm-001', name: 'iPhone 15 Pro', category: 'phones', price_sol: 5.5, stock: 15, brand: 'Apple' },
    { id: 'tm-002', name: 'Samsung Galaxy S24', category: 'phones', price_sol: 4.2, stock: 20, brand: 'Samsung' },
    { id: 'tm-003', name: 'MacBook Air M3', category: 'laptops', price_sol: 6.0, stock: 8, brand: 'Apple' },
    { id: 'tm-004', name: 'Dell XPS 15', category: 'laptops', price_sol: 4.5, stock: 12, brand: 'Dell' },
    { id: 'tm-005', name: 'AirPods Pro', category: 'audio', price_sol: 1.2, stock: 50, brand: 'Apple' },
    { id: 'tm-006', name: 'Sony WH-1000XM5', category: 'audio', price_sol: 1.8, stock: 25, brand: 'Sony' },
    { id: 'tm-007', name: 'iPad Pro 12.9"', category: 'tablets', price_sol: 5.0, stock: 10, brand: 'Apple' },
    { id: 'tm-008', name: 'Nintendo Switch OLED', category: 'gaming', price_sol: 1.5, stock: 30, brand: 'Nintendo' },
    { id: 'tm-009', name: 'PS5 Console', category: 'gaming', price_sol: 2.5, stock: 5, brand: 'Sony' },
    { id: 'tm-010', name: 'Apple Watch Ultra', category: 'wearables', price_sol: 3.5, stock: 18, brand: 'Apple' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const category = searchParams.get('category');

    console.log(`🛒 [TechMart] Search: "${query}" category: ${category || 'all'}`);

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
        store: 'TechMart',
        category: 'Electronics',
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
            order_id: `TM${Date.now().toString(36).toUpperCase()}`,
            product: body.product_id,
            status: 'CONFIRMED',
            message: 'Order placed! Shipping in 2-3 days.'
        }
    });
}
