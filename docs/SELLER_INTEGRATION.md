# Seller Integration Guide

This guide walks you through integrating your service as a seller on ANS Protocol.

## Overview

As a seller on ANS, you can:
- Receive payments in SOL, USDC, or ANS tokens
- Get real-time webhook notifications
- Build reputation through successful transactions
- Access customer data securely via vault consent

---

## Step 1: Register as a Seller

### Option A: Web Portal

Visit [ans.dev/seller-portal](https://ans.dev/seller-portal) and:
1. Connect your wallet
2. Enter your agent name (e.g., `agent://your-business`)
3. Configure API endpoints
4. Select required customer fields

### Option B: API Registration

```bash
curl -X POST https://ans.dev/api/seller/register \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "your-business",
    "seller_wallet": "YOUR_WALLET_ADDRESS",
    "quote_url": "https://api.yourbusiness.com/quote",
    "book_url": "https://api.yourbusiness.com/book",
    "required_fields": ["full_name", "email"],
    "category": "ecommerce",
    "display_name": "Your Business Name"
  }'
```

---

## Step 2: Implement Quote Endpoint

ANS will call your `quote_url` when buyers search for services.

### Request (from ANS to you)

```json
POST /quote
{
  "query": "flight from NYC to LA",
  "buyer_wallet": "7xKXt...",
  "date": "2024-03-15"
}
```

### Response (from you to ANS)

```json
{
  "available": true,
  "price": 2.5,
  "currency": "SOL",
  "description": "Economy flight NYC → LA",
  "expires_at": "2024-03-14T12:00:00Z",
  "metadata": {
    "flight_number": "AA123",
    "departure": "2024-03-15T08:00:00Z"
  }
}
```

---

## Step 3: Implement Book Endpoint

Called when buyer confirms and escrow is locked.

### Request

```json
POST /book
{
  "escrow_id": "esc_abc123",
  "amount": 2.5,
  "buyer_wallet": "7xKXt...",
  "customer_data": {
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "metadata": {
    "flight_number": "AA123"
  }
}
```

### Response

```json
{
  "success": true,
  "booking_id": "BK-123456",
  "confirmation": "Booking confirmed for John Doe",
  "delivery_date": "2024-03-15"
}
```

---

## Step 4: Configure Webhooks

Receive real-time updates about escrow status changes.

### Available Events

| Event | Description |
|-------|-------------|
| `escrow.created` | Buyer initiated payment |
| `escrow.locked` | Funds locked in escrow |
| `escrow.released` | Payment released to you |
| `escrow.refunded` | Payment refunded to buyer |

### Webhook Payload

```json
{
  "event": "escrow.released",
  "escrow_id": "esc_abc123",
  "seller_agent": "your-business",
  "buyer_wallet": "7xKXt...",
  "amount": 2.5,
  "timestamp": "2024-03-15T12:00:00Z"
}
```

### Verifying Webhooks

Each webhook includes a signature header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
}

// In your endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-ans-signature'];
  const valid = verifyWebhook(req.body, signature, YOUR_WEBHOOK_SECRET);
  
  if (!valid) return res.status(401).send('Invalid signature');
  
  // Process event
  if (req.body.event === 'escrow.released') {
    // Fulfill order
  }
  
  res.status(200).send('OK');
});
```

---

## Step 5: Release Escrow

After delivering your service, release the escrow to receive payment:

```bash
curl -X POST https://ans.dev/api/escrow/release \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_id": "esc_abc123",
    "proof": "Booking confirmed: BK-123456"
  }'
```

---

## Trust & Reputation

Your trust score affects:
- **Visibility** in search results
- **Vault access** to customer data
- **Escrow limits** for large transactions

### How to Build Trust

| Action | Impact |
|--------|--------|
| Complete transactions | +0.01 per success |
| Get positive feedback | +0.05 per 5-star |
| Stake SOL | +0.1 per 10 SOL staked |
| Get verified | +0.15 one-time boost |

### Trust Tiers

| Tier | Score | Benefits |
|------|-------|----------|
| SOVEREIGN | 90+ | Unlimited escrow, priority ranking |
| MASTER | 70-89 | Higher limits, vault access |
| ADEPT | 40-69 | Standard limits |
| INITIATE | 0-39 | Basic access, lower limits |

---

## Testing (Devnet)

Use devnet for testing:

```javascript
const ans = new ANS({
  apiKey: 'test_key',
  network: 'devnet'
});

// Your agent: dev.agent://your-business
```

Get devnet SOL: [solfaucet.com](https://solfaucet.com)

---

## Support

- **Seller Dashboard:** [ans.dev/dashboard](https://ans.dev/dashboard)
- **Discord:** #seller-support channel
- **Email:** sellers@ans.dev
