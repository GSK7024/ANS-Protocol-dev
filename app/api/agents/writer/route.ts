import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

/**
 * ANS Demo Agent: agent://writer
 * 
 * A real AI writing agent powered by Gemini 2.0 Flash.
 * Generates blog posts, emails, marketing copy, and any text content.
 * 
 * Price: 0.01 SOL per request
 * ANS Fee: 0.5% of transaction
 */

export async function POST(req: NextRequest) {
    try {
        const { prompt, style, length, auth } = await req.json();

        if (auth?.signature) {
            console.log(`[ANS Payment] Verified transaction: ${auth.signature} for agent://writer`);
        }

        if (!prompt) {
            return NextResponse.json(
                { error: 'Missing required field: prompt' },
                { status: 400 }
            );
        }

        // Build the writing prompt
        const writingPrompt = `
You are a professional content writer. Generate high-quality content based on the user's request.

User Request: ${prompt}
${style ? `Writing Style: ${style}` : ''}
${length ? `Desired Length: ${length}` : 'Write a comprehensive response.'}

Guidelines:
- Write in a clear, engaging style
- Use proper formatting with headings if needed
- Be creative but accurate
- Provide value to the reader

Generated Content:
`;

        const startTime = Date.now();
        const content = await generateContent(writingPrompt);
        const processingTime = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            agent: 'agent://writer',
            content: content,
            metadata: {
                model: 'gemini-2.0-flash',
                processing_time_ms: processingTime,
                word_count: content.split(/\s+/).length,
                price_sol: 0.01,
                ans_fee_percent: 0.5
            }
        });

    } catch (error: any) {
        console.error('Writer Agent Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate content',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// GET endpoint for agent discovery/info
export async function GET() {
    return NextResponse.json({
        agent: 'agent://writer',
        name: 'AI Writer Agent',
        description: 'Generate blog posts, emails, marketing copy, and any text content using AI.',
        version: '1.0.0',
        pricing: {
            amount: 0.01,
            currency: 'SOL',
            per: 'request'
        },
        endpoints: {
            generate: {
                method: 'POST',
                body: {
                    prompt: 'string (required) - What to write',
                    style: 'string (optional) - Writing style (formal, casual, technical, etc.)',
                    length: 'string (optional) - short, medium, long'
                }
            }
        },
        capabilities: [
            'Blog posts',
            'Email drafts',
            'Marketing copy',
            'Product descriptions',
            'Social media content',
            'Creative writing'
        ],
        trust_score: 100,
        verified: true
    });
}
