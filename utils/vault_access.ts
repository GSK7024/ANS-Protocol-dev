/**
 * Vault Access Service
 * 
 * Internal service for NEXUS to access vault data on behalf of verified sellers.
 * This is the privacy middleware - it fetches only required fields and logs access.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// System-level decryption key (used for internal access)
// In production, this should be a secure key management system
const SYSTEM_KEY = process.env.VAULT_SYSTEM_KEY || 'nexus-system-key-change-in-production';

interface VaultAccessResult {
    success: boolean;
    data?: Record<string, any>;
    error?: string;
    fields_accessed?: string[];
}

/**
 * Get seller's required fields
 */
export async function getSellerRequirements(sellerAgent: string): Promise<{
    required_fields: string[];
    optional_fields: string[];
}> {
    const { data } = await supabase
        .from('seller_requirements')
        .select('required_fields, optional_fields')
        .eq('seller_agent', sellerAgent.replace('agent://', ''))
        .single();

    return {
        required_fields: data?.required_fields || [],
        optional_fields: data?.optional_fields || []
    };
}

/**
 * Access buyer's vault data for a seller's requirements
 * This is the core privacy function - only called by NEXUS internally
 */
export async function accessVaultForSeller(
    buyerAgent: string,
    sellerAgent: string,
    purpose: string,
    escrowId?: string
): Promise<VaultAccessResult> {
    const buyerName = buyerAgent.replace('agent://', '');
    const sellerName = sellerAgent.replace('agent://', '');

    try {
        // 1. Get seller's requirements
        const requirements = await getSellerRequirements(sellerName);

        if (requirements.required_fields.length === 0) {
            return {
                success: true,
                data: {},
                fields_accessed: []
            };
        }

        // 2. Get buyer's vault
        const { data: vault, error } = await supabase
            .from('agent_vaults')
            .select('encrypted_data, encryption_iv, data_hash')
            .eq('agent_name', buyerName)
            .single();

        if (error || !vault) {
            return {
                success: false,
                error: `Buyer vault not found for agent://${buyerName}`
            };
        }

        // 3. Decrypt vault data using system key
        // In production, this might use a different approach (e.g., buyer grants access)
        const decrypted = decryptWithSystemKey(
            vault.encrypted_data,
            vault.encryption_iv
        );

        if (!decrypted) {
            return {
                success: false,
                error: 'Failed to access vault data'
            };
        }

        // 4. Extract only required fields
        const extractedData: Record<string, any> = {};
        for (const field of requirements.required_fields) {
            if (decrypted[field] !== undefined) {
                extractedData[field] = decrypted[field];
            }
        }

        // 5. Include optional fields if present
        for (const field of requirements.optional_fields) {
            if (decrypted[field] !== undefined) {
                extractedData[field] = decrypted[field];
            }
        }

        // 6. Log the access
        await supabase.from('vault_access_log').insert({
            vault_agent: buyerName,
            accessor_agent: sellerName,
            fields_accessed: Object.keys(extractedData),
            purpose,
            escrow_id: escrowId || null
        });

        console.log(`🔓 [VAULT ACCESS] ${sellerName} accessed ${Object.keys(extractedData).length} fields from ${buyerName}`);

        return {
            success: true,
            data: extractedData,
            fields_accessed: Object.keys(extractedData)
        };

    } catch (err) {
        console.error('Vault access error:', err);
        return {
            success: false,
            error: 'Internal vault access error'
        };
    }
}

/**
 * System-level decryption (for NEXUS internal use)
 * In production, implement proper key management
 */
function decryptWithSystemKey(
    encryptedData: any,
    iv: string
): Record<string, any> | null {
    try {
        // Derive system key
        const key = crypto.pbkdf2Sync(
            SYSTEM_KEY,
            'nexus-vault-salt',
            100000,
            32,
            'sha256'
        );

        const ivBuffer = Buffer.from(iv, 'base64');
        const encrypted = Buffer.from(encryptedData);

        // Separate auth tag
        const authTag = encrypted.subarray(-16);
        const ciphertext = encrypted.subarray(0, -16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);

        return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
        console.error('System decryption error:', err);
        return null;
    }
}

/**
 * Get access log for a vault (for user transparency)
 */
export async function getVaultAccessLog(agentName: string): Promise<any[]> {
    const { data } = await supabase
        .from('vault_access_log')
        .select('*')
        .eq('vault_agent', agentName)
        .order('accessed_at', { ascending: false })
        .limit(50);

    return data || [];
}
