import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_FUNCTIONS, BUYER_AI_SYSTEM_PROMPT } from '@/lib/aiFunctions';
import { executeAIFunction } from '@/lib/aiFunctionHandlers';

/**
 * AI Chat API for Buyer Agent - Powered by Gemini 2.5 Flash
 * 
 * Features:
 * - Natural language flight booking
 * - Function calling for real API interactions
 * - Multi-turn conversation with context
 * - Automatic retries and error handling
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Convert OpenAI function format to Gemini format
function convertToGeminiFunctions(functions: any[]) {
    return functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: {
            type: 'OBJECT' as const,
            properties: Object.entries(fn.parameters.properties || {}).reduce((acc: any, [key, value]: [string, any]) => {
                acc[key] = convertProperty(value);
                return acc;
            }, {}),
            required: fn.parameters.required || []
        }
    }));
}

function convertProperty(prop: any): any {
    const result: any = {
        type: mapType(prop.type),
        description: prop.description
    };

    if (prop.enum) {
        result.enum = prop.enum;
    }

    // Handle array items
    if (prop.type === 'array' && prop.items) {
        result.items = convertProperty(prop.items);
    }

    // Handle nested object properties
    if (prop.type === 'object' && prop.properties) {
        result.properties = Object.entries(prop.properties).reduce((acc: any, [key, value]: [string, any]) => {
            acc[key] = convertProperty(value);
            return acc;
        }, {});
        if (prop.required) {
            result.required = prop.required;
        }
    }

    return result;
}

function mapType(type: string): string {
    switch (type) {
        case 'string': return 'STRING';
        case 'number':
        case 'integer': return 'NUMBER';
        case 'boolean': return 'BOOLEAN';
        case 'array': return 'ARRAY';
        case 'object': return 'OBJECT';
        default: return 'STRING';
    }
}

export async function POST(req: NextRequest) {
    try {
        const { messages, walletAddress, conversationId } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({
                error: 'Messages array required'
            }, { status: 400 });
        }

        // Initialize Gemini model with function calling
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: BUYER_AI_SYSTEM_PROMPT,
            tools: [{
                functionDeclarations: convertToGeminiFunctions(AI_FUNCTIONS)
            }]
        });

        // Build conversation history - Gemini requires first message to be 'user'
        let historyMessages = messages.slice(0, -1);

        // Find first user message and start from there
        const firstUserIndex = historyMessages.findIndex((msg: any) => msg.role === 'user');
        if (firstUserIndex > 0) {
            historyMessages = historyMessages.slice(firstUserIndex);
        }

        // Filter to only include user and assistant messages, skip system/welcome
        const history = historyMessages
            .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
            .map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // Ensure history starts with user (Gemini requirement)
        const validHistory = history.length > 0 && history[0].role === 'user' ? history : [];

        // Start chat
        const chat = model.startChat({
            history: validHistory,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        });

        // Get the latest user message
        const userMessage = messages[messages.length - 1].content;

        // Send message and get response
        let result = await chat.sendMessage(userMessage);
        let response = result.response;

        // Handle function calls
        const functionResults: any[] = [];
        const maxIterations = 5;
        let iteration = 0;

        while (response.functionCalls() && iteration < maxIterations) {
            const functionCalls = response.functionCalls();

            for (const call of functionCalls!) {
                const functionName = call.name;
                const functionArgs = call.args;

                console.log(`🤖 [GEMINI] Calling function: ${functionName}`, functionArgs);

                // Execute the function
                const fnResult = await executeAIFunction(
                    functionName,
                    functionArgs as any,
                    walletAddress
                );
                functionResults.push({ name: functionName, result: fnResult });

                console.log(`   ✅ Function result:`, JSON.stringify(fnResult).substring(0, 200));

                // Send function result back to Gemini
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: functionName,
                        response: fnResult
                    }
                }]);
                response = result.response;
            }

            iteration++;
        }

        // Get final text response
        const textResponse = response.text();

        // Track usage for analytics (optional)
        const usage = {
            promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
            completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: result.response.usageMetadata?.totalTokenCount || 0
        };

        return NextResponse.json({
            success: true,
            message: textResponse,
            functionsCalled: functionResults.map(f => f.name),
            functionsResults: functionResults,
            usage,
            model: 'gemini-2.5-flash'
        });

    } catch (err: any) {
        console.error('AI Chat error:', err);

        // Handle specific Gemini errors
        if (err.message?.includes('API_KEY')) {
            return NextResponse.json({
                error: 'AI service configuration error',
                hint: 'GEMINI_API_KEY not configured'
            }, { status: 500 });
        }

        if (err.message?.includes('quota') || err.message?.includes('limit')) {
            return NextResponse.json({
                error: 'AI service rate limit reached',
                hint: 'Please try again in a moment'
            }, { status: 429 });
        }

        return NextResponse.json({
            error: err.message || 'AI processing failed',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
