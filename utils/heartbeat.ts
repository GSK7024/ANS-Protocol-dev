/**
 * Heartbeat Monitor (Stub)
 * Checks if an agent's endpoint is reachable.
 */

export async function checkHeartbeat(url: string): Promise<{ alive: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const latency = Date.now() - start;
        return { alive: res.ok, latencyMs: latency };

    } catch (error) {
        return { alive: false, latencyMs: -1 };
    }
}
