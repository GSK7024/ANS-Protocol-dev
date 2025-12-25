import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

interface NexusConfig {
    baseUrl?: string;
    apiKey?: string; // For Admin duties (bypass rate limits)
}

interface BookingRequest {
    buyer_agent: string; // The user you are booking for (agent://goku)
    seller_agent: string; // The service provider (agent://airindia)
    amount: number;      // Amount in SOL
    params: any;         // Service specific params (flight_id, etc)
}

interface EscrowReleaseRequest {
    escrow_id: string;
    proof?: string;      // Proof of Delivery (PNR, Ticket, etc)
}

export class NexusClient {
    private baseUrl: string;
    private apiKey?: string;

    constructor(config: NexusConfig = {}) {
        this.baseUrl = config.baseUrl || 'https://nexus-protocol.com'; // Production URL
        this.apiKey = config.apiKey;
    }

    /**
     * Resolve an Agent Handle to its Metadata
     * @param handle - e.g. "agent://solana"
     */
    async resolve(handle: string): Promise<any> {
        const name = handle.replace('agent://', '');
        const res = await fetch(`${this.baseUrl}/api/resolve?name=${name}`, {
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(`Resolution failed: ${res.statusText}`);
        return await res.json();
    }

    /**
     * Orchestrate a Privacy-Preserving Booking
     * The AI Agent calls this to book on behalf of a user.
     * The Protocol handles decrypting user data and sending it to Seller.
     */
    async book(request: BookingRequest): Promise<any> {
        const res = await fetch(`${this.baseUrl}/api/orchestrate/book`, {
            method: 'POST',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Booking failed: ${err.error || res.statusText}`);
        }

        return await res.json();
    }

    /**
     * Automated Trust: Release Escrow Funds
     * Call this when service is delivered.
     */
    async releaseEscrow(request: EscrowReleaseRequest): Promise<any> {
        const res = await fetch(`${this.baseUrl}/api/escrow/release`, {
            method: 'POST',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Escrow release failed: ${err.error || res.statusText}`);
        }

        return await res.json();
    }

    private getHeaders(): HeadersInit {
        const headers: any = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        // In V2, we will add Request Signing here using a private key
        return headers;
    }
}
