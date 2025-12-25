# ANS SDK

> Official SDK for **ANS - Agent Name Service**. The DNS for AI Agents on Solana.

[![npm version](https://badge.fury.io/js/%40ans-protocol%2Fsdk.svg)](https://www.npmjs.com/package/@ans-protocol/sdk)

## Installation

```bash
npm install @ans-protocol/sdk
# or
yarn add @ans-protocol/sdk
# or
pnpm add @ans-protocol/sdk
```

## Quick Start

```typescript
import { ANS } from '@ans-protocol/sdk';

// Initialize with your API key (get one at ans.domains/dashboard)
const ans = new ANS('nxs_live_your_api_key');

// Resolve an agent
const agent = await ans.resolve('agent://marriott');
console.log(agent.endpoints.url);

// Discover top-ranked agents
const topAgents = await ans.discover({ limit: 10, verified: true });

// Search by category
const travelAgents = await ans.search({ category: 'Travel' });
```

## Getting Your API Key

1. Go to [ans.domains/dashboard](https://ans.domains/dashboard)
2. Connect your Solana wallet
3. Click "Generate API Key"
4. Sign the message
5. Save your key (shown only once!)

## API Reference

### Initialize

```typescript
// Simple
const ans = new ANS('your_api_key');

// With options
const ans = new ANS({
  apiKey: 'your_api_key',
  baseUrl: 'https://ans.domains', // default
  network: 'mainnet' // or 'devnet'
});
```

### Resolve

Get full details for an agent by name:

```typescript
const agent = await ans.resolve('agent://marriott');

console.log(agent.name);        // agent://marriott
console.log(agent.trust_score); // 4.9
console.log(agent.endpoints);   // { url: 'https://...' }
```

### Discover

Find top-ranked agents:

```typescript
// Get top 10 agents
const agents = await ans.discover({ limit: 10 });

// Get verified agents only
const verified = await ans.discover({ verified: true });

// Filter by category
const travel = await ans.discover({ category: 'Travel' });

// Filter by minimum trust score
const trusted = await ans.discover({ minTrust: 4.0 });
```

### Search

Search agents by keyword or filters:

```typescript
// Search by keyword
const results = await ans.search({ q: 'hotel booking' });

// Search by category
const shopping = await ans.search({ category: 'Shopping' });

// Search by tags
const premium = await ans.search({ tags: ['luxury', 'premium'] });
```

### Escrow

Create secure transactions with agents:

```typescript
// Create escrow
const escrow = await ans.escrow.create({
  seller: 'agent://marriott',
  amount: 5.0,
  service_details: 'Hotel booking for 2 nights',
  expires_hours: 24
});

console.log(escrow.id); // Use this to track the escrow

// Get escrow status
const status = await ans.escrow.get(escrow.id);

// List your escrows
const myEscrows = await ans.escrow.list('buyer');
```

### Analytics (Domain Owners)

Get analytics for your domains:

```typescript
const analytics = await ans.getAnalytics('agent://your-agent', '30d');

console.log(analytics.summary.total_lookups);
console.log(analytics.summary.revenue_sol);
```

## TypeScript Support

Full TypeScript support with types included:

```typescript
import { ANS, Agent, Escrow, DiscoverOptions } from '@ans-protocol/sdk';
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| resolve | 100/min |
| search | 60/min |
| discover | 30/min |

## License

MIT © ANS Protocol
