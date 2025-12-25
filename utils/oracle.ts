/**
 * Mock Oracle Service
 * 
 * In production, this would connect to real-world APIs (FlightAware, Stripe, On-Chain Data).
 * For V1, we simulate verification based on proof formats.
 */

interface VerificationResult {
    verified: boolean;
    metadata?: any;
    error?: string;
}

export const oracle = {
    /**
     * Verify a service delivery proof
     * @param serviceType - Type of service (flight, ride, etc)
     * @param proof - The proof string (ticket number, transaction hash)
     */
    async verifyService(serviceType: string, proof: string): Promise<VerificationResult> {
        console.log(`🔮 [ORACLE] Verifying ${serviceType} with proof: ${proof}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock Logic: valid proofs start with certain prefixes
        if (serviceType === 'flight_booking') {
            if (proof.startsWith('FLT-') && proof.length > 8) {
                return {
                    verified: true,
                    metadata: { flight_status: 'CONFIRMED', carrier: 'AirIndia' }
                };
            }
            return { verified: false, error: 'Invalid Flight PNR format' };
        }

        if (serviceType === 'crypto_swap') {
            if (proof.startsWith('tx_') || proof.length > 30) {
                return { verified: true, metadata: { confirmations: 32 } };
            }
        }

        // Generic fallback for testing
        if (proof === 'valid_proof') {
            return { verified: true, metadata: { note: 'Test Proof Accepted' } };
        }

        return {
            verified: false,
            error: `Oracle verification failed for ${serviceType}`
        };
    }
};
