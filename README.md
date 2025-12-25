# ANS Protocol - Agent Name Service

<div align="center">
  <img src="public/ans-logo.png" alt="ANS Logo" width="120"/>
  
  **The DNS for AI Agents**
  
  [![Live Demo](https://img.shields.io/badge/Live-ans--protocol.vercel.app-blue)](https://ans-protocol.vercel.app)
  [![Devnet](https://img.shields.io/badge/Devnet-FREE%20Testing-green)](https://ans-devnet.vercel.app)
  [![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF)](https://solana.com)
</div>

---

## 🚀 What is ANS?

ANS (Agent Name Service) is a decentralized naming protocol for AI agents on Solana. Think **ENS, but for AI agents**.

```
agent://google → AI Agent Address
agent://travel-buddy → 0x8f3...
```

### Features

- 🏷️ **Human-readable names** for AI agents (`agent://your-name`)
- 🔐 **On-chain ownership** via Solana wallets
- ⭐ **Reputation scores** based on agent performance
- 💸 **Smart contract escrow** for safe agent-to-agent payments
- 🌐 **Decentralized discovery** - agents find each other by name

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, TypeScript, TailwindCSS
- **Blockchain:** Solana (SOL / USDC payments)
- **Database:** Supabase (PostgreSQL)
- **Wallet:** Phantom, Solflare (via wallet-adapter)

---

## 🏃 Run Locally (Complete Guide)

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- npm or yarn
- Git
- Solana CLI (optional, for wallet testing)
- Phantom or Solflare wallet

### Step 1: Clone & Install

```bash
# Clone the repo
git clone https://github.com/GSK7024/ANS-Protocol-Agent-Name-Service.git
cd ANS-Protocol-Agent-Name-Service

# Install dependencies
npm install
```

### Step 2: Set Up Supabase (Database)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings → API** and copy your keys
4. Run the database migrations:

```bash
# In Supabase SQL Editor, run these files in order:
# 1. db/schema.sql (creates tables)
# 2. db/escrow_tables.sql (escrow system)
# 3. db/domain_webhooks.sql (webhooks)
```

### Step 3: Configure Environment

```bash
# Copy the example env file
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Your Wallet (receives domain payments)
NEXT_PUBLIC_DEV_WALLET=YourWalletAddressHere
NEXT_PUBLIC_VAULT_WALLET=YourVaultWalletHere

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### Step 5: Run Tests

```bash
# Run all 97 tests
npm test

# Run with coverage
npm run test:coverage
```

### Step 6: Test the API

```bash
# Resolve an agent
curl http://localhost:3000/api/resolve?name=marriott

# Create an escrow (requires body)
curl -X POST http://localhost:3000/api/escrow \
  -H "Content-Type: application/json" \
  -d '{"buyer_wallet":"YourWallet","seller_agent":"marriott","amount":1,"service_details":"Test"}'
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `supabaseUrl is required` | Check your `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` |
| `RLS policy violation` | Run all SQL files in `db/` folder |
| `Module not found` | Run `npm install` again |
| `Port 3000 in use` | Run `npm run dev -- -p 3001` |

---

## 🔧 Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Solana RPC (use devnet for testing)
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Wallet addresses (receive payments)
NEXT_PUBLIC_DEV_WALLET=your_wallet
NEXT_PUBLIC_VAULT_WALLET=your_vault_wallet
```

---

## 📦 Project Structure

```
ans-protocol/
├── app/                 # Next.js pages & API routes
│   ├── api/             # Backend API endpoints
│   ├── dashboard/       # User dashboard
│   ├── marketplace/     # Domain marketplace
│   └── docs/            # Documentation
├── components/          # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── sdk/                 # Client SDK for developers
├── public/              # Static assets
└── db/                  # Database migrations
```

---

## 🧪 Testing on Devnet

All domains are **FREE** on devnet! Perfect for testing:

1. Visit [devnet.ans-protocol.vercel.app](https://ans-devnet.vercel.app)
2. Switch your wallet to **Devnet**
3. Get free SOL from [Solana Faucet](https://faucet.solana.com)
4. Register domains for free!

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/GETTING_STARTED.md) | DevNet testing tutorial |
| [SDK Documentation](docs/SDK.md) | TypeScript SDK reference |
| [Seller Integration](docs/SELLER_INTEGRATION.md) | How to become a seller |
| [Audit Preparation](docs/AUDIT_PREPARATION.md) | Security documentation |

---

## 🔗 Links

- **Website:** https://ans.dev
- **Devnet:** https://ans-devnet.vercel.app
- **Twitter:** [@ANSProtocol](https://x.com/ANSProtocol)
- **Discord:** [Join us](https://discord.gg/szqNwV5y)
- **GitHub:** [GSK7024/ANS-Protocol](https://github.com/GSK7024/ANS-Protocol-Agent-Name-Service)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Submit a PR

---

<div align="center">
  <strong>🌐 The Agentic Web Starts Here</strong>
</div>
