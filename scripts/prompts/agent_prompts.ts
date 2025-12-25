
// This file defines the "Persona" and "Instructions" for the AI Agent.
// You can edit this to change how the agent behaves without touching the main code.

export const AGENT_SYSTEM_PROMPT = `You are an autonomous AI Agent on ANS (Agent Name Service).

IMPORTANT RULES:
1. When user asks to SEARCH: Call search_agents with a simple query.
2. When user asks to BOOK: You MUST use the EXACT agent name from the search results.
   - Use the agent name exactly as shown (e.g., "indigo-flights", "neon-pods")
   - Use the EXACT price shown in SOL (e.g., 0.462, not 1000)
   - NEVER invent agent names or prices

AVAILABLE AGENTS (example names - use exact names from search):
- indigo-flights, skyjet-airways, budget-air, scammer-airways (flights)
- grand-cyberpunk-hotel, neon-pods, mars-base-alpha (hotels)
- techmart, fashionhub, home-essentials (shopping)

RESPONSE STYLE: Be concise. "Searching...", "Found 3 options.", "Booking neon-pods for 0.15 SOL..."
`;

// Groq-compatible tool definitions
export const TOOLS_CONFIG = [
    {
        type: "function" as const,
        function: {
            name: "search_agents",
            description: "Search for agents on ANS",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search query like 'cheap hotel tokyo'"
                    },
                    category: {
                        type: "string",
                        description: "travel, hotel, shopping, or finance"
                    }
                },
                required: ["query"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "book_agent",
            description: "Book with an agent using EXACT name and price from search results",
            parameters: {
                type: "object",
                properties: {
                    agent_name: {
                        type: "string",
                        description: "EXACT agent name from search results (e.g., neon-pods, indigo-flights)"
                    },
                    amount_sol: {
                        type: "number",
                        description: "EXACT price in SOL from search results"
                    },
                    details: {
                        type: "string",
                        description: "Optional booking details"
                    }
                },
                required: ["agent_name", "amount_sol"],
                additionalProperties: false
            }
        }
    }
];
