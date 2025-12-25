"use client";

import { useState, useEffect } from 'react';
import { getCurrentNetwork, getNetworkConfig, type NetworkType, type NetworkConfig, NETWORK_CONFIGS } from '@/lib/network';

/**
 * React hook for network state management
 * Returns current network, config, and setter function
 * 
 * Uses 'mainnet' as default to match server render - prevents hydration mismatch
 */
export function useNetwork() {
    // Use 'mainnet' as default to match server-side render
    const [network, setNetwork] = useState<NetworkType>('mainnet');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Only read from localStorage after component mounts (client-side)
        setMounted(true);
        const currentNetwork = getCurrentNetwork();
        setNetwork(currentNetwork);
    }, []);

    // Get config based on current network
    const config = NETWORK_CONFIGS[network];

    return {
        network,
        config,
        isDevnet: network === 'devnet',
        isMainnet: network === 'mainnet',
        domainPrefix: config.domainPrefix,
        isFree: config.isFree,
        mounted // Expose mounted state so components can show loading if needed
    };
}
