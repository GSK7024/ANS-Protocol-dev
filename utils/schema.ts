import { z } from 'zod';

// --- The Neural Manifest Schema (AML v1.0) ---

// 1. Skill Schema: Defines a single capability
export const SkillSchema = z.object({
    name: z.string().min(1, "Skill name is required"),
    description: z.string().optional(),
    inputs: z.record(z.string()).optional(), // e.g. { "city": "string" }
    outputs: z.record(z.string()).optional(), // e.g. { "flight_id": "string" }

    // Real-Time Dynamics
    dynamic: z.boolean().optional(), // If true, the price/availability in manifest is just an ESTIMATE
    quote_url: z.string().url().optional(), // The endpoint to fetch the real-time quote

    pricing: z.object({
        amount: z.number().min(0),
        currency: z.enum(['SOL', 'USDC', 'FREE'])
    }).optional()
});

// 2. The Main Manifest Schema
export const AgentManifestSchema = z.object({
    identity: z.string().startsWith('agent://', "Identity must start with 'agent://'"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (x.y.z)"),
    description: z.string().max(500, "Description too long"),

    // Core Metadata
    category: z.enum([
        'Finance', 'Travel', 'Healthcare', 'Education', 'Utility',
        'Social', 'Gaming', 'DeFi', 'Governance', 'Other'
    ]).default('Other'),

    tags: z.array(z.string()).max(10, "Too many tags").default([]),

    // Capabilities
    skills: z.array(z.union([z.string(), SkillSchema]))
        .transform(items => items.map(item => {
            // Normalize plain strings to Skill objects
            if (typeof item === 'string') return { name: item, description: '', pricing: { amount: 0, currency: 'FREE' } };
            return item;
        })),

    // Operational Info
    jurisdiction: z.string().optional(),
    repository: z.string().url().optional(),
    image: z.string().url().optional(),

    // Viral Discovery (Web of Trust)
    peers: z.array(z.string().url()).optional(), // List of other agent.json URLs

    // Economy
    payment: z.object({
        receiver: z.string(), // Solana Public Key
        accepted_tokens: z.array(z.string()).default(['SOL', 'USDC'])
    }).optional()
});

export type AgentManifest = z.infer<typeof AgentManifestSchema>;
export type Skill = z.infer<typeof SkillSchema>;

// Helper to validate raw JSON
export function validateManifest(json: any): { valid: true; data: AgentManifest } | { valid: false; error: string } {
    const result = AgentManifestSchema.safeParse(json);
    if (!result.success) {
        // Format Zod errors into a readable string
        const errorMsg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        return { valid: false, error: errorMsg };
    }
    return { valid: true, data: result.data };
}
