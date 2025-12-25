/**
 * Dynamic SOL/USD Price Fetching
 * 
 * Fetches real-time SOL price from multiple sources with caching
 */

// Cache for price data (5 minute TTL)
let priceCache: { price: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get current SOL price in USD
 * Uses CoinGecko (free) with fallback to Birdeye
 */
export async function getSOLPrice(): Promise<number> {
    // Check cache first
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
        return priceCache.price;
    }

    let price: number | null = null;

    // Try CoinGecko first (free, no API key required)
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { next: { revalidate: 300 } } // Cache for 5 min in Next.js
        );

        if (response.ok) {
            const data = await response.json();
            price = data?.solana?.usd;
        }
    } catch (e) {
        console.warn('CoinGecko price fetch failed:', e);
    }

    // Fallback to Jupiter aggregator price API
    if (!price) {
        try {
            const response = await fetch(
                'https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112',
                { next: { revalidate: 300 } }
            );

            if (response.ok) {
                const data = await response.json();
                price = data?.data?.['So11111111111111111111111111111111111111112']?.price;
            }
        } catch (e) {
            console.warn('Jupiter price fetch failed:', e);
        }
    }

    // If all else fails, use a reasonable fallback
    if (!price) {
        console.warn('All price sources failed, using fallback price');
        price = 100; // Fallback - should rarely happen
    }

    // Update cache
    priceCache = { price, timestamp: Date.now() };

    return price;
}

/**
 * Convert SOL to USD
 */
export async function solToUSD(solAmount: number): Promise<number> {
    const price = await getSOLPrice();
    return Math.round(solAmount * price * 100) / 100; // 2 decimal places
}

/**
 * Convert USD to SOL
 */
export async function usdToSOL(usdAmount: number): Promise<number> {
    const price = await getSOLPrice();
    return Math.round((usdAmount / price) * 1000000000) / 1000000000; // 9 decimal places
}

/**
 * Get price with confidence indicator
 */
export async function getPriceInfo(): Promise<{
    price: number;
    source: string;
    cached: boolean;
    age_seconds: number;
}> {
    const wasCached = priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS;
    const price = await getSOLPrice();

    return {
        price,
        source: 'coingecko',
        cached: !!wasCached,
        age_seconds: priceCache ? Math.round((Date.now() - priceCache.timestamp) / 1000) : 0
    };
}

// Export cached price for sync access (may be stale)
export function getCachedPrice(): number | null {
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS * 2) {
        return priceCache.price;
    }
    return null;
}
