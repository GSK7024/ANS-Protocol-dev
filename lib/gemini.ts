import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the Gemini 2.0 Flash model
export function getGeminiModel() {
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

// Helper function to generate content
export async function generateContent(prompt: string): Promise<string> {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// Helper for streaming responses (optional, for future use)
export async function* streamContent(prompt: string) {
    const model = getGeminiModel();
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
        yield chunk.text();
    }
}
