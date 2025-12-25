import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const AGENT = 'solana'; // Known existing agent from previous tests
const REQUESTS = 50; // Requests to send

async function stressTest() {
    console.log(`🚀 Starting Stress Test: ${REQUESTS} requests to /api/resolve/${AGENT}`);
    console.log(`   Target: ${BASE_URL}`);

    const start = performance.now();
    let success = 0;
    let failed = 0;
    let cacheHits = 0;
    const latencies: number[] = [];

    const promises = Array.from({ length: REQUESTS }).map(async (_, i) => {
        const reqStart = performance.now();
        try {
            const res = await fetch(`${BASE_URL}/api/resolve?name=${AGENT}`, {
                headers: {
                    'X-NEXUS-Admin': process.env.NEXUS_ADMIN_KEY || 'nexus-admin-key-local'
                }
            });
            if (res.ok) {
                success++;
                if (res.headers.get('X-Cache') === 'HIT') cacheHits++;
            } else {
                failed++;
            }
        } catch (e) {
            failed++;
        }
        latencies.push(performance.now() - reqStart);
    });

    await Promise.all(promises);

    const totalTime = performance.now() - start;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const reqPerSec = (REQUESTS / totalTime) * 1000;

    console.log('\n📊 Results:');
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Requests: ${REQUESTS}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Cache Hits: ${cacheHits}`);
    console.log(`   RPS: ${reqPerSec.toFixed(2)} req/sec`);
    console.log(`   Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min Latency: ${Math.min(...latencies).toFixed(2)}ms`);
    console.log(`   Max Latency: ${Math.max(...latencies).toFixed(2)}ms`);
}

stressTest();
