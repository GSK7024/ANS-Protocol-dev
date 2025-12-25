import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Agent API Connection
 * 
 * Checks if the agent's quote_url is reachable
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { quote_url } = body;

        if (!quote_url) {
            return NextResponse.json({ error: 'Missing quote_url' }, { status: 400 });
        }

        // Test the connection
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            const res = await fetch(quote_url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (res.ok) {
                return NextResponse.json({
                    success: true,
                    message: `API reachable (${res.status} ${res.statusText})`
                });
            } else {
                return NextResponse.json({
                    success: false,
                    message: `API returned error: ${res.status} ${res.statusText}`
                });
            }
        } catch (fetchErr: any) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
                return NextResponse.json({
                    success: false,
                    message: 'Connection timed out (5s)'
                });
            }
            return NextResponse.json({
                success: false,
                message: `Connection failed: ${fetchErr.message}`
            });
        }

    } catch (err: any) {
        return NextResponse.json({
            success: false,
            message: err.message
        });
    }
}
