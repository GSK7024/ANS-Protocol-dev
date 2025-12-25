import { NextRequest, NextResponse } from 'next/server';

// ============================================
// FASHIONHUB - Fashion & Apparel Store
// ============================================

const PRODUCTS = [
    { id: 'fh-001', name: 'Nike Air Max 90', category: 'shoes', price_sol: 0.8, stock: 25, brand: 'Nike' },
    { id: 'fh-002', name: 'Adidas Ultraboost', category: 'shoes', price_sol: 0.9, stock: 20, brand: 'Adidas' },
    { id: 'fh-003', name: 'Levi\'s 501 Jeans', category: 'pants', price_sol: 0.4, stock: 40, brand: 'Levi\'s' },
    { id: 'fh-004', name: 'North Face Puffer Jacket', category: 'jackets', price_sol: 1.2, stock: 15, brand: 'North Face' },
    { id: 'fh-005', name: 'Ray-Ban Aviators', category: 'accessories', price_sol: 0.6, stock: 30, brand: 'Ray-Ban' },
    { id: 'fh-006', name: 'Gucci Belt', category: 'accessories', price_sol: 2.0, stock: 10, brand: 'Gucci' },
    { id: 'fh-007', name: 'Uniqlo Basic Tee', category: 'tops', price_sol: 0.1, stock: 100, brand: 'Uniqlo' },
    { id: 'fh-008', name: 'Zara Blazer', category: 'formal', price_sol: 0.5, stock: 18, brand: 'Zara' },
    { id: 'fh-009', name: 'Converse Chuck Taylor', category: 'shoes', price_sol: 0.35, stock: 45, brand: 'Converse' },
    { id: 'fh-010', name: 'Supreme Box Logo Hoodie', category: 'tops', price_sol: 1.5, stock: 5, brand: 'Supreme' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const category = searchParams.get('category');

    console.log(`👗 [FashionHub] Search: "${query}"`);

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
        store: 'FashionHub',
        category: 'Fashion',
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
            order_id: `FH${Date.now().toString(36).toUpperCase()}`,
            status: 'CONFIRMED',
            message: 'Order placed! Free shipping on orders over 0.5 SOL.'
        }
    });
}
