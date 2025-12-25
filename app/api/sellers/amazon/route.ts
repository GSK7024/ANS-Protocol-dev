import { NextRequest, NextResponse } from 'next/server';

/**
 * SELLER: agent://amazon
 * 
 * Amazon Shopping agent registered in ANS.
 * Provides product search and purchasing.
 * Reference implementation for e-commerce.
 */

// Simulated Product Inventory
const PRODUCT_INVENTORY: Record<string, any[]> = {
    'electronics': [
        {
            id: 'AMZ-E001',
            name: 'Sony WH-1000XM5 Noise Canceling Headphones',
            price: 24999,
            currency: 'INR',
            rating: 4.8,
            delivery: 'Tomorrow',
            seller: 'Appario Retail'
        },
        {
            id: 'AMZ-E002',
            name: 'Apple MacBook Air M2',
            price: 99900,
            currency: 'INR',
            rating: 4.9,
            delivery: '2 Days',
            seller: 'Imagine Store'
        }
    ],
    'books': [
        {
            id: 'AMZ-B001',
            name: 'Atomic Habits by James Clear',
            price: 450,
            currency: 'INR',
            rating: 4.7,
            delivery: 'Today',
            seller: 'Cocoblu Retail'
        },
        {
            id: 'AMZ-B002',
            name: 'Psychology of Money',
            price: 380,
            currency: 'INR',
            rating: 4.6,
            delivery: 'Tomorrow',
            seller: 'uRead Store'
        }
    ]
};

export async function POST(req: NextRequest) {
    try {
        const { action, query, category, product_id, shipping_address } = await req.json();

        if (action === 'search' || !action) {
            // Simple keyword matching simulation
            const cat = category?.toLowerCase() || 'electronics';
            let products = PRODUCT_INVENTORY[cat] || PRODUCT_INVENTORY['electronics'];

            if (query) {
                products = products.filter(p =>
                    p.name.toLowerCase().includes(query.toLowerCase())
                );
            }

            const results = products.map(p => ({
                id: p.id,
                title: p.name,
                price_inr: p.price,
                price_usd: Math.round(p.price / 83),
                rating: p.rating,
                delivery_estimate: p.delivery,
                seller: p.seller,
                in_stock: true
            }));

            return NextResponse.json({
                success: true,
                seller: 'agent://amazon',
                action: 'search',
                query: query || 'best sellers',
                category: cat,
                products: results,
                currency: 'INR',
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'book' || action === 'buy') {
            if (!product_id || !shipping_address) {
                return NextResponse.json({ error: 'Missing product_id or shipping_address' }, { status: 400 });
            }

            const orderId = 'ORDER-' + Math.random().toString(36).substring(2, 10).toUpperCase();

            return NextResponse.json({
                success: true,
                seller: 'agent://amazon',
                action: 'buy',
                order: {
                    order_id: orderId,
                    product_id: product_id,
                    status: 'SHIPPED',
                    tracking_number: 'AWB' + Math.floor(Math.random() * 1000000000),
                    delivery_address: shipping_address,
                    estimated_delivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                },
                message: `Order placed! Order ID: ${orderId}`
            });
        }

        return NextResponse.json({ error: 'Invalid action. Use: search, buy' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        agent: 'agent://amazon',
        name: 'Amazon India',
        type: 'seller',
        category: 'shopping',
        description: 'India\'s largest online store.',
        verified: true,
        trust_score: 99
    });
}
