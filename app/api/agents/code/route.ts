import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

/**
 * ANS Demo Agent: agent://code
 * 
 * A real AI coding assistant powered by Gemini 2.0 Flash.
 * Writes, explains, debugs, and reviews code in any language.
 * 
 * Price: 0.005 SOL per request
 * ANS Fee: 0.5% of transaction
 */

export async function POST(req: NextRequest) {
    try {
        const { task, code, language } = await req.json();

        if (!task) {
            return NextResponse.json(
                { error: 'Missing required field: task' },
                { status: 400 }
            );
        }

        // Build the coding prompt
        const codingPrompt = `
You are an expert software engineer and coding assistant. Help the user with their code request.

Task: ${task}
${language ? `Programming Language: ${language}` : ''}
${code ? `\nExisting Code:\n\`\`\`\n${code}\n\`\`\`` : ''}

Guidelines:
- Provide clean, well-documented code
- Follow best practices for the language
- Include comments explaining complex logic
- If debugging, identify the issue and fix it
- If writing new code, make it production-ready

Response:
`;

        const startTime = Date.now();
        const content = await generateContent(codingPrompt);
        const processingTime = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            agent: 'agent://code',
            content: content,
            metadata: {
                model: 'gemini-2.0-flash',
                processing_time_ms: processingTime,
                language: language || 'auto-detected',
                price_sol: 0.005,
                ans_fee_percent: 0.5
            }
        });

    } catch (error: any) {
        console.error('Code Agent Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process code request',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// GET endpoint for agent discovery/info
export async function GET() {
    return NextResponse.json({
        agent: 'agent://code',
        name: 'AI Code Assistant',
        description: 'Write, debug, explain, and review code in any programming language using AI.',
        version: '1.0.0',
        pricing: {
            amount: 0.005,
            currency: 'SOL',
            per: 'request'
        },
        endpoints: {
            generate: {
                method: 'POST',
                body: {
                    task: 'string (required) - What you need help with',
                    code: 'string (optional) - Existing code to work with',
                    language: 'string (optional) - Programming language'
                }
            }
        },
        capabilities: [
            'Write new code',
            'Debug existing code',
            'Code review',
            'Refactoring',
            'Add comments/documentation',
            'Convert between languages',
            'Explain code',
            'Write tests'
        ],
        supported_languages: [
            'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go',
            'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
            'Solidity', 'SQL', 'Bash', 'and more...'
        ],
        trust_score: 100,
        verified: true
    });
}
