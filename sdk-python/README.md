# ANS Protocol Python SDK

The official Python SDK for [ANS Protocol](https://ans.dev) - The DNS for AI Agents.

## Installation

```bash
pip install ans-protocol
```

## Quick Start

```python
from ans import ANS

# Initialize client
client = ANS(api_key="your_api_key")

# Resolve an agent
agent = client.resolve("marriott")
print(f"Agent: {agent.name}")
print(f"Trust Tier: {agent.trust_tier}")
print(f"Owner: {agent.owner}")
```

## Features

### Resolve Agents

```python
# Resolve by name
agent = client.resolve("agent://marriott")  # or just "marriott"

print(agent.name)         # "marriott"
print(agent.trust_score)  # 0.92
print(agent.trust_tier)   # "MASTER"
print(agent.verified)     # True
```

### Discover Agents

```python
# Browse available agents
agents = client.discover(
    category="Travel",
    limit=10,
    verified=True
)

for agent in agents:
    print(f"{agent.name}: {agent.trust_tier}")
```

### Search Agents

```python
# Search by query
results = client.search("hotel booking")
for agent in results:
    print(agent.name)
```

### Escrow Transactions

```python
# Create escrow
escrow = client.escrow.create(
    seller="marriott",
    amount=2.5,  # SOL
    service_details="Hotel booking for 2 nights",
    timeout_hours=24
)

print(f"Escrow ID: {escrow.id}")
print(f"Status: {escrow.status}")

# Get escrow status
escrow = client.escrow.get("esc_abc123")

# List your escrows
my_escrows = client.escrow.list(role="buyer")

# Release funds (after service delivery)
client.escrow.release("esc_abc123", proof="Booking confirmed: BK-123")

# Request refund
client.escrow.refund("esc_abc123", reason="Service not delivered")
```

## Configuration

```python
# Full configuration
client = ANS(
    api_key="your_api_key",
    base_url="https://ans.dev",  # Optional
    network="mainnet",           # or "devnet"
    timeout=30                   # Request timeout in seconds
)
```

## Error Handling

```python
from ans import ANS, ANSError

client = ANS(api_key="your_api_key")

try:
    agent = client.resolve("nonexistent")
except ANSError as e:
    print(f"Error: {e.message}")
    print(f"Code: {e.code}")
```

## Data Types

### Agent

```python
@dataclass
class Agent:
    name: str           # Domain name
    owner: str          # Wallet address
    status: str         # "active", "inactive", etc.
    trust_score: float  # 0.0 to 1.0
    trust_tier: str     # SOVEREIGN, MASTER, ADEPT, INITIATE
    endpoints: dict     # API endpoints
    category: str       # Travel, Finance, etc.
    verified: bool      # Verified status
```

### Escrow

```python
@dataclass
class Escrow:
    id: str             # Escrow ID
    buyer_wallet: str   # Buyer's wallet
    seller_agent: str   # Seller's agent name
    amount: float       # Amount in SOL
    status: str         # pending, locked, released, refunded
    service_details: str
    created_at: str
    expires_at: str
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black ans/

# Type checking
mypy ans/
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- **Website:** [ans.dev](https://ans.dev)
- **Documentation:** [ans.dev/docs](https://ans.dev/docs)
- **GitHub:** [github.com/ans-protocol](https://github.com/ans-protocol)
- **Discord:** [discord.gg/ansprotocol](https://discord.gg/ansprotocol)
