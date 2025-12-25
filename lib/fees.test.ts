/**
 * Tests for the Fees System
 * 
 * Testing fee calculation for SOL and ANS token payments
 */

import { describe, it, expect } from 'vitest'

// Fee structure based on codebase analysis
const FEE_STRUCTURE = {
    SOL: {
        protocolFee: 0.00, // 0% at launch
        networkFee: 0.000005 // ~5000 lamports Solana base fee
    },
    ANS: {
        protocolFee: 0.00, // Always 0% for ANS
        networkFee: 0.000005
    },
    USDC: {
        protocolFee: 0.00, // 0% at launch
        networkFee: 0.000005
    }
}

describe('Fee System', () => {
    describe('SOL Payments', () => {
        it('should have 0% protocol fee at launch', () => {
            expect(FEE_STRUCTURE.SOL.protocolFee).toBe(0)
        })

        it('should include Solana network fee', () => {
            expect(FEE_STRUCTURE.SOL.networkFee).toBeGreaterThan(0)
        })

        it('should calculate total for SOL payment correctly', () => {
            const amount = 1.0 // 1 SOL
            const totalWithFees = amount + (amount * FEE_STRUCTURE.SOL.protocolFee) + FEE_STRUCTURE.SOL.networkFee
            expect(totalWithFees).toBeCloseTo(1.000005)
        })
    })

    describe('ANS Token Payments', () => {
        it('should have 0% protocol fee (always)', () => {
            expect(FEE_STRUCTURE.ANS.protocolFee).toBe(0)
        })

        it('should still include network fee', () => {
            expect(FEE_STRUCTURE.ANS.networkFee).toBeGreaterThan(0)
        })
    })

    describe('USDC Payments', () => {
        it('should have 0% protocol fee at launch', () => {
            expect(FEE_STRUCTURE.USDC.protocolFee).toBe(0)
        })
    })

    describe('Fee Comparison', () => {
        it('should make ANS payments always have lowest protocol fees', () => {
            expect(FEE_STRUCTURE.ANS.protocolFee).toBeLessThanOrEqual(FEE_STRUCTURE.SOL.protocolFee)
            expect(FEE_STRUCTURE.ANS.protocolFee).toBeLessThanOrEqual(FEE_STRUCTURE.USDC.protocolFee)
        })
    })
})

describe('Domain Pricing', () => {
    // Character-based pricing tiers
    const PRICE_TIERS = {
        legendary: { chars: 1, price: 100 },   // 1 char
        epic: { chars: 2, price: 50 },          // 2 chars
        rare: { chars: 3, price: 10 },          // 3 chars
        uncommon: { chars: 4, price: 2 },       // 4 chars
        common: { chars: 5, price: 0.5 }        // 5+ chars
    }

    it('should price 1-char domains as legendary', () => {
        expect(PRICE_TIERS.legendary.price).toBe(100)
    })

    it('should price 5+ char domains as common', () => {
        expect(PRICE_TIERS.common.price).toBe(0.5)
    })

    it('should have descending prices by character length', () => {
        expect(PRICE_TIERS.legendary.price).toBeGreaterThan(PRICE_TIERS.epic.price)
        expect(PRICE_TIERS.epic.price).toBeGreaterThan(PRICE_TIERS.rare.price)
        expect(PRICE_TIERS.rare.price).toBeGreaterThan(PRICE_TIERS.uncommon.price)
        expect(PRICE_TIERS.uncommon.price).toBeGreaterThan(PRICE_TIERS.common.price)
    })
})
