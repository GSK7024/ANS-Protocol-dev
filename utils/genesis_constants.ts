// ============================================
// NEXUS PROTOCOL - DOMAIN PRICING CONSTANTS
// ============================================

// 1. RESTRICTED NAMES (Never for sale - Trademark Protection)
export const RESTRICTED_NAMES = new Set([
    // === BIG TECH ===
    'google', 'alphabet', 'openai', 'anthropic', 'amazon', 'aws', 'apple', 'microsoft',
    'azure', 'meta', 'facebook', 'instagram', 'whatsapp', 'twitter', 'x', 'tiktok',
    'nvidia', 'intel', 'amd', 'oracle', 'ibm', 'cisco', 'adobe', 'salesforce',
    'netflix', 'spotify', 'uber', 'lyft', 'airbnb', 'dropbox', 'slack', 'zoom',
    'github', 'gitlab', 'docker', 'vercel', 'supabase', 'firebase', 'mongodb',

    // === CRYPTO/WEB3 ===
    'solana', 'ethereum', 'bitcoin', 'binance', 'coinbase', 'kraken', 'phantom',
    'metamask', 'ledger', 'trezor', 'opensea', 'uniswap', 'aave', 'compound',
    'chainlink', 'polygon', 'avalanche', 'cardano', 'polkadot', 'cosmos',

    // === FINANCE (GLOBAL) ===
    'visa', 'mastercard', 'amex', 'paypal', 'stripe', 'venmo', 'cashapp',
    'jpmorgan', 'goldman', 'chase', 'citi', 'wellsfargo', 'bankofamerica',
    'hsbc', 'barclays', 'ubs', 'creditsuisse', 'deutschebank',

    // === INDIA ===
    'reliance', 'tata', 'infosys', 'wipro', 'hcl', 'techmahindra', 'ltimindtree',
    'hdfc', 'icici', 'sbi', 'kotak', 'axis', 'yesbank', 'paytm', 'phonepe',
    'airtel', 'jio', 'vodafone', 'bsnl', 'adani', 'bajaj', 'mahindra',
    'flipkart', 'zomato', 'swiggy', 'ola', 'rapido', 'byjus', 'unacademy',
    'zerodha', 'groww', 'cred', 'razorpay', 'bharatpe', 'policybazaar',
    'nykaa', 'meesho', 'myntra', 'bigbasket', 'dunzo', 'inmobi',

    // === CHINA ===
    'alibaba', 'tencent', 'baidu', 'huawei', 'xiaomi', 'bytedance', 'douyin',
    'didi', 'jd', 'meituan', 'pinduoduo', 'weibo', 'bilibili', 'netease',
    'lenovo', 'oppo', 'vivo', 'oneplus', 'realme', 'honor', 'zte',

    // === KOREA & JAPAN ===
    'samsung', 'lg', 'hyundai', 'kia', 'sk', 'kakao', 'naver', 'coupang',
    'toyota', 'honda', 'nissan', 'sony', 'panasonic', 'nintendo', 'sega',
    'softbank', 'rakuten', 'mitsubishi', 'hitachi', 'toshiba', 'canon', 'nikon',

    // === EUROPE ===
    'volkswagen', 'bmw', 'mercedes', 'audi', 'porsche', 'ferrari', 'lamborghini',
    'nestle', 'unilever', 'loreal', 'lvmh', 'hermes', 'gucci', 'prada', 'chanel',
    'siemens', 'bosch', 'sap', 'spotify', 'ikea', 'hm', 'zara', 'adidas', 'puma',
    'shell', 'bp', 'total', 'airbus', 'rolls', 'rolex', 'cartier', 'omega',

    // === USA CONSUMER ===
    'cocacola', 'pepsi', 'mcdonalds', 'starbucks', 'walmart', 'target', 'costco',
    'nike', 'underarmour', 'lululemon', 'gap', 'levis', 'northface', 'patagonia',
    'disney', 'marvel', 'pixar', 'warner', 'hbo', 'paramount', 'universal',
    'ford', 'gm', 'chevrolet', 'tesla', 'spacex', 'boeing', 'lockheed',

    // === GOVERNMENT (ALWAYS BLOCKED) ===
    'gov', 'government', 'fbi', 'cia', 'nsa', 'irs', 'sec', 'fda', 'doj',
    'whitehouse', 'congress', 'senate', 'pentagon', 'military', 'police',
    'fed', 'reserve', 'treasury', 'ministry', 'embassy', 'consulate'
]);

