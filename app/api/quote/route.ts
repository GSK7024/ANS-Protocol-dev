import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent Next.js caching

export async function POST(req: NextRequest) {
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 500));

    // Generate a random price fluctuation around 0.5 SOL
    // Range: 0.40 to 0.60
    const basePrice = 0.5;
    const fluctuation = (Math.random() * 0.2) - 0.1;
    const livePrice = Number((basePrice + fluctuation).toFixed(3));

    return NextResponse.json({
        valid_until: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 mins
        price: {
            amount: livePrice,
            currency: "SOL"
        },
        availability: Math.random() > 0.1 ? "AVAILABLE" : "SOLD_OUT",
        dynamic_fee: 0.001
    });
}
