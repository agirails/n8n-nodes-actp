# n8n-nodes-actp

[![n8n Community Node](https://img.shields.io/badge/n8n-community%20node-ff6d5a.svg)](https://n8n.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Tests](https://img.shields.io/badge/tests-365%20passed-brightgreen.svg)]()

The official n8n community node for the **Agent Commerce Transaction Protocol (ACTP)** - add AI agent payment rails to any n8n workflow with blockchain-based escrow.

## Features

- **Simple Mode**: User-friendly operations for common payment workflows
- **Advanced Mode**: Full protocol control for complex integrations
- **Mock Runtime**: Local development without blockchain connection
- **Multi-Network**: Support for Base Sepolia (testnet) and Base Mainnet
- **Type-safe**: Full TypeScript with comprehensive error handling
- **Security Built-in**: Private key protection, input validation, DoS prevention

## Installation

### Via n8n UI (Recommended)

1. Go to **Settings** → **Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-actp`
4. Click **Install**

### Via npm

```bash
npm install n8n-nodes-actp
```

### Via Docker

Add to your n8n Dockerfile:

```dockerfile
RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-actp
```

## Quick Start

### 1. Create Credentials

1. Go to **Credentials** → **New Credential**
2. Search for **ACTP API**
3. Configure:

| Field | Description |
|-------|-------------|
| Environment | `mock` (testing), `testnet` (Base Sepolia), or `mainnet` (Base) |
| Private Key | Your wallet private key (required for testnet/mainnet) |
| RPC URL | Optional custom RPC endpoint |

### 2. Add ACTP Node to Workflow

1. Add a new node and search for **ACTP**
2. Select your credentials
3. Choose an operation mode (Simple or Advanced)
4. Configure the operation

## Operations

### Simple Mode

Beginner-friendly operations with smart defaults and helpful action hints.

| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Send Payment** | Create and fund a transaction in one step | Pay an AI agent for a service |
| **Check Status** | Get transaction status with next action hints | Monitor payment progress |
| **Start Work** | Provider accepts and begins work | Accept a job request |
| **Mark Delivered** | Provider marks work as complete | Signal job completion |
| **Release Payment** | Release escrowed funds to provider | Approve and pay |
| **Raise Dispute** | Dispute a delivery | Contest unsatisfactory work |
| **Cancel** | Cancel before delivery | Abort a transaction |

### Advanced Mode

Full protocol control for complex integrations and custom workflows.

| Operation | Description |
|-----------|-------------|
| **Create Transaction** | Create transaction without funding |
| **Link Escrow** | Fund and commit to a transaction |
| **Transition State** | Manual state transitions (QUOTED, IN_PROGRESS, DELIVERED) |
| **Release Escrow** | Release with optional EAS attestation |
| **Get Transaction** | Retrieve full transaction details |
| **Get Escrow Balance** | Check locked escrow amount |

## Transaction Lifecycle

```
INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
                ↘                      ↘              ↘
              CANCELLED              CANCELLED      DISPUTED → SETTLED
```

| State | Description |
|-------|-------------|
| `INITIATED` | Transaction created, awaiting escrow |
| `QUOTED` | Provider submitted price quote |
| `COMMITTED` | Escrow linked, funds locked |
| `IN_PROGRESS` | Provider actively working |
| `DELIVERED` | Work delivered with proof |
| `SETTLED` | Payment released (terminal) |
| `DISPUTED` | Under dispute resolution |
| `CANCELLED` | Cancelled before completion |

## Example Workflows

### AI Agent Payment Flow

```
[Webhook Trigger] → [ACTP: Send Payment] → [AI Agent Node] → [ACTP: Mark Delivered] → [ACTP: Release Payment]
```

### Payment Status Monitor

```
[Schedule Trigger] → [ACTP: Check Status] → [IF: Is Delivered?] → [Slack: Notify]
```

### Multi-Provider Orchestration

```
[HTTP Request] → [ACTP: Create Transaction] → [Code: Select Provider] → [ACTP: Link Escrow] → [Wait] → [ACTP: Check Status]
```

## Configuration

### Environment Variables

```bash
# For testnet operations
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=0x...

# For mainnet operations
BASE_MAINNET_RPC=https://mainnet.base.org
BASE_MAINNET_PRIVATE_KEY=0x...
```

### Credential Fields

| Field | Required | Description |
|-------|----------|-------------|
| `environment` | Yes | `mock`, `testnet`, or `mainnet` |
| `privateKey` | Testnet/Mainnet | Wallet private key (never logged) |
| `rpcUrl` | No | Custom RPC endpoint override |
| `stateDirectory` | No | Mock mode state persistence path |

## Error Handling

The node provides structured errors for reliable workflow automation:

```
ACTPError (base)
├── TransactionNotFoundError
├── InvalidStateTransitionError
├── InsufficientBalanceError
├── DeadlinePassedError
├── ValidationError
│   ├── InvalidAddressError
│   └── InvalidAmountError
└── NetworkError
    └── TransactionRevertedError
```

Use the **Error Trigger** node to handle failures gracefully.

## Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Mock | - | ✅ Local Development |
| Base Sepolia | 84532 | ✅ Testnet |
| Base Mainnet | 8453 | ✅ Production |

## Fee Structure

- **Platform Fee**: 1% of transaction amount
- **Minimum Fee**: $0.05 USDC
- **Gas Fees**: Paid by transaction initiator (testnet/mainnet)

## Security

- **Private Key Protection**: Never logged or exposed in errors
- **Input Validation**: All inputs validated before processing
- **DoS Prevention**: Query limits and timeout protection
- **Zero Address Check**: Prevents transactions to burn address
- **Timeout/Retry**: Configurable blockchain operation timeouts

## Development

```bash
# Clone repository
git clone https://github.com/agirails/n8n-nodes-actp.git
cd n8n-nodes-actp

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Development mode (watch)
npm run dev

# Lint
npm run lint

# Format
npm run format
```

### Testing with Testnet

```bash
# Set environment variables
export BASE_SEPOLIA_RPC=https://sepolia.base.org
export BASE_SEPOLIA_PRIVATE_KEY=0x...

# Run integration tests
npm test
```

## API Reference

### Node Properties

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `simple` \| `advanced` | Operation mode |
| `operation` | string | Selected operation |
| `provider` | string | Provider wallet address |
| `amount` | string | Amount in USDC |
| `deadline` | string | Transaction deadline |
| `transactionId` | string | Existing transaction ID |

### Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `txId` | string | Transaction ID |
| `state` | string | Current state |
| `amount` | string | Transaction amount |
| `provider` | string | Provider address |
| `requester` | string | Requester address |
| `escrowId` | string | Escrow ID (if linked) |
| `nextAction` | string | Suggested next action (Simple mode) |

## Troubleshooting

### "Insufficient balance"
Ensure your wallet has enough USDC for the transaction amount plus gas fees.

### "Transaction not found"
Verify the transaction ID is correct and exists on the selected network.

### "Invalid state transition"
Check the transaction lifecycle diagram - some transitions are only valid from specific states.

### "Private key required"
Testnet and mainnet modes require a private key in credentials.

## Requirements

- n8n >= 1.0.0
- Node.js >= 18.10
- Dependencies: @agirails/sdk, ethers

## Links

- [AGIRAILS Documentation](https://docs.agirails.io)
- [GitHub Repository](https://github.com/agirails/n8n-nodes-actp)
- [TypeScript SDK](https://github.com/agirails/sdk-js)
- [Python SDK](https://github.com/agirails/sdk-python)
- [npm Package](https://www.npmjs.com/package/n8n-nodes-actp)
- [Discord](https://discord.gg/nuhCt75qe4)
- [AGIRAILS Website](https://agirails.io)

## License

Apache 2.0 License - see [LICENSE](LICENSE) for details.
