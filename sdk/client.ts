/**
 * Agent Protocol SDK
 * This is a reference implementation for developers to integrate with the protocol.
 */

interface ResolutionResponse {
    protocol: "agent";
    name: string;
    status: string;
    owner: string;
    resolution: {
        endpoint: string | null;
        docs: string | null;
    };
    meta: {
        minted_at: string;
    };
}

export class AgentProtocol {
    private baseUrl: string;

    constructor(
        public network: 'devnet' | 'mainnet' = 'devnet',
        customEndpoint?: string
    ) {
        // In production, this would point to the deployed Vercel URL
        this.baseUrl = customEndpoint || (
            network === 'devnet'
                ? 'http://localhost:3000/api'
                : 'https://agent-protocol.com/api'
        );
    }

    /**
     * Resolve an agent:// name to its endpoint.
     * @param name The agent name (e.g., "ganesh" or "agent://ganesh")
     */
    async resolve(name: string): Promise<ResolutionResponse | null> {
        try {
            const cleanName = name.replace('agent://', '');
            const response = await fetch(`${this.baseUrl}/resolve?name=${cleanName}`);

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Resolution failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Agent Protocol Resolution Error:", error);
            throw error;
        }
    }
}
