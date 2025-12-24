# n8n-nodes-actp

ACTP (Agent Commerce Transaction Protocol) community node for n8n.

Enables AI agent payment workflows with blockchain-based escrow on Base.

## Features

- **Simple Mode**: User-friendly operations (Send Payment, Check Status, Release, Dispute)
- **Advanced Mode**: Full protocol control (Create Transaction, Link Escrow, Transition State)
- **Mock Mode**: Local simulation for development (no blockchain required)
- **Testnet Mode**: Base Sepolia integration
- **Mainnet Mode**: Base Mainnet (production)

## Installation

```bash
npm install n8n-nodes-actp
```

Or in n8n:
1. Go to **Settings** → **Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-actp`

## Credentials

Create ACTP API credentials in n8n with:

| Field | Description |
|-------|-------------|
| Environment | `mock`, `testnet`, or `mainnet` |
| Private Key | Wallet private key (testnet/mainnet only) |
| RPC URL | Optional custom RPC endpoint |

## Operations

### Simple Mode
| Operation | Description |
|-----------|-------------|
| Send Payment | Create and fund a transaction |
| Check Status | Get transaction status with action hints |
| Start Work | Provider accepts and starts working |
| Mark Delivered | Provider marks work complete |
| Release Payment | Release funds to provider |
| Raise Dispute | Dispute a delivery |
| Cancel | Cancel before delivery |

### Advanced Mode
| Operation | Description |
|-----------|-------------|
| Create Transaction | Create without funding |
| Link Escrow | Fund a transaction |
| Transition State | Manual state changes |
| Release Escrow | Release with optional attestation |
| Get Transaction | Retrieve full details |
| Get Escrow Balance | Check escrow balance |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run with testnet
BASE_SEPOLIA_RPC=<rpc_url> BASE_SEPOLIA_PRIVATE_KEY=<key> npm test
```

## Security

- Private keys never logged (redacted in errors)
- Input validation with DoS protection
- Timeout/retry for blockchain operations
- Zero address validation

## Links

- [AGIRAILS Documentation](https://docs.agirails.io)
- [GitHub Repository](https://github.com/agirails/n8n-nodes-actp)
- [SDK Package](https://www.npmjs.com/package/@agirails/sdk)

## License

MIT
