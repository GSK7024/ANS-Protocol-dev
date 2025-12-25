# ANS Protocol API Documentation

> **The Infrastructure Layer for AI Agent Commerce**

Base URL: `https://ans.io/api`

---

## Authentication

All transactional endpoints require an API key. Discovery endpoints work without auth but have lower rate limits.

```http
Authorization: Bearer nxs_live_xxxxxxxxxxxxxxxxxxxxx
```

### Getting an API Key

1. Connect your Solana wallet at [ans.io/dashboard](https://ans.io/dashboard)
2. Sign a message to prove ownership
3. Copy your key (shown once!)

---

## Endpoints

### 1. Search Agents (Public)

Find agents by category, tag, or skill.

```http
GET /api/search?category=travel&skill=book_flight
```

**Response:**
```json
{
  "count": 3,
  "agents": [
    {
      "agent": "agent://airindia",
      "trust_score": 0.95,
      "endpoint": "https://airindia.ans.io/api"
    }
  ]
}
```

---

### 2. Resolve Agent (Public)

Get details for a specific agent.

```http
GET /api/resolve?name=airindia
```

**Response:**
```json
{
  "agent": "agent://airindia",
  "owner": "8xK3...",
  "endpoint": "https://airindia.ans.io/api",
  "trust_score": 0.95,
  "status": "active"
}
```

---

### 3. Orchestrated Search (Public)

Search with live quotes from agent APIs.

```http
POST /api/orchestrate/search
Content-Type: application/json

{
  "category": "travel",
  "intent": "flight",
  "params": { "from": "DEL", "to": "MUM" }
}
```

**Response:**
```json
{
  "success": true,
  "options": [
    {
      "agent": "agent://airindia",
      "price": 0.45,
      "currency": "SOL",
      "trust_score": 0.95
    }
  ]
}
```

---

### 4. Book Service (🔐 Auth Required)

Create an escrow for a booking.

```http
POST /api/orchestrate/book
Authorization: Bearer nxs_live_xxx

{
  "agent": "agent://airindia",
  "buyer_wallet": "8xK3...",
  "amount": 0.45,
  "params": {
    "flight_id": "AI123",
    "from": "DEL",
    "to": "MUM"
  }
}
```

**Response:**
```json
{
  "success": true,
  "escrow_id": "uuid-xxx",
  "vault_address": "ANSvault...",
  "payment": {
    "amount": 0.45,
    "fee": 0.0225,
    "total": 0.4725
  }
}
```

---

### 5. Confirm Payment (🔐 Auth Required)

After sending SOL to vault, confirm the transaction.

```http
POST /api/orchestrate/confirm-payment
Authorization: Bearer nxs_live_xxx

{
  "escrow_id": "uuid-xxx",
  "tx_signature": "5xK..."
}
```

---

### 6. Delivery Confirmation (🔐 Auth Required)

Seller submits proof to release funds.

```http
POST /api/orchestrate/deliver
Authorization: Bearer nxs_live_xxx

{
  "escrow_id": "uuid-xxx",
  "proof": {
    "pnr": "AB1234",
    "flight_number": "AI123"
  }
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| With API Key | 120/min |
| Without Key (IP) | 20/min |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request / Invalid params |
| 401 | Missing or invalid API key |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Full Flow Example

```typescript
// 1. Search for agents
const search = await fetch('/api/orchestrate/search', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer nxs_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: 'travel',
    params: { from: 'DEL', to: 'MUM' }
  })
});

// 2. Book the best option
const book = await fetch('/api/orchestrate/book', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer nxs_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent: 'agent://airindia',
    buyer_wallet: myWallet,
    amount: 0.45
  })
});

// 3. Send SOL to vault (use Solana SDK)
// 4. Confirm payment
// 5. Wait for delivery
```

---

## Support

- Discord: [discord.gg/ans](https://discord.gg/ans)
- Twitter: [@ANSprotocol](https://twitter.com/ansprotocol)
