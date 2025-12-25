import { NextResponse } from 'next/server';

/**
 * ANS Agent Registry API
 * 
 * Returns a list of all registered demo agents.
 * This is the discovery layer - how other agents find services.
 */

const REGISTERED_AGENTS = [
    {
        name: 'send-sol',
        fullName: 'agent://send-sol',
        displayName: 'Crypto Transfer Agent',
        description: 'Send SOL to any agent://name or wallet. Resolves names automatically.',
        endpoint: '/api/agents/send-sol',
        pricing: { amount: 0.5, currency: '%', per: 'transfer' },
        wallet: '6oWGBnG4ebgeKLabmyn737rpfnh9gh5Z5A1oYdynNGv',
        category: 'payments',
        capabilities: ['Send SOL', 'Resolve agent names', 'Real transactions'],
        trustScore: 100,
        verified: true,
        active: true,
        featured: true
    },
    {
        name: 'book-flight',
        fullName: 'agent://book-flight',
        displayName: 'Flight Booking Agent',
        description: 'Search and book flights worldwide. Integrated with major airlines.',
        endpoint: '/api/agents/book-flight',
        pricing: { amount: 0.02, currency: 'SOL', per: 'search' },
        wallet: '8ACcM28Zc7v7XNFk6GgbvzKPYrVbMDNv9VNtFywhnwps',
        category: 'travel',
        capabilities: ['Search flights', 'Book tickets', 'E-tickets'],
        trustScore: 95,
        verified: true,
        active: true,
        featured: true
    },
    {
        name: 'book-hotel',
        fullName: 'agent://book-hotel',
        displayName: 'Hotel Booking Agent',
        description: 'Search and book hotels worldwide. Best price guarantee.',
        endpoint: '/api/agents/book-hotel',
        pricing: { amount: 0.015, currency: 'SOL', per: 'search' },
        wallet: '8YhARPVh8nVV9fE9ZfWLEKP21AithmB4TYcGE26pxJdC',
        category: 'travel',
        capabilities: ['Search hotels', 'Filter by price', 'Instant booking'],
        trustScore: 92,
        verified: true,
        active: true,
        featured: true
    },
    {
        name: 'writer',
        fullName: 'agent://writer',
        displayName: 'AI Writer Agent',
        description: 'Generate blog posts, emails, marketing copy, and any text content using AI.',
        endpoint: '/api/agents/writer',
        pricing: { amount: 0.01, currency: 'SOL', per: 'request' },
        wallet: '8ACcM28Zc7v7XNFk6GgbvzKPYrVbMDNv9VNtFywhnwps',
        category: 'content',
        capabilities: ['Blog posts', 'Email drafts', 'Marketing copy', 'Creative writing'],
        trustScore: 100,
        verified: true,
        active: true
    },
    {
        name: 'code',
        fullName: 'agent://code',
        displayName: 'AI Code Assistant',
        description: 'Write, debug, explain, and review code in any programming language using AI.',
        endpoint: '/api/agents/code',
        pricing: { amount: 0.005, currency: 'SOL', per: 'request' },
        wallet: '8YhARPVh8nVV9fE9ZfWLEKP21AithmB4TYcGE26pxJdC',
        category: 'development',
        capabilities: ['Write code', 'Debug', 'Code review', 'Documentation'],
        trustScore: 100,
        verified: true,
        active: true
    },
    {
        name: 'summarize',
        fullName: 'agent://summarize',
        displayName: 'AI Summarization Agent',
        description: 'Summarize articles, documents, papers, and any text content using AI.',
        endpoint: '/api/agents/summarize',
        pricing: { amount: 0.002, currency: 'SOL', per: 'request' },
        wallet: '6ds6c2xMgrbJbNQUvMYg3qJyKC4aRnw125579gyKYJ18',
        category: 'productivity',
        capabilities: ['Article summaries', 'Document summaries', 'Meeting notes'],
        trustScore: 100,
        verified: true,
        active: true
    }
];

export async function GET() {
    return NextResponse.json({
        protocol: 'ANS',
        version: '1.0.0',
        network: 'solana-devnet',
        description: 'Agent Name Service - The DNS for AI Agents',
        total_agents: REGISTERED_AGENTS.length,
        transaction_fee_percent: 0.5,
        agents: REGISTERED_AGENTS
    });
}
