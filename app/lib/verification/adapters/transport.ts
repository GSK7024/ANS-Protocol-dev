
import { VerificationAdapter, VerificationResult } from '../types';

export const TransportAdapter: VerificationAdapter = {
    category: 'transport',

    validateFormat(proof: any): boolean {
        return !!(proof?.trip_id && typeof proof.trip_id === 'string');
    },

    async verify(verifyUrl: string, apiKey: string | undefined, proof: any, requestDetails: any): Promise<VerificationResult> {
        try {
            // 1. Construct URL
            const url = new URL(verifyUrl);
            url.searchParams.append('trip_id', proof.trip_id);

            console.log(`   🛺 [ADAPTER:TRANSPORT] Verifying Trip: ${proof.trip_id}`);

            // 2. Call Agent's Verify API
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
            });

            if (!response.ok) {
                return { valid: false, reason: `Agent API Verification Failed: ${response.status}` };
            }

            const data = await response.json();

            // 3. Compare Data
            if (!data.valid) {
                return { valid: false, reason: 'Trip ID not valid' };
            }

            // For rides, we might verify origin/dest or rider phone hash
            // Here we'll just verify status is valid (Scheduled/InProgress/Completed)
            if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(data.status)) {
                return { valid: false, reason: `Invalid Trip Status: ${data.status}` };
            }

            return {
                valid: true,
                details: data
            };

        } catch (err) {
            return { valid: false, reason: `Adapter Error: ${(err as Error).message}` };
        }
    }
};
