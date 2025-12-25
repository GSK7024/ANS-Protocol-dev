import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

/**
 * ANS Demo Agent: agent://summarize
 * 
 * A real AI summarization agent powered by Gemini 2.0 Flash.
 * Summarizes articles, documents, papers, and any text content.
 * 
 * Price: 0.002 SOL per request
 * ANS Fee: 0.5% of transaction
 */

export async function POST(req: NextRequest) {
    try {
        const { text, url, style, max_length } = await req.json();

        if (!text && !url) {
            return NextResponse.json(
                { error: 'Missing required field: text or url' },
                { status: 400 }
            );
        }

        let contentToSummarize = text;

        // If URL provided, we'd fetch content (for now, require text)
        if (url && !text) {
            return NextResponse.json(
                { error: 'URL fetching not yet implemented. Please provide text directly.' },
                { status: 400 }
            );
        }

        // Build the summarization prompt
        const summaryStyle = style || 'concise';
        const summaryPrompt = `
You are an expert at summarizing content. Create a ${summaryStyle} summary of the following text.

Text to summarize:
---
${contentToSummarize}
---

Guidelines:
- Capture the key points and main ideas
- ${summaryStyle === 'bullet' ? 'Use bullet points for clarity' : 'Write in flowing paragraphs'}
- ${max_length ? `Keep the summary under ${max_length} words` : 'Be concise but comprehensive'}
- Maintain the original meaning and context
- Highlight any important data, statistics, or conclusions

Summary:
`;

        const startTime = Date.now();
        const content = await generateContent(summaryPrompt);
        const processingTime = Date.now() - startTime;

        const originalWords = contentToSummarize.split(/\s+/).length;
        const summaryWords = content.split(/\s+/).length;
        const reductionPercent = Math.round((1 - summaryWords / originalWords) * 100);

        return NextResponse.json({
            success: true,
            agent: 'agent://summarize',
            summary: content,
            metadata: {
                model: 'gemini-2.0-flash',
                processing_time_ms: processingTime,
                original_word_count: originalWords,
                summary_word_count: summaryWords,
                reduction_percent: reductionPercent,
                style: summaryStyle,
                price_sol: 0.002,
                ans_fee_percent: 0.5
            }
        });

    } catch (error: any) {
        console.error('Summarize Agent Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to summarize content',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// GET endpoint for agent discovery/info
export async function GET() {
    return NextResponse.json({
        agent: 'agent://summarize',
        name: 'AI Summarization Agent',
        description: 'Summarize articles, documents, papers, and any text content using AI.',
        version: '1.0.0',
        pricing: {
            amount: 0.002,
            currency: 'SOL',
            per: 'request'
        },
        endpoints: {
            summarize: {
                method: 'POST',
                body: {
                    text: 'string (required) - Text content to summarize',
                    url: 'string (optional, coming soon) - URL to fetch and summarize',
                    style: 'string (optional) - concise, detailed, bullet, executive',
                    max_length: 'number (optional) - Maximum words in summary'
                }
            }
        },
        capabilities: [
            'Article summaries',
            'Document summaries',
            'Research paper abstracts',
            'Meeting notes condensation',
            'Book chapter summaries',
            'Email thread summaries'
        ],
        summary_styles: [
            'concise - Brief overview',
            'detailed - Comprehensive summary',
            'bullet - Bullet point format',
            'executive - Business-focused summary'
        ],
        trust_score: 100,
        verified: true
    });
}
