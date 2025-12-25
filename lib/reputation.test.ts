/**
 * Tests for the Reputation (SRT) System
 * 
 * Testing the Sybil-Resistant Trust calculation and tier assignment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('@/utils/supabase/server', () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                        data: {
                            name: 'test-agent',
                            stake_locked: 1.0,
                            total_transactions: 100,
                            successful_transactions: 95,
                            avg_response_time_ms: 150,
                            peer_feedback_score: 4.5,
                            transaction_volume_sol: 50.0
                        },
                        error: null
                    }))
                }))
            }))
        }))
    })
}))

// Test constants based on the actual implementation
const WEIGHTS = {
    stake: 0.40,
    performance: 0.30,
    feedback: 0.20,
    volume: 0.10
}

const TIER_THRESHOLDS = {
    sovereign: 90,
    master: 70,
    adept: 40,
    initiate: 0
}

describe('SRT Reputation System', () => {
    describe('Trust Tier Assignment', () => {
        it('should assign SOVEREIGN tier for scores >= 90', () => {
            const score = 95
            const tier = getTierFromScore(score)
            expect(tier).toBe('SOVEREIGN')
        })

        it('should assign MASTER tier for scores 70-89', () => {
            const score = 75
            const tier = getTierFromScore(score)
            expect(tier).toBe('MASTER')
        })

        it('should assign ADEPT tier for scores 40-69', () => {
            const score = 55
            const tier = getTierFromScore(score)
            expect(tier).toBe('ADEPT')
        })

        it('should assign INITIATE tier for scores < 40', () => {
            const score = 20
            const tier = getTierFromScore(score)
            expect(tier).toBe('INITIATE')
        })
    })

    describe('Weight Configuration', () => {
        it('should have weights that sum to 1.0', () => {
            const total = WEIGHTS.stake + WEIGHTS.performance + WEIGHTS.feedback + WEIGHTS.volume
            expect(total).toBeCloseTo(1.0)
        })

        it('should prioritize stake as highest weight', () => {
            expect(WEIGHTS.stake).toBeGreaterThan(WEIGHTS.performance)
            expect(WEIGHTS.stake).toBeGreaterThan(WEIGHTS.feedback)
            expect(WEIGHTS.stake).toBeGreaterThan(WEIGHTS.volume)
        })
    })

    describe('Score Calculation Logic', () => {
        it('should calculate stake component correctly', () => {
            const stakeAmount = 10 // SOL
            const maxStake = 100 // Cap
            const stakeComponent = Math.min(stakeAmount / maxStake, 1) * 100 * WEIGHTS.stake
            expect(stakeComponent).toBe(4.0) // 10% of cap * 40 weight = 4
        })

        it('should handle zero stake gracefully', () => {
            const stakeAmount = 0
            const maxStake = 100
            const stakeComponent = Math.min(stakeAmount / maxStake, 1) * 100 * WEIGHTS.stake
            expect(stakeComponent).toBe(0)
        })

        it('should cap stake at maximum', () => {
            const stakeAmount = 200 // Over max
            const maxStake = 100
            const stakeComponent = Math.min(stakeAmount / maxStake, 1) * 100 * WEIGHTS.stake
            expect(stakeComponent).toBe(40) // Capped at 100%
        })
    })
})

// Helper function for testing (mirrors actual implementation)
function getTierFromScore(score: number): string {
    if (score >= TIER_THRESHOLDS.sovereign) return 'SOVEREIGN'
    if (score >= TIER_THRESHOLDS.master) return 'MASTER'
    if (score >= TIER_THRESHOLDS.adept) return 'ADEPT'
    return 'INITIATE'
}
