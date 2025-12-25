/**
 * Hybrid Caching Layer
 * 
 * Provides a unified caching interface that switches strategy based on environment:
 * - Development: In-Memory Map (Fast, no setup needed)
 * - Production: Redis (Distributed, scalable)
 */

import Redis from 'ioredis';

// Cache Configuration
const DEFAULT_TTL = 60; // 60 seconds
const SKEW_PROTECTION = 600; // 10 minutes random skew for stampede protection

// Redis Client (Singleton)
let redis: Redis | null = null;
const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL;

if (isProduction || redisUrl) {
    try {
        redis = new Redis(redisUrl || 'redis://localhost:6379');
        console.log('🔌 [CACHE] Connected to Redis');
    } catch (e) {
        console.warn('⚠️ [CACHE] Failed to connect to Redis, falling back to memory');
    }
}

// In-Memory Fallback
const memoryCache = new Map<string, { val: any, exp: number }>();

export const cache = {
    /**
     * Get item from cache
     */
    async get<T>(key: string): Promise<T | null> {
        // 1. Try Redis
        if (redis) {
            try {
                const data = await redis.get(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                // Redis fail -> Fallback or return null
            }
        }

        // 2. Try Memory
        const item = memoryCache.get(key);
        if (item) {
            if (Date.now() > item.exp) {
                memoryCache.delete(key);
                return null;
            }
            return item.val as T;
        }

        return null;
    },

    /**
     * Set item in cache
     */
    async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
        // 1. Set Redis
        if (redis) {
            try {
                await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            } catch (e) {
                // Ignore redis set errors
            }
        }

        // 2. Set Memory (Always keep local hot cache or if redis missing)
        // Note: In serverless, memory cache is per-instance and ephemeral
        memoryCache.set(key, {
            val: value,
            exp: Date.now() + (ttlSeconds * 1000)
        });
    },

    /**
     * Delete item from cache
     */
    async del(key: string): Promise<void> {
        if (redis) await redis.del(key);
        memoryCache.delete(key);
    },

    // Alias for compatibility
    async delete(key: string): Promise<void> {
        return this.del(key);
    },

    /**
     * Helper: Get or Set
     * Wraps a db call with caching
     */
    async fetch<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = DEFAULT_TTL
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        const fresh = await fetchFn();
        if (fresh) {
            await this.set(key, fresh, ttl);
        }
        return fresh;
    }
};
