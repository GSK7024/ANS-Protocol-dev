/**
 * Tests for the SDK Client
 * 
 * Testing the ANS SDK methods: resolve, discover, search, escrow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ANS, type Agent, type ANSConfig } from './index'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ANS SDK', () => {
    let sdk: ANS

    beforeEach(() => {
        vi.clearAllMocks()
        sdk = new ANS('test_api_key_123')
    })

    describe('Constructor', () => {
        it('should accept string API key', () => {
            const client = new ANS('my_key')
            expect(client).toBeDefined()
        })

        it('should accept config object', () => {
            const config: ANSConfig = {
                apiKey: 'my_key',
                baseUrl: 'https://custom.api.com',
                network: 'devnet'
            }
            const client = new ANS(config)
            expect(client).toBeDefined()
        })
    })

    describe('resolve()', () => {
        it('should resolve agent domain', async () => {
            const mockAgent: Agent = {
                name: 'marriott',
                owner: '0x123...',
                status: 'active',
                trust_score: 85,
                trust_tier: 'MASTER'
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockAgent)
            })

            const result = await sdk.resolve('agent://marriott')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/resolve?name=marriott'),
                expect.any(Object)
            )
            expect(result.name).toBe('marriott')
        })

        it('should strip agent:// prefix', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ name: 'test' })
            })

            await sdk.resolve('agent://test-agent')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('name=test-agent'),
                expect.any(Object)
            )
        })

        it('should throw on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: 'Agent not found' })
            })

            await expect(sdk.resolve('nonexistent')).rejects.toThrow('Agent not found')
        })
    })

    describe('discover()', () => {
        it('should return list of agents', async () => {
            const mockAgents: Agent[] = [
                { name: 'agent1', owner: '0x1', status: 'active' },
                { name: 'agent2', owner: '0x2', status: 'active' }
            ]

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ agents: mockAgents })
            })

            const result = await sdk.discover({ limit: 10 })

            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('agent1')
        })

        it('should pass options as query params', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ agents: [] })
            })

            await sdk.discover({
                limit: 5,
                category: 'Travel',
                verified: true
            })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=5'),
                expect.any(Object)
            )
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('category=Travel'),
                expect.any(Object)
            )
        })
    })

    describe('search()', () => {
        it('should search agents by query', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ agents: [{ name: 'hotel-finder' }] })
            })

            const result = await sdk.search({ q: 'hotel' })

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('q=hotel'),
                expect.any(Object)
            )
            expect(result).toHaveLength(1)
        })
    })

    describe('escrow', () => {
        it('should create escrow', async () => {
            const mockEscrow = {
                id: 'escrow_123',
                status: 'locked',
                amount: 5.0
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockEscrow)
            })

            const result = await sdk.escrow.create({
                seller: 'agent://marriott',
                amount: 5.0,
                service_details: 'Hotel booking'
            })

            expect(result.id).toBe('escrow_123')
            expect(result.amount).toBe(5.0)
        })

        it('should get escrow by ID', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'escrow_123', status: 'completed' })
            })

            const result = await sdk.escrow.get('escrow_123')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/escrow/escrow_123'),
                expect.any(Object)
            )
        })
    })
})
