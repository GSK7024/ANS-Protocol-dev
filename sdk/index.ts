/**
 * ANS SDK - Agent Name Service SDK
 * 
 * Easy-to-use TypeScript/JavaScript SDK for interacting with ANS.
 * 
 * @example
 * ```typescript
 * import { ANS } from '@ans-protocol/sdk';
 * 
 * const ans = new ANS('nxs_live_your_api_key');
 * 
 * // Resolve an agent
 * const agent = await ans.resolve('agent://marriott');
 * 
 * // Discover top agents
 * const topAgents = await ans.discover({ limit: 10 });
 * 
 * // Search agents
 * const results = await ans.search({ category: 'Travel' });
 * ```
 */

export interface ANSConfig {
    apiKey: string;
    baseUrl?: string;
    network?: 'mainnet' | 'devnet';
}

export interface Agent {
    name: string;
    owner: string;
    status: string;
    trust_score?: number;
    trust_tier?: string;
    verified?: boolean;
    category?: string;
    tags?: string[];
    endpoints?: {
        url?: string;
        docs_url?: string;
    };
    api_config?: Record<string, any>;
    payment_config?: Record<string, any>;
}

export interface DiscoverOptions {
    limit?: number;
    category?: string;
    verified?: boolean;
    minTrust?: number;
}

export interface SearchOptions {
    q?: string;
    category?: string;
    tags?: string[];
    limit?: number;
}

export interface EscrowCreateOptions {
    seller: string;
    amount: number;
    service_details?: string;
    expires_hours?: number;
}

export interface Escrow {
    id: string;
    status: string;
    amount: number;
    buyer_wallet: string;
    seller_agent: string;
    created_at: string;
    expires_at: string;
}

/**
 * ANS SDK Client
 */
export class ANS {
    private apiKey: string;
    private baseUrl: string;
    private network: string;

    constructor(apiKeyOrConfig: string | ANSConfig) {
        if (typeof apiKeyOrConfig === 'string') {
            this.apiKey = apiKeyOrConfig;
            this.baseUrl = 'https://ans.domains';
            this.network = 'mainnet';
        } else {
            this.apiKey = apiKeyOrConfig.apiKey;
            this.baseUrl = apiKeyOrConfig.baseUrl || 'https://ans.domains';
            this.network = apiKeyOrConfig.network || 'mainnet';
        }
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status}`);
        }

        return data as T;
    }

    /**
     * Resolve an agent domain to get full details
     * 
     * @example
     * ```typescript
     * const agent = await ans.resolve('agent://marriott');
     * console.log(agent.endpoints.url);
     * ```
     */
    async resolve(name: string): Promise<Agent> {
        const cleanName = name.replace('agent://', '').replace('dev.agent://', '');
        return this.request<Agent>(`/api/resolve?name=${encodeURIComponent(cleanName)}&network=${this.network}`);
    }

    /**
     * Discover top-ranked agents
     * 
     * @example
     * ```typescript
     * const agents = await ans.discover({ limit: 10, verified: true });
     * ```
     */
    async discover(options: DiscoverOptions = {}): Promise<Agent[]> {
        const params = new URLSearchParams();
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.category) params.set('category', options.category);
        if (options.verified) params.set('verified', 'true');
        if (options.minTrust) params.set('minTrust', options.minTrust.toString());
        params.set('network', this.network);

        const result = await this.request<{ agents: Agent[] }>(`/api/discover?${params}`);
        return result.agents || [];
    }

    /**
     * Search for agents by keyword, category, or tags
     * 
     * @example
     * ```typescript
     * const results = await ans.search({ category: 'Travel' });
     * const hotels = await ans.search({ q: 'hotel' });
     * ```
     */
    async search(options: SearchOptions = {}): Promise<Agent[]> {
        const params = new URLSearchParams();
        if (options.q) params.set('q', options.q);
        if (options.category) params.set('category', options.category);
        if (options.tags) params.set('tags', options.tags.join(','));
        if (options.limit) params.set('limit', options.limit.toString());
        params.set('network', this.network);

        const result = await this.request<{ agents: Agent[] }>(`/api/search?${params}`);
        return result.agents || [];
    }

    /**
     * Escrow operations for secure transactions
     */
    escrow = {
        /**
         * Create a new escrow with an agent
         * 
         * @example
         * ```typescript
         * const escrow = await ans.escrow.create({
         *   seller: 'agent://marriott',
         *   amount: 5.0,
         *   service_details: 'Hotel booking for 2 nights'
         * });
         * ```
         */
        create: async (options: EscrowCreateOptions): Promise<Escrow> => {
            return this.request<Escrow>('/api/escrow', {
                method: 'POST',
                body: JSON.stringify({
                    seller_agent: options.seller,
                    amount: options.amount,
                    service_details: options.service_details || '',
                    expires_hours: options.expires_hours || 24,
                    network: this.network,
                }),
            });
        },

        /**
         * Get escrow status by ID
         */
        get: async (escrowId: string): Promise<Escrow> => {
            return this.request<Escrow>(`/api/escrow/${escrowId}`);
        },

        /**
         * List escrows for the authenticated wallet
         */
        list: async (role: 'buyer' | 'seller' = 'buyer'): Promise<Escrow[]> => {
            const result = await this.request<{ escrows: Escrow[] }>(`/api/escrow?role=${role}`);
            return result.escrows || [];
        },
    };

    /**
     * Get analytics for a domain (owner only)
     */
    async getAnalytics(domain: string, period: '7d' | '30d' | '90d' = '30d') {
        return this.request(`/api/analytics?domain=${encodeURIComponent(domain)}&period=${period}&network=${this.network}`);
    }
}

// Default export
export default ANS;
