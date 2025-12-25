# Multi-Seller System - Developer Testing Guide

This guide helps developers test the ANS Protocol multi-seller flight booking system.

## Prerequisites

1. **Supabase Database** - Run the SQL migrations
2. **Node.js 18+** - For the Next.js app
3. **Solana Wallet** - Phantom or similar (for payment testing)

---

## Quick Start

### 1. Run SQL Migrations

Execute in Supabase SQL Editor:

```sql
-- Run in order:
\i db/schema.sql
\i db/nexusair_schema.sql
\i db/nexusair_seed.sql
\i db/seller_registration.sql  -- New! Creates test sellers
```

Or just run `seller_registration.sql` if other tables exist.

### 2. Start the App

```bash
npm run dev
```

### 3. Start Mock Seller (Optional)

In a new terminal:

```bash
npm run seller-mock
# Starts MockAir on port 4001
```

For a second seller:

```bash
set SELLER_PORT=4002 && set SELLER_NAME=BudgetAir && node scripts/mock-seller-server.js
```

---

## Test Scenarios

### Scenario 1: Basic Flight Search

**Chat Input:**
```
Find flights from Delhi to Mumbai tomorrow
```

**Expected:**
- AI searches airports (DEL, BOM)
- AI calls search_flights
- Returns flights from multiple sellers (NexusAir, SkyIndia, JetStar)
- Each flight shows seller name and trust score
- FlyDeal (scammer) should NOT appear - it's blocked

### Scenario 2: Register a New Seller

**API Call:**
```bash
curl -X POST http://localhost:3000/api/seller/register \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myairlines",
    "seller_wallet": "YOUR_WALLET_ADDRESS",
    "quote_url": "http://localhost:4001/quote",
    "book_url": "http://localhost:4001/book",
    "display_name": "My Airlines",
    "stake_amount": 10,
    "required_fields": ["full_name", "dob"]
  }'
```

**Expected:**
- Seller registered in domains table
- Appears in next flight search
- Has `initiate` trust tier (new seller)

### Scenario 3: Multi-Passenger with Agent Reference

**Chat Input:**
```
Book Delhi to Goa for me and agent://testbuyer2
```

**Expected:**
- AI asks about passengerAgents
- If user confirms, AI uses: `passengerAgents: ["self", "agent://testbuyer2"]`
- Consent request created for testbuyer2
- Status shows "awaiting_consent"
- Once approved, booking proceeds

### Scenario 4: Vault Consent Flow

**Step 1: Request Consent**
```bash
curl -X POST http://localhost:3000/api/vault/consent/request \
  -H "Content-Type: application/json" \
  -d '{
    "requester_wallet": "BUYER_WALLET",
    "target_agent": "testbuyer2",
    "seller_agent": "nexusair",
    "fields_requested": ["full_name", "dob"],
    "purpose": "flight_booking"
  }'
```

**Step 2: Approve Consent**
```bash
curl -X POST http://localhost:3000/api/vault/consent/respond \
  -H "Content-Type: application/json" \
  -d '{
    "consent_id": "UUID_FROM_STEP_1",
    "wallet_address": "TESTBUYER2_WALLET",
    "approved": true
  }'
```

### Scenario 5: Low Trust Seller Warning

**Setup:**
JetStar has trust_score = 0.35 (risky)

**Expected in search results:**
- JetStar flights appear in `riskyFlights` section
- Response includes warning about low trust
- AI should communicate this to user

### Scenario 6: Blocked Seller (Scammer)

**Setup:**
FlyDeal is flagged with `is_flagged = true`

**Expected:**
- FlyDeal never appears in flight results
- Listed in `blockedSellers` section of response
- Warning message about blocked seller

---

## API Endpoints Reference

### Seller Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/seller/register` | POST | Register as seller |
| `/api/seller/register?domain=xxx` | GET | Check seller status |

### Flight Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flights/search?from=DEL&to=BOM&date=2025-12-26` | GET | Search all sellers |
| `/api/nexusair/flights/search?...` | GET | Search NexusAir only |

### Vault Consent

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vault/consent/request` | POST | Request vault access |
| `/api/vault/consent/respond` | POST | Approve/deny access |
| `/api/vault/consent/request?agent=xxx` | GET | Get pending requests |
| `/api/vault/data?wallet=xxx&seller=xxx` | GET | Get vault data (with consent) |

---

## Test Data

### Test Sellers (from seller_registration.sql)

| Seller | Trust | Stake | Status |
|--------|-------|-------|--------|
| nexusair | 92% | 25 SOL | ✅ Verified, Master |
| skyindia | 78% | 15 SOL | ✅ Verified, Adept |
| jetstar | 35% | 3 SOL | ⚠️ Risky, Initiate |
| flydeal | 5% | 0.5 SOL | 🚫 BLOCKED |

### Test Routes

| Route | Flights Available |
|-------|-------------------|
| DEL → BOM | 5 flights |
| DEL → BLR | 3 flights |
| BOM → GOA | 4 flights |
| DEL → GOA | 2 flights |

---

## Mock Seller API

When running `npm run seller-mock`:

**POST /quote**
```json
{
  "from": "DEL",
  "to": "BOM",
  "date": "2025-12-26",
  "passengers": 1
}
```

Response:
```json
{
  "flights": [
    { "flight_number": "MA-101", "departure": "06:30", "price": 3800, "seats": 120 }
  ]
}
```

**POST /book**
```json
{
  "escrow_id": "uuid",
  "buyer_data": { "full_name": "..." },
  "amount": 3800
}
```

Response:
```json
{
  "success": true,
  "pnr": "MA4X7K2Q"
}
```

---

## Troubleshooting

### "No sellers found"
- Run `seller_registration.sql` in Supabase
- Check domains table has `seller_config` not null

### "Trust score 0"
- Check domains table has `trust_score` column populated

### "Consent request failed"
- Check `vault_consent_requests` table exists
- Check seller passes trust/stake requirements (50% trust, 5 SOL stake)

### Mock seller not responding
- Ensure `npm run seller-mock` is running
- Check port 4001 is not in use

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Chat Interface                        │
│                      /app/chat/page.tsx                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Chat API                                 │
│               /app/api/ai/chat/route.ts                          │
│        Uses: Gemini 2.5 Flash + Function Calling                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Function Handlers                           │
│              /lib/aiFunctionHandlers.ts                          │
│     Executes: search_flights, create_booking, etc.               │
└──────┬─────────────────────┬────────────────────────┬───────────┘
       │                     │                        │
       ▼                     ▼                        ▼
┌──────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│  Flight API  │   │   Vault APIs    │   │    Seller Registry      │
│  /api/flights│   │  /api/vault/..  │   │  /api/seller/register   │
│   /search    │   │                 │   │                         │
└──────────────┘   └─────────────────┘   └─────────────────────────┘
       │                     │                        │
       ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase Database                         │
│    domains | flight_inventory | vault_consent_requests | ...     │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Seller APIs                          │
│           (Real airlines or mock-seller-server.js)               │
└─────────────────────────────────────────────────────────────────┘
```
