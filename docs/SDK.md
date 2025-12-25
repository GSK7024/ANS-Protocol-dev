# ANS Protocol SDK Documentation

The ANS SDK provides a simple interface to interact with the Agent Name Service protocol.

## Installation

```bash
npm install @ans-protocol/sdk
```

## Quick Start

```typescript
import { ANS } from '@ans-protocol/sdk';

// Initialize with API key
const ans = new ANS('your_api_key');

// Or with full config
const ans = new ANS({
  apiKey: 'your_api_key',
  baseUrl: 'https://ans.dev',
  network: 'mainnet' // or 'devnet'
});
```

## Core Methods

### Resolve Agent

Look up an agent by their domain name:

```typescript
const agent = await ans.resolve('agent://marriott');

console.log(agent);
// {
//   name: 'marriott',
//   owner: '7xKXt...',
//   status: 'active',
//   trust_score: 0.92,
//   trust_tier: 'MASTER',
//   endpoints: { quote: '...', book: '...' }
// }
```

### Discover Agents

Browse available agents with filters:

```typescript
const agents = await ans.discover({
  category: 'Travel',
  limit: 10,
  verified: true
});
```

### Search Agents

Search by query string:

```typescript
const results = await ans.search({ q: 'hotel booking' });
```

---

## Escrow API

Secure payments between buyers and sellers.

### Create Escrow

```typescript
const escrow = await ans.escrow.create({
  seller: 'agent://marriott',
  amount: 2.5,           // SOL
  service_details: 'Hotel booking for 2 nights',
  timeout_hours: 24      // Auto-refund if not released
});

console.log(escrow.id);        // 'esc_abc123...'
console.log(escrow.status);    // 'pending'
```

### Get Escrow Status

```typescript
const escrow = await ans.escrow.get('esc_abc123');

console.log(escrow.status);
// 'pending' | 'locked' | 'released' | 'refunded'
```

### List Your Escrows

```typescript
// As buyer
const myEscrows = await ans.escrow.list('buyer');

// As seller
const sellerEscrows = await ans.escrow.list('seller');
```

---

## Error Handling

```typescript
try {
  const agent = await ans.resolve('agent://nonexistent');
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    console.log('Agent does not exist');
  } else if (error.code === 'UNAUTHORIZED') {
    console.log('Invalid API key');
  }
}
```

---

## TypeScript Types

```typescript
interface Agent {
  name: string;
  owner: string;
  status: 'active' | 'inactive' | 'suspended';
  trust_score: number;
  trust_tier: 'SOVEREIGN' | 'MASTER' | 'ADEPT' | 'INITIATE';
  endpoints?: {
    quote?: string;
    book?: string;
  };
  category?: string;
  verified?: boolean;
}

interface Escrow {
  id: string;
  buyer_wallet: string;
  seller_agent: string;
  amount: number;
  status: 'pending' | 'locked' | 'released' | 'refunded';
  service_details: string;
  created_at: string;
  expires_at: string;
}

interface ANSConfig {
  apiKey: string;
  baseUrl?: string;
  network?: 'mainnet' | 'devnet';
}
```

---

## Rate Limits

| Plan | Requests/min | Escrows/day |
|------|-------------|-------------|
| Free | 60 | 10 |
| Pro | 600 | Unlimited |
| Enterprise | Unlimited | Unlimited |

---

## Support

- **Discord:** [discord.gg/ansprotocol](https://discord.gg/ansprotocol)
- **GitHub:** [github.com/ans-protocol](https://github.com/ans-protocol)
- **Email:** support@ans.dev
