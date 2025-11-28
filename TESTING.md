# Testing Guide for n8n-nodes-actp

This guide will help you test the ACTP node locally before publishing.

## Prerequisites

1. **n8n installed locally**:
   ```bash
   npm install -g n8n
   ```

2. **Base Sepolia testnet account**:
   - Create Ethereum wallet (e.g., MetaMask)
   - Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Get testnet USDC (mock deployment)

3. **Environment variables**:
   ```bash
   export PRIVATE_KEY="0x..."  # Your testnet private key
   export PROVIDER_ADDRESS="0x..." # Another testnet address to act as provider
   ```

## Build and Link Node Locally

1. **Build the node**:
   ```bash
   cd n8n-nodes-actp
   npm install
   npm run build
   ```

2. **Link to n8n** (Option A - npm link):
   ```bash
   npm link
   ```

   Then in your n8n custom nodes directory:
   ```bash
   mkdir -p ~/.n8n/custom
   cd ~/.n8n/custom
   npm link n8n-nodes-actp
   ```

3. **Alternative: Direct install** (Option B):
   ```bash
   n8n install n8n-nodes-actp@file:/absolute/path/to/n8n-nodes-actp
   ```

4. **Start n8n**:
   ```bash
   n8n start
   ```

   Access n8n at: http://localhost:5678

## Testing Workflows

### Test 1: Happy Path (Complete Transaction)

**Workflow**:
1. Create Transaction
2. Link Escrow
3. Transition State (IN_PROGRESS)
4. Transition State (DELIVERED)
5. Release Escrow

**n8n Workflow JSON** (import this):
```json
{
  "name": "ACTP Happy Path Test",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "createTransaction",
        "provider": "={{$env.PROVIDER_ADDRESS}}",
        "amount": 10,
        "deadline": "={{Math.floor(Date.now() / 1000) + 86400}}",
        "disputeWindow": 172800
      },
      "name": "Create Transaction",
      "type": "n8n-nodes-actp.actp",
      "credentials": {
        "actpApi": {
          "id": "1",
          "name": "ACTP Base Sepolia"
        }
      },
      "position": [450, 300]
    },
    {
      "parameters": {
        "operation": "linkEscrow",
        "transactionId": "={{$json.transactionId}}",
        "escrowAmount": 10.1
      },
      "name": "Link Escrow",
      "type": "n8n-nodes-actp.actp",
      "credentials": {
        "actpApi": {
          "id": "1",
          "name": "ACTP Base Sepolia"
        }
      },
      "position": [650, 300]
    },
    {
      "parameters": {
        "operation": "transitionState",
        "transactionId": "={{$json.transactionId}}",
        "targetState": 3
      },
      "name": "Mark In Progress",
      "type": "n8n-nodes-actp.actp",
      "credentials": {
        "actpApi": {
          "id": "1",
          "name": "ACTP Base Sepolia"
        }
      },
      "position": [850, 300]
    },
    {
      "parameters": {
        "operation": "transitionState",
        "transactionId": "={{$json.transactionId}}",
        "targetState": 4
      },
      "name": "Mark Delivered",
      "type": "n8n-nodes-actp.actp",
      "credentials": {
        "actpApi": {
          "id": "1",
          "name": "ACTP Base Sepolia"
        }
      },
      "position": [1050, 300]
    },
    {
      "parameters": {
        "operation": "releaseEscrow",
        "transactionId": "={{$json.transactionId}}"
      },
      "name": "Release Payment",
      "type": "n8n-nodes-actp.actp",
      "credentials": {
        "actpApi": {
          "id": "1",
          "name": "ACTP Base Sepolia"
        }
      },
      "position": [1250, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [[{"node": "Create Transaction"}]]
    },
    "Create Transaction": {
      "main": [[{"node": "Link Escrow"}]]
    },
    "Link Escrow": {
      "main": [[{"node": "Mark In Progress"}]]
    },
    "Mark In Progress": {
      "main": [[{"node": "Mark Delivered"}]]
    },
    "Mark Delivered": {
      "main": [[{"node": "Release Payment"}]]
    }
  }
}
```

### Test 2: Dispute Flow

**Workflow**:
1. Create Transaction
2. Link Escrow
3. Transition State (DELIVERED)
4. Raise Dispute

**Expected Result**:
- Transaction state: DISPUTED
- Requires off-chain arbitration to resolve

### Test 3: Cancellation

**Workflow**:
1. Create Transaction
2. Link Escrow
3. Cancel Transaction

**Expected Result**:
- Transaction state: CANCELLED
- Escrow funds returned to requester

### Test 4: Query Transaction

**Workflow**:
1. Create Transaction (get TX ID)
2. Wait 5 seconds
3. Get Transaction (query status)

**Expected Result**:
- Full transaction details returned
- Timestamps, amounts, addresses visible

## Manual Testing Checklist

- [ ] Credentials configuration works
- [ ] Create Transaction succeeds
- [ ] Link Escrow locks funds correctly
- [ ] Get Transaction retrieves correct data
- [ ] Transition State (QUOTED) works
- [ ] Transition State (IN_PROGRESS) works
- [ ] Transition State (DELIVERED) works
- [ ] Release Escrow settles transaction
- [ ] Raise Dispute transitions to DISPUTED
- [ ] Cancel Transaction works before DELIVERED
- [ ] Error handling for invalid inputs
- [ ] Gas estimation doesn't fail
- [ ] Transaction receipts are returned

## Common Issues

### Issue: "Provider not initialized"
**Solution**: Check private key format (must start with 0x)

### Issue: "Transaction reverted: Insufficient escrow balance"
**Solution**:
1. Ensure USDC approval: `client.escrow.approveUsdc(amount)`
2. Check USDC balance in wallet

### Issue: "Invalid state transition"
**Solution**: Check current transaction state with Get Transaction before transitioning

### Issue: "Deadline passed"
**Solution**: Use future timestamp for deadline (current time + buffer)

## Debugging

Enable n8n debug logs:
```bash
export N8N_LOG_LEVEL=debug
n8n start
```

Check node output in n8n execution view:
- Click on node after execution
- View JSON output
- Check error messages

## Next Steps

After testing locally:

1. **Publish to npm**:
   ```bash
   npm version 1.0.0
   npm publish --access public
   ```

2. **Submit to n8n community nodes**:
   - Create PR to n8n-io/n8n-nodes-registry
   - Include README, screenshots, example workflows

3. **Documentation**:
   - Add to AGIRAILS docs site
   - Create tutorial videos
   - Write blog post

## Support

If you encounter issues:
1. Check n8n logs: `~/.n8n/logs/`
2. Check blockchain transactions on BaseScan
3. Open issue on GitHub
4. Contact: developers@agirails.io
