/**
 * Agent Vault Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for personal data storage.
 * Uses VAULT_SYSTEM_KEY for encryption (set in .env.local)
 */

import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const VAULT_SALT = 'nexus-vault-salt';

/**
 * Get system encryption key from environment
 * This key is used for ALL vault encryption/decryption
 */
export function getSystemKey(): Buffer {
    const systemKey = process.env.VAULT_SYSTEM_KEY;
    if (!systemKey) {
        throw new Error('VAULT_SYSTEM_KEY not set in environment');
    }

    // Derive 256-bit key from the system key
    return crypto.pbkdf2Sync(
        systemKey,
        VAULT_SALT,
        100000,
        32,
        'sha256'
    );
}

/**
 * @deprecated Use getSystemKey() instead
 * Derive encryption key from wallet signature (for backward compatibility)
 */
export function deriveKeyFromSignature(signature: string): Buffer {
    return crypto.pbkdf2Sync(
        signature,
        VAULT_SALT,
        100000,
        32,
        'sha256'
    );
}

/**
 * Encrypt personal data for vault storage
 */
export function encryptVaultData(
    data: Record<string, any>,
    encryptionKey: Buffer
): { encrypted: Buffer; iv: string; hash: string } {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

    // Encrypt the JSON data
    const jsonData = JSON.stringify(data);
    const encrypted = Buffer.concat([
        cipher.update(jsonData, 'utf8'),
        cipher.final()
    ]);

    // Get auth tag for integrity verification
    const authTag = cipher.getAuthTag();

    // Combine encrypted data with auth tag
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    // Create hash of original data for integrity check
    const hash = crypto.createHash('sha256').update(jsonData).digest('hex');

    return {
        encrypted: encryptedWithTag,
        iv: iv.toString('base64'),
        hash
    };
}

/**
 * Decrypt vault data
 */
export function decryptVaultData(
    encryptedData: Buffer,
    iv: string,
    encryptionKey: Buffer
): Record<string, any> {
    const ivBuffer = Buffer.from(iv, 'base64');

    // Separate encrypted data and auth tag
    const authTag = encryptedData.subarray(-AUTH_TAG_LENGTH);
    const encrypted = encryptedData.subarray(0, -AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, ivBuffer);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Validate that decrypted data matches original hash
 */
export function verifyDataIntegrity(data: Record<string, any>, expectedHash: string): boolean {
    const hash = crypto.createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
    return hash === expectedHash;
}

/**
 * Extract only requested fields from vault data
 * This ensures sellers only get what they need
 */
export function extractFields(
    vaultData: Record<string, any>,
    requestedFields: string[]
): Record<string, any> {
    const extracted: Record<string, any> = {};

    for (const field of requestedFields) {
        if (vaultData[field] !== undefined) {
            extracted[field] = vaultData[field];
        }
    }

    return extracted;
}
