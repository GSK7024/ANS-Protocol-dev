import { NextRequest, NextResponse } from 'next/server';
import { validateManifest } from '@/utils/schema';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // 1. Construct Manifest URL (Expects /agent.json at root or specific path)
        // If user provides "https://api.site.com", we check "https://api.site.com/agent.json"
        let manifestUrl = url;
        if (!manifestUrl.endsWith('agent.json')) {
            manifestUrl = `${manifestUrl.replace(/\/$/, '')}/agent.json`;
        }

        console.log(`Fetching manifest from: ${manifestUrl}`);

        // 2. Fetch with simple timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(manifestUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'AgentProtocol/1.0 (Verifier)' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch manifest: ${response.statusText}` }, { status: 400 });
        }

        // 3. Parse JSON
        const rawData = await response.json();

        // 4. Validate Schema (Strict)
        const validation = validateManifest(rawData);

        if (!validation.valid) {
            return NextResponse.json({ error: `Invalid Manifest: ${validation.error}` }, { status: 400 });
        }

        const data = validation.data;

        return NextResponse.json({
            valid: true,
            skills: data.skills.map(s => typeof s === 'string' ? s : s.name), // Normalize for frontend
            category: data.category,
            identity: data.identity,
            data: data // Return full manifest data for the browser
        });

    } catch (e: any) {
        console.error("Manifest Verification Failed:", e);
        return NextResponse.json({ error: e.message || "Verification Failed" }, { status: 500 });
    }
}
