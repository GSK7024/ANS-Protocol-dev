/**
 * API Key Authentication Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashApiKey, generateApiKey, hasPermission, ApiKeyInfo } from './apiKeyAuth';

describe('API Key Utilities', () => {
    describe('hashApiKey', () => {
        it('should return consistent hash for same key', () => {
            const key = 'ans_test123';
            const hash1 = hashApiKey(key);
            const hash2 = hashApiKey(key);

            expect(hash1).toBe(hash2);
        });

        it('should return different hashes for different keys', () => {
            const hash1 = hashApiKey('ans_key1');
            const hash2 = hashApiKey('ans_key2');

            expect(hash1).not.toBe(hash2);
        });

        it('should return 64 character hex string (SHA256)', () => {
            const hash = hashApiKey('ans_test');

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]+$/);
        });
    });

    describe('generateApiKey', () => {
        it('should generate key with default prefix', () => {
            const key = generateApiKey();

            expect(key).toMatch(/^ans_[a-f0-9]{48}$/);
        });

        it('should generate key with custom prefix', () => {
            const key = generateApiKey('test');

            expect(key).toMatch(/^test_[a-f0-9]{48}$/);
        });

        it('should generate unique keys', () => {
            const key1 = generateApiKey();
            const key2 = generateApiKey();

            expect(key1).not.toBe(key2);
        });
    });

    describe('hasPermission', () => {
        const mockKey: ApiKeyInfo = {
            id: 'key-123',
            name: 'Test Key',
            wallet_address: 'wallet123',
            permissions: ['read', 'escrow:create'],
            rate_limit: 100,
            created_at: '2024-01-01',
            last_used_at: null,
        };

        it('should return true for matching permission', () => {
            expect(hasPermission(mockKey, 'read')).toBe(true);
            expect(hasPermission(mockKey, 'escrow:create')).toBe(true);
        });

        it('should return false for missing permission', () => {
            expect(hasPermission(mockKey, 'write')).toBe(false);
            expect(hasPermission(mockKey, 'admin')).toBe(false);
        });

        it('should return true for wildcard permission', () => {
            const adminKey: ApiKeyInfo = {
                ...mockKey,
                permissions: ['*'],
            };

            expect(hasPermission(adminKey, 'anything')).toBe(true);
            expect(hasPermission(adminKey, 'admin:delete')).toBe(true);
        });

        it('should handle empty permissions array', () => {
            const emptyKey: ApiKeyInfo = {
                ...mockKey,
                permissions: [],
            };

            expect(hasPermission(emptyKey, 'read')).toBe(false);
        });
    });
});
