# Quick Start Guide

Get up and running with ACTP n8n node in 5 minutes.

## Step 1: Install Node

### In n8n GUI
1. Open n8n: http://localhost:5678
2. Go to **Settings** → **Community Nodes**
3. Click **Install**
4. Enter: `n8n-nodes-actp`
5. Click **Install**

### Via CLI
```bash
npm install n8n-nodes-actp
```

## Step 2: Configure Credentials

1. In n8n workflow editor, add **ACTP** node
2. Click **Create New Credentials**
3. Fill in:
   - **Network**: `Base Sepolia` (for testing) or `Base Mainnet`
   - **Private Key**: `0x...` (your wallet private key)
   - **RPC URL**: Leave empty (uses default) or custom RPC

⚠️ **Security**: Use a dedicated wallet for automation. Never share private keys.

## Step 3: Create Your First Transaction

### Simple 2-Node Workflow

**Node 1: Create Transaction**
- Operation: `Create Transaction`
- Provider Address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` (example)
- Amount: `10` USDC
- Deadline: `{{Math.floor(Date.now() / 1000) + 86400}}` (24 hours from now)
- Dispute Window: `172800` (2 days in seconds)

**Node 2: Get Transaction**
- Operation: `Get Transaction`
- Transaction ID: `={{$json.transactionId}}` (from previous node)

### Output
```json
{
  "transactionId": "0x1234...",
  "requester": "0xYourAddress...",
  "provider": "0x742d35...",
  "amount": "10.00",
  "state": "INITIATED",
  "deadline": 1735689600,
  "disputeWindow": 172800
}
```

## Step 4: Lock Funds in Escrow

Add another node:

**Node 3: Link Escrow**
- Operation: `Link Escrow`
- Transaction ID: `={{$json.transactionId}}`
- Escrow Amount: `10.10` (amount + 1% fee)

**Result**: Transaction state → `COMMITTED`

## Step 5: Complete Transaction

Provider marks work complete:

**Node 4: Transition State**
- Operation: `Transition State`
- Transaction ID: `={{$json.transactionId}}`
- Target State: `Delivered`

Requester releases payment:

**Node 5: Release Escrow**
- Operation: `Release Escrow`
- Transaction ID: `={{$json.transactionId}}`

**Result**: Transaction state → `SETTLED`, funds sent to provider

## Common Use Cases

### AI Agent Payment Workflow
```
Trigger (Webhook)
  → Create Transaction
  → Link Escrow
  → Wait for delivery webhook
  → Release Escrow
```

### Automated Escrow with Approval
```
Create Transaction
  → Link Escrow
  → Send notification (Email/Slack)
  → Wait for manual approval
  → Release Escrow
```

### Multi-Step Service with Milestones
```
Create Transaction ($100)
  → Link Escrow ($101)
  → Provider marks IN_PROGRESS
  → Provider marks DELIVERED
  → Get Transaction (verify state)
  → Release Escrow (settle)
```

## Troubleshooting

### Private Key Error
**Error**: "Private key must start with 0x"
**Fix**: Add `0x` prefix to your private key

### Insufficient Balance
**Error**: "Transaction reverted: Insufficient escrow balance"
**Fix**:
1. Check USDC balance: Must have amount + fee (1%)
2. Approve USDC spending (done automatically by SDK)

### Deadline Passed
**Error**: "Deadline passed"
**Fix**: Use future timestamp:
```javascript
// 24 hours from now (Unix timestamp in seconds)
{{Math.floor(Date.now() / 1000) + 86400}}
```

## Next Steps

- Read full [README.md](./README.md) for all operations
- See [TESTING.md](./TESTING.md) for comprehensive testing guide
- Check [CHANGELOG.md](./CHANGELOG.md) for version history
- Visit [docs.agirails.io](https://docs.agirails.io) for protocol details

## Support

- Issues: [GitHub Issues](https://github.com/agirails/n8n-nodes-actp/issues)
- Email: developers@agirails.io
- Discord: [AGIRAILS Community](https://discord.gg/agirails)
