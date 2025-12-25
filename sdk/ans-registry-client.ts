/**
 * ANS Registry Client
 * 
 * TypeScript client to interact with the on-chain ANS domain registry.
 * Use this to register, transfer, and trade domains on Solana.
 */

import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Program ID (update after deployment)
export const ANS_PROGRAM_ID = new PublicKey('ANSregXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

export interface DomainInfo {
    name: string;
    owner: PublicKey;
    endpoint: string;
    category: string;
    createdAt: number;
    expiresAt: number;
    isListed: boolean;
    listPrice: number; // in lamports
}

/**
 * Get the PDA address for a domain name
 */
export function getDomainPDA(name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('domain'), Buffer.from(name)],
        ANS_PROGRAM_ID
    );
}

/**
 * ANS Registry Client
 */
export class AnsRegistryClient {
    private connection: Connection;
    private program: anchor.Program;

    constructor(connection: Connection, wallet: anchor.Wallet) {
        this.connection = connection;

        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: 'confirmed'
        });

        // IDL would be loaded here after program deployment
        // this.program = new anchor.Program(IDL, ANS_PROGRAM_ID, provider);
    }

    /**
     * Register a new domain
     */
    async registerDomain(
        name: string,
        endpoint: string,
        category: string = 'general'
    ): Promise<string> {
        const [domainPDA] = getDomainPDA(name);

        const tx = await this.program.methods
            .registerDomain(name, endpoint, category)
            .accounts({
                domain: domainPDA,
                owner: this.program.provider.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log(`Domain registered: agent://${name}`);
        console.log(`Transaction: ${tx}`);

        return tx;
    }

    /**
     * Get domain info
     */
    async getDomain(name: string): Promise<DomainInfo | null> {
        const [domainPDA] = getDomainPDA(name);

        try {
            const account = await this.program.account.domainAccount.fetch(domainPDA);

            return {
                name: account.name,
                owner: account.owner,
                endpoint: account.endpoint,
                category: account.category,
                createdAt: account.createdAt.toNumber(),
                expiresAt: account.expiresAt.toNumber(),
                isListed: account.isListed,
                listPrice: account.listPrice.toNumber(),
            };
        } catch (e) {
            return null; // Domain doesn't exist
        }
    }

    /**
     * Resolve domain to endpoint
     */
    async resolve(name: string): Promise<string | null> {
        const domain = await this.getDomain(name);
        return domain?.endpoint || null;
    }

    /**
     * Transfer domain to new owner
     */
    async transferDomain(name: string, newOwner: PublicKey): Promise<string> {
        const [domainPDA] = getDomainPDA(name);

        const tx = await this.program.methods
            .transferDomain(name)
            .accounts({
                domain: domainPDA,
                owner: this.program.provider.publicKey,
                newOwner: newOwner,
            })
            .rpc();

        return tx;
    }

    /**
     * Update domain endpoint
     */
    async updateEndpoint(name: string, newEndpoint: string): Promise<string> {
        const [domainPDA] = getDomainPDA(name);

        const tx = await this.program.methods
            .updateEndpoint(name, newEndpoint)
            .accounts({
                domain: domainPDA,
                owner: this.program.provider.publicKey,
            })
            .rpc();

        return tx;
    }

    /**
     * List domain for sale
     */
    async listForSale(name: string, priceSOL: number): Promise<string> {
        const [domainPDA] = getDomainPDA(name);
        const priceLamports = priceSOL * 1_000_000_000;

        const tx = await this.program.methods
            .listForSale(name, new anchor.BN(priceLamports))
            .accounts({
                domain: domainPDA,
                owner: this.program.provider.publicKey,
            })
            .rpc();

        return tx;
    }

    /**
     * Buy a listed domain
     */
    async buyDomain(name: string): Promise<string> {
        const domain = await this.getDomain(name);

        if (!domain) {
            throw new Error('Domain not found');
        }

        if (!domain.isListed) {
            throw new Error('Domain is not for sale');
        }

        const [domainPDA] = getDomainPDA(name);

        const tx = await this.program.methods
            .buyDomain(name)
            .accounts({
                domain: domainPDA,
                buyer: this.program.provider.publicKey,
                seller: domain.owner,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    }

    /**
     * Renew domain (extend by 1 year)
     */
    async renewDomain(name: string): Promise<string> {
        const [domainPDA] = getDomainPDA(name);

        const tx = await this.program.methods
            .renewDomain(name)
            .accounts({
                domain: domainPDA,
                owner: this.program.provider.publicKey,
            })
            .rpc();

        return tx;
    }
}

/**
 * Simple resolver function (doesn't require wallet)
 */
export async function resolveDomain(
    connection: Connection,
    name: string
): Promise<string | null> {
    const [domainPDA] = getDomainPDA(name);

    try {
        const accountInfo = await connection.getAccountInfo(domainPDA);

        if (!accountInfo) {
            return null;
        }

        // Parse the endpoint from account data
        // This is a simplified version - real implementation would use anchor's decoder
        // The endpoint starts at a specific offset in the account data
        const data = accountInfo.data;

        // Skip discriminator (8) + name length (4) + name (32 max) + owner (32)
        // Then read endpoint
        // This is approximate - use anchor's fetch in production

        return null; // Use getDomain() for full parsing
    } catch (e) {
        return null;
    }
}
