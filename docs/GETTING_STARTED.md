# Getting Started with ANS Protocol

Welcome, Developer! This guide will walk you through **testing our system with real (DevNet) crypto** in under 10 minutes.

## What You'll Build

A simple script that:
1. **Resolves** an agent (finds their wallet address)
2. **Creates an escrow** (locks payment for a service)
3. **Releases funds** (completes the transaction)

---

## Prerequisites

- Node.js 18+
- A Solana wallet (Phantom, Solflare, etc.)
- DevNet SOL (free, we'll show you how to get it)

---

## Step 1: Get DevNet SOL (Free)

DevNet is Solana's test network. The SOL here has no real value, so you can experiment freely.

```bash
# Install Solana CLI (if you don't have it)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.17/install)"

# Get free DevNet SOL
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

Or use the [Solana Faucet](https://faucet.solana.com/) to get free DevNet SOL.

---

## Step 2: Install the SDK

```bash
npm install @ans-protocol/sdk
# or
yarn add @ans-protocol/sdk
```

---

## Step 3: Resolve an Agent

Let's find an agent's wallet address using their name.

```typescript
import { ANS } from '@ans-protocol/sdk';

// Initialize on DevNet
const ans = new ANS({
  baseUrl: 'https://ans.dev',
  network: 'devnet'  // Use devnet for testing!
});

async function main() {
  // 1. RESOLVE: Find Marriott's wallet address
  const agent = await ans.resolve('dev.agent://marriott');
  
  console.log('Agent:', agent.name);
  console.log('Owner Wallet:', agent.owner);
  console.log('Status:', agent.status);
  console.log('Endpoints:', agent.resolution);
}

main();
```

**Run it:**
```bash
npx tsx my-script.ts
```

---

## Step 4: Create an Escrow

Now let's create a payment escrow. This locks your DevNet SOL until the seller delivers.

```typescript
import { ANS } from '@ans-protocol/sdk';

const ans = new ANS({ network: 'devnet' });

async function bookHotel() {
  // 1. Resolve the seller
  const seller = await ans.resolve('dev.agent://marriott');
  console.log(`Found seller: ${seller.owner}`);

  // 2. Create escrow (locks payment)
  const escrow = await ans.escrow.create({
    seller: 'dev.agent://marriott',
    amount: 0.5,  // 0.5 DevNet SOL
    service_details: 'Test booking - 1 night',
    buyer_wallet: 'YOUR_DEVNET_WALLET_ADDRESS'
  });

  console.log('Escrow created!');
  console.log('ID:', escrow.id);
  console.log('Status:', escrow.status);  // 'pending'
  console.log('Amount:', escrow.amount, 'SOL');
  
  return escrow.id;
}

bookHotel();
```

---

## Step 5: Check Escrow Status

```typescript
const escrow = await ans.escrow.get('YOUR_ESCROW_ID');
console.log('Current status:', escrow.status);
// pending -> locked -> released OR refunded
```

---

## The Complete Flow

Here's what happens in a real-world transaction:

```
┌─────────────────────────────────────────────────────────────────┐
│                       ANS ESCROW LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PENDING    →   Buyer creates escrow                         │
│                    SOL not yet transferred                       │
│                                                                  │
│  2. LOCKED     →   Buyer pays SOL                               │
│                    Funds held in escrow                          │
│                                                                  │
│  3. CONFIRMED  →   Seller delivers service                      │
│                    Submits proof (booking ID, etc)              │
│                                                                  │
│  4a. RELEASED  →   Buyer approves OR timeout                    │
│                    Funds sent to seller                          │
│                                                                  │
│  4b. REFUNDED  →   Seller fails to deliver                      │
│                    Funds returned to buyer                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing with a Mock Seller

We have demo seller agents on DevNet that respond to booking requests:

| Agent | Description | Action |
|-------|-------------|--------|
| `dev.agent://marriott` | Hotel bookings | `POST /api/sellers/marriott` |
| `dev.agent://airindia` | Flight search & booking | `POST /api/sellers/airindia` |
| `dev.agent://techmart` | E-commerce | `POST /api/sellers/techmart` |

**Example: Search flights**
```bash
curl -X POST https://ans.dev/api/sellers/airindia \
  -H "Content-Type: application/json" \
  -d '{"action": "search", "from": "Delhi", "to": "Mumbai"}'
```

---

## Going to Mainnet

When you're ready for real transactions:

1. Change `network: 'devnet'` to `network: 'mainnet'`
2. Use `agent://` instead of `dev.agent://`
3. Use real SOL (not DevNet SOL)

```typescript
const ans = new ANS({
  network: 'mainnet',  // Production!
});

const agent = await ans.resolve('agent://marriott');
```

---

## Common Issues

### "Agent not found"
- Make sure you're using the correct network prefix (`dev.agent://` for devnet)
- Check if the agent is registered: visit `https://ans.dev/marketplace`

### "Insufficient balance"
- Get more DevNet SOL: `solana airdrop 2 YOUR_WALLET --url devnet`

### "Rate limited"
- Free tier: 60 requests/minute
- Wait a minute and try again

---

## Next Steps

- **Register your own agent:** [ans.dev](https://ans.dev)
- **Read the full SDK docs:** [docs/SDK.md](./SDK.md)
- **Become a seller:** [docs/SELLER_INTEGRATION.md](./SELLER_INTEGRATION.md)
- **Join Discord:** [discord.gg/ansprotocol](https://discord.gg/ansprotocol)

---

## Questions?

- **Discord:** [discord.gg/ansprotocol](https://discord.gg/ansprotocol)
- **Email:** support@ans.dev
- **Twitter:** [@ANSProtocol](https://twitter.com/ansprotocol)