// 2. CROWN JEWELS (Auction Only - Premium Single Words)
export const CROWN_JEWELS = new Set([
    'god', 'ai', 'bank', 'sex', 'law', 'news', 'shop', 'code', 'mars', 'nexus',
    'money', 'love', 'life', 'death', 'king', 'queen', 'alpha', 'omega', 'crypto',
    'gold', 'rich', 'prime', 'world', 'earth', 'moon', 'sun', 'star', 'fire', 'ice'
]);

// 3. CHARACTER-BASED PRICING (For all other names)
export function getDomainPrice(name: string): { price: number; tier: string; strike?: number } {
    const len = name.length;

    // Single character - Ultra premium
    if (len === 1) {
        return { price: 10, tier: 'Ultra Premium (1 char)', strike: 20 };
    }
    // 2 characters - Very premium
    if (len === 2) {
        return { price: 5, tier: 'Premium (2 char)', strike: 10 };
    }
    // 3 characters - Premium
    if (len === 3) {
        return { price: 2.5, tier: 'Premium (3 char)', strike: 5 };
    }
    // 4 characters 
    if (len === 4) {
        return { price: 1, tier: 'Standard (4 char)', strike: 2 };
    }
    // 5 characters
    if (len === 5) {
        return { price: 0.5, tier: 'Standard (5 char)', strike: 1 };
    }
    // 6+ characters - Base price
    return { price: 0.25, tier: 'Base (6+ char)', strike: 0.5 };
}

// 4. FREE USER SUBDOMAINS
// Format: user.{name} - e.g., user.john, user.mybot
// Limit: 2 per wallet
// These don't rank in orchestrator and can't do commercial transactions
export const FREE_USER_PREFIX = 'user.';
export const FREE_DOMAINS_PER_WALLET = 2;

// 5. Helper function to check if name is a free user subdomain
export function isUserSubdomain(name: string): boolean {
    return name.startsWith(FREE_USER_PREFIX);
}

// 6. Helper to extract username from subdomain
export function getUsernameFromSubdomain(name: string): string | null {
    if (!isUserSubdomain(name)) return null;
    return name.slice(FREE_USER_PREFIX.length);
}

// 7. Validate domain name format
export function isValidDomainName(name: string): { valid: boolean; error?: string } {
    // Must be lowercase alphanumeric with optional dots and hyphens
    const regex = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/;

    if (name.length < 1) {
        return { valid: false, error: 'Name is too short' };
    }
    if (name.length > 32) {
        return { valid: false, error: 'Name is too long (max 32 characters)' };
    }
    if (!regex.test(name) && name.length > 1) {
        return { valid: false, error: 'Invalid characters. Use lowercase letters, numbers, dots, and hyphens.' };
    }
    if (name.includes('..')) {
        return { valid: false, error: 'Cannot have consecutive dots' };
    }

    return { valid: true };
}

// Legacy exports for backward compatibility
export const TITAN_TIER = new Set(['pay', 'fly', 'buy', 'data', 'chat', 'jobs', 'med', 'tax', 'play', 'food', 'host', 'defi', 'sol', 'btc', 'eth']);
export const FOUNDER_TIER = new Set(['trader', 'writer', 'doctor', 'artist', 'broker', 'search', 'ticket', 'weather', 'support', 'security', 'manager', 'finance', 'logistics', 'research', 'assistant', 'test', 'demo', 'goku', 'prime', 'origin', 'agent', 'founder']);
export const GENESIS_RESERVATION_PRICE = 0.1;
