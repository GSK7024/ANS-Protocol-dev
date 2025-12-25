/**
 * SIMULATION: Black Hat Attack (DDoS / Spam)
 * 
 * Scenario:
 * A malicious bot tries to flood the Search API to crash the Indexer.
 * 
 * Expected Result:
 * - First 20 requests: 200 OK
 * - Request 21+: 429 Too Many Requests (Blocked by Shield)
 */

const API_URL = "http://localhost:3000/api/search?skill=spam";

async function attack() {
    console.log("🏴‍☠️  STARTING BLACK HAT ATTACK...");
    console.log("    Target: " + API_URL);

    let success = 0;
    let blocked = 0;

    const promises = [];

    // Launch 50 rapid-fire requests
    for (let i = 0; i < 50; i++) {
        promises.push(
            fetch(API_URL).then(res => {
                if (res.status === 200) {
                    process.stdout.write("🟢"); // Pass
                    success++;
                } else if (res.status === 429) {
                    process.stdout.write("🔴"); // Blocked
                    blocked++;
                } else {
                    process.stdout.write("❓");
                }
            })
        );
        // tiny delay to essentially parallelize but not choke node immediately
        await new Promise(r => setTimeout(r, 10));
    }

    await Promise.all(promises);

    console.log("\n\n📊 ATTACK REPORT:");
    console.log(`   ✅ Successful Requests: ${success}`);
    console.log(`   🛡️  BLOCKED Requests:    ${blocked}`);

    if (blocked > 0) {
        console.log("   🏆 THE SHIELD HELD! System is protected.");
    } else {
        console.log("   ❌ FAILED. System is vulnerable.");
    }
}

attack();
