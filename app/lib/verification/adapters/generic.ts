
import { VerificationAdapter, VerificationResult } from '../types';

/**
 * GENERIC ADAPTER - The "Skeleton Key" for Agents 🗝️
 * 
 * This adapter handles ANY category that doesn't have a specific adapter.
 * It relies entirely on the agent's "Verify URL" and standard response format.
 * 
 * Future-proofs ANS for: Amazon, Hotels, Food, Services, etc.
 */
export const GenericAdapter: VerificationAdapter = {
    category: 'generic',

    // Generic adapter is lenient on format - relies on Agent to define fields
    validateFormat(proof: any): boolean {
        return proof && typeof proof === 'object';
    },

    async verify(verifyUrl: string, apiKey: string | undefined, proof: any, requestDetails: any): Promise<VerificationResult> {
        try {
            // 1. Construct URL with all proof fields as params
            const url = new URL(verifyUrl);
            Object.keys(proof).forEach(key => {
                if (typeof proof[key] === 'string') {
                    url.searchParams.append(key, proof[key]);
                }
            });

            console.log(`   🌍 [ADAPTER:GENERIC] Verifying via: ${verifyUrl}`);

            // 2. Call Agent's Verify API
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
            });

            if (!response.ok) {
                return { valid: false, reason: `Agent Verification API Failed: ${response.status}` };
            }

            const data = await response.json();

            // 3. Simple Boolean Check
            if (!data.valid) {
                return { valid: false, reason: data.reason || 'Agent returned invalid status' };
            }

            return {
                valid: true,
                details: data
            };

        } catch (err) {
            return { valid: false, reason: `Generic Verification Error: ${(err as Error).message}` };
        }
    }
};
