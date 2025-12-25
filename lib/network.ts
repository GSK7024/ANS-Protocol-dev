/**
 * Network Configuration & Detection Utilities
 * Handles Mainnet vs Devnet separation for ANS protocol
 */

export type NetworkType = 'mainnet' | 'devnet';

export interface NetworkConfig {
    network: NetworkType;
    rpcUrl: string;
    domainPrefix: string;
    ansMint: string;
    explorerUrl: string;
    isFree: boolean;
}

// Network configurations
export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
    mainnet: {
        network: 'mainnet',
        rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
        domainPrefix: 'agent://',
        ansMint: process.env.NEXT_PUBLIC_ANS_MINT || '',
        explorerUrl: 'https://explorer.solana.com',
        isFree: false
    },
    devnet: {
        network: 'devnet',
        rpcUrl: process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com',
        domainPrefix: 'dev.agent://',
        ansMint: process.env.NEXT_PUBLIC_TEST_ANS_MINT || '',
        explorerUrl: 'https://explorer.solana.com?cluster=devnet',
        isFree: true
    }
};

/**
 * Get the current network from environment or localStorage
 * Defaults to MAINNET for production safety
 */
export function getCurrentNetwork(): NetworkType {
    // Server-side: use env, default to mainnet
    if (typeof window === 'undefined') {
        return (process.env.NEXT_PUBLIC_NETWORK as NetworkType) || 'mainnet';
    }

    // Client-side: check localStorage first, then env
    const stored = localStorage.getItem('ans_network');
    if (stored === 'mainnet' || stored === 'devnet') {
        return stored;
    }

    // Default to mainnet for production
    return (process.env.NEXT_PUBLIC_NETWORK as NetworkType) || 'mainnet';
}

/**
 * Set the current network (client-side only)
 */
export function setCurrentNetwork(network: NetworkType): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('ans_network', network);
        // Reload to apply changes
        window.location.reload();
    }
}

/**
 * Get the config for the current network
 */
export function getNetworkConfig(): NetworkConfig {
    return NETWORK_CONFIGS[getCurrentNetwork()];
}

/**
 * Check if a domain name is for devnet (dev.agent:// prefix)
 */
export function isDevnetDomain(name: string): boolean {
    return name.startsWith('dev.agent://') || name.startsWith('dev.');
}

/**
 * Check if currently on devnet
 */
export function isDevnet(): boolean {
    return getCurrentNetwork() === 'devnet';
}

/**
 * Check if currently on mainnet
 */
export function isMainnet(): boolean {
    return getCurrentNetwork() === 'mainnet';
}

/**
 * Get the full domain name with correct prefix
 */
export function formatDomainName(name: string): string {
    const config = getNetworkConfig();
    // Remove any existing prefix
    const cleanName = name
        .replace('agent://', '')
        .replace('dev.agent://', '')
        .replace('dev.', '');
    return `${config.domainPrefix}${cleanName}`;
}

/**
 * Get network from request header (for API routes)
 */
export function getNetworkFromRequest(headers: Headers): NetworkType {
    const headerNetwork = headers.get('x-ans-network');
    if (headerNetwork === 'devnet' || headerNetwork === 'mainnet') {
        return headerNetwork;
    }
    return (process.env.NEXT_PUBLIC_NETWORK as NetworkType) || 'devnet';
}
