
export interface VerificationResult {
    valid: boolean;
    reason?: string;
    details?: any; // The verified data (ticket, trip info, etc.)
}

export interface VerificationAdapter {
    /**
     * Category this adapter handles (e.g., 'travel', 'transport')
     */
    category: string;

    /**
     * Validates the format of the proof provided by the seller
     */
    validateFormat(proof: any): boolean;

    /**
     * Performs deep verification by calling the agent's verification URL
     * and comparing the result with the original request.
     */
    verify(
        agentVerifyUrl: string,
        agentApiKey: string | undefined,
        proof: any,
        requestDetails: any
    ): Promise<VerificationResult>;
}
