import { NextRequest, NextResponse } from 'next/server';

/**
 * SELLER: agent://flipkart
 * 
 * Flipkart shopping agent registered in ANS.
 * Search products and place orders.
 * (Using Flipkart instead of Amazon for demo - easier to simulate)
 */

// Simulated product catalog
const PRODUCT_CATALOG = [
    {
        id: 'FK001',
        name: 'Nike Dri-FIT Swimsuit',
        category: 'Sports & Fitness',
        brand: 'Nike',
        price: 2499,
        rating: 4.3,
        reviews: 1256,
        in_stock: true,
        delivery_days: 1,
        image: '/products/swimsuit.jpg',
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'FK002',
        name: 'Speedo Endurance+ Swimsuit',
        category: 'Sports & Fitness',
        brand: 'Speedo',
        price: 1899,
        rating: 4.5,
        reviews: 892,
        in_stock: true,
        delivery_days: 1,
        image: '/products/speedo.jpg',
        sizes: ['S', 'M', 'L']
    },
    {
        id: 'FK003',
        name: 'Apple iPhone 15 Pro',
        category: 'Electronics',
        brand: 'Apple',
        price: 134900,
        rating: 4.8,
        reviews: 5420,
        in_stock: true,
        delivery_days: 2,
        image: '/products/iphone.jpg',
        variants: ['128GB', '256GB', '512GB']
    },
    {
        id: 'FK004',
        name: 'Sony WH-1000XM5 Headphones',
        category: 'Electronics',
        brand: 'Sony',
        price: 29990,
        rating: 4.7,
        reviews: 3211,
        in_stock: true,
        delivery_days: 1,
        image: '/products/sony.jpg',
        colors: ['Black', 'Silver']
    },
    {
        id: 'FK005',
        name: 'Adidas Ultraboost Running Shoes',
        category: 'Footwear',
        brand: 'Adidas',
        price: 17999,
        rating: 4.6,
        reviews: 2104,
        in_stock: true,
        delivery_days: 2,
        image: '/products/ultraboost.jpg',
        sizes: ['7', '8', '9', '10', '11']
    },
    {
        id: 'FK006',
        name: 'Samsung Galaxy S24 Ultra',
        category: 'Electronics',
        brand: 'Samsung',
        price: 129999,
        rating: 4.7,
        reviews: 4201,
        in_stock: true,
        delivery_days: 2,
        image: '/products/s24.jpg',
        variants: ['256GB', '512GB']
    }
];

export async function POST(req: NextRequest) {
    try {
        const { action, query, product_id, quantity, address } = await req.json();

        if (action === 'search' || !action) {
            const searchQuery = query?.toLowerCase() || '';

            let results = PRODUCT_CATALOG;
            if (searchQuery) {
                results = PRODUCT_CATALOG.filter(p =>
                    p.name.toLowerCase().includes(searchQuery) ||
                    p.category.toLowerCase().includes(searchQuery) ||
                    p.brand.toLowerCase().includes(searchQuery)
                );
            }

            return NextResponse.json({
                success: true,
                seller: 'agent://flipkart',
                action: 'search',
                query: query || 'all products',
                products: results.map(p => ({
                    ...p,
                    price_usd: Math.round(p.price / 83),
                    delivery_date: new Date(Date.now() + p.delivery_days * 86400000).toISOString().split('T')[0]
                })),
                total_results: results.length,
                currency: 'INR',
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'buy') {
            if (!product_id) {
                return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
            }

            const product = PRODUCT_CATALOG.find(p => p.id === product_id);
            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            const orderId = 'OD' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const deliveryDate = new Date(Date.now() + product.delivery_days * 86400000);

            return NextResponse.json({
                success: true,
                seller: 'agent://flipkart',
                action: 'buy',
                order: {
                    order_id: orderId,
                    product: product.name,
                    quantity: quantity || 1,
                    total_inr: product.price * (quantity || 1),
                    total_usd: Math.round((product.price * (quantity || 1)) / 83),
                    status: 'CONFIRMED',
                    delivery_date: deliveryDate.toISOString().split('T')[0],
                    delivery_address: address || 'User vault address',
                    tracking_available: true
                },
                message: `Order placed! Order ID: ${orderId}. Delivery by ${deliveryDate.toDateString()}`
            });
        }

        return NextResponse.json({ error: 'Invalid action. Use: search, buy' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        agent: 'agent://flipkart',
        name: 'Flipkart',
        type: 'seller',
        category: 'shopping',
        description: 'Shop millions of products. Electronics, fashion, home & more. Fast delivery.',
        version: '1.0.0',
        logo: '/sellers/flipkart-logo.png',
        website: 'https://flipkart.com',
        pricing: {
            delivery_fee: 'Free above ₹500',
            ans_fee: '0.5%',
            payment_methods: ['SOL', 'USDC', 'INR']
        },
        required_fields: ['full_name', 'address', 'phone'],
        endpoints: {
            search: { method: 'POST', params: ['query'] },
            buy: { method: 'POST', params: ['product_id', 'quantity', 'address'] }
        },
        categories: ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Toys'],
        trust_score: 96,
        verified: true,
        transactions: 125000,
        rating: 4.4
    });
}
