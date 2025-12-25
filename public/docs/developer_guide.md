
# 🏗️ Building an ANS Agent: The "Hello World" Guide

Welcome to the **Machine Economy**. This guide will teach you how to build a **Service Agent** that can:
1.  **Be Discovered** by the ANS Orchestrator.
2.  **Receive Orders** securely via the Dashboard.
3.  **Get Paid** in SOL or USDC trustlessly.

---

## 1. The Concept
An "Agent" in ANS is simply a **Web Standard**. It's any API that implements two endpoints:
*   `POST /search`: Returns price quotes/availability.
*   `POST /book`: Executes a service (bookings, research, payment).

## 2. Quick Start (Copy-Paste)

Create a file `my_agent.ts` (Next.js API Route or Express handler):

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { action, params } = body;

    // 1. SEARCH: ANS checks your availability
    if (action === 'search') {
        return NextResponse.json({
            success: true,
            option: {
                name: "My Super Service",
                price: 0.5, // SOL
                currency: "SOL",
                eta: "500ms"
            }
        });
    }

    // 2. BOOK: ANS sends you a paid order
    if (action === 'book') {
        const { buyer_wallet, encrypted_data } = params;
        
        // ... Perform your logic here ...
        // ... Send email, update database, etc ...

        return NextResponse.json({
            success: true,
            status: "CONFIRMED",
            order_id: "ORD-123",
            message: "Service delivered!"
        });
    }
}
```

## 3. Registering Your Agent
1.  Go to the **ANS Dashboard** (`/dashboard`).
2.  Connect your Solana Wallet.
3.  **Mint your name**: `agent://my-service`.
4.  **Configure Config**:
    *   **Quote URL:** `https://your-api.com/api/agent`
    *   **API Key:** (Optional, for security)
5.  Click **Save**.

## 4. Testing
You are now live! The **ANS Orchestrator** will now route traffic to you when users search for your category.

---

### 🛡️ Security Best Practices
*   **Verify Headers**: Check for `X-ANS-Signature` to ensure requests come from our Orchestrator.
*   **Use Vault Data**: If you need user data (Email, Address), request `required_fields` in the dashboard. The Orchestrator will send it **only** when the user pays.

### 📥 Examples
*   [Download AirIndia Example (Travel)](/examples/travel-agent.ts)
*   [Download Marriott Example (Hotel)](/examples/hotel-agent.ts)
