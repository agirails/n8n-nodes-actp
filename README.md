# n8n-nodes-actp

This is an n8n community node that integrates with AGIRAILS ACTP (Agent Commerce Transaction Protocol).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[AGIRAILS](https://agirails.io) is building the neutral settlement and trust layer for the AI agent economy.

## Features

This node enables you to:

- **Create Transaction**: Create new ACTP transactions (requester side)
- **Link Escrow**: Lock funds in escrow for a transaction
- **Get Transaction**: Retrieve transaction details and current state
- **Transition State**: Move transaction through ACTP lifecycle (QUOTED, IN_PROGRESS, DELIVERED)
- **Release Escrow**: Release locked funds to provider after successful delivery
- **Raise Dispute**: Initiate dispute resolution for delivered transactions
- **Cancel Transaction**: Cancel transactions before delivery

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Package

Install via n8n GUI:
```
Settings → Community Nodes → Install → n8n-nodes-actp
```

### Local Development

```bash
npm install n8n-nodes-actp
```

## Credentials

This node requires ACTP API credentials:

1. **Network**: Select Base Sepolia (testnet) or Base Mainnet
2. **Private Key**: Ethereum wallet private key (0x... format) for signing transactions
3. **RPC URL** (optional): Custom RPC endpoint URL (uses default network RPC if empty)

⚠️ **Security Warning**: Never share your private key. Use environment variables in production.

### Setting Up Your Wallet

If you don't have an Ethereum wallet yet:

1. **Install MetaMask** browser extension: [metamask.io](https://metamask.io/download/)
2. **Create a new wallet** and save your seed phrase securely
3. **Add Base Sepolia network** to MetaMask:
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency: `ETH`
   - Explorer: `https://sepolia.basescan.org`

   Or use [Chainlist](https://chainlist.org/?search=base+sepolia&testnets=true) to add automatically.

4. **Export your private key** (for n8n credentials):
   - MetaMask → Account details → Show private key
   - ⚠️ **Never share this key with anyone!**

5. **Your wallet address** is shown at the top of MetaMask (0x...)
   - This is your public address - safe to share
   - Use this when someone asks for your "provider address" or "requester address"

### Checking Your Balances

**Via MetaMask:**
- ETH balance shows automatically
- For USDC: Add token → Custom → Contract: `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb`

**Via Basescan:**
- Go to `https://sepolia.basescan.org/address/YOUR_ADDRESS`
- See all token balances and transaction history

### Getting Testnet Funds (Base Sepolia)

Before using ACTP on testnet, you need:

1. **Base Sepolia ETH** (for gas fees):
   - Get free testnet ETH from [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Or [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)
   - You need ~0.01 ETH for multiple transactions

2. **Mock USDC (mUSDC)** (for payments):
   - Contract: `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb`
   - This is a test token with open minting - anyone can mint
   - To mint mUSDC, call the `mint` function on the contract:
     ```
     mint(yourAddress, amount)
     ```
   - Amount is in 6 decimals (1 USDC = 1000000)
   - Use [Basescan](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb#writeContract) to mint directly

**Quick Mint via Basescan:**
1. Go to [MockUSDC Contract](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb#writeContract)
2. Connect your wallet (MetaMask)
3. Find `mint` function
4. Enter: `to` = your address, `amount` = 10000000000 (10,000 USDC)
5. Click "Write" and confirm transaction

### Understanding Requester vs Provider

The **private key in credentials** determines YOUR identity in the transaction:

| Your Role | Your Credentials | What You Do |
|-----------|------------------|-------------|
| **Requester** (buyer) | Your wallet private key | Create Transaction, Link Escrow, Release Payment |
| **Provider** (seller) | Your wallet private key | Transition State, Deliver Work |

**Example Setup:**

**If you are the Requester (paying for a service):**
- Credentials: Your wallet with USDC funds
- Create Transaction: Enter the **provider's** Ethereum address
- Your address is automatically used as the requester (derived from your private key)

**If you are the Provider (delivering a service):**
- Credentials: Your wallet (to sign state transitions)
- You receive the Transaction ID from the requester
- Use "Transition State" to mark work as IN_PROGRESS → DELIVERED

**Can I use the same wallet for both roles?**
- **For testing**: Yes, you can be both requester and provider with the same wallet
- **In production**: No, this defeats the purpose (you'd be paying yourself)

**Two-Party Workflow:**
```
Requester Workflow (n8n instance A):     Provider Workflow (n8n instance B):
┌─────────────────────────┐              ┌─────────────────────────┐
│ Credentials: Requester  │              │ Credentials: Provider   │
│ Private Key: 0xAAA...   │              │ Private Key: 0xBBB...   │
└─────────────────────────┘              └─────────────────────────┘
         │                                        │
         ▼                                        │
   Create Transaction ──── txId ─────────────────►│
   (provider: 0xBBB...)                           │
         │                                        ▼
         ▼                                  Transition State
   Link Escrow                              (IN_PROGRESS)
         │                                        │
         │                                        ▼
         │                                  Transition State
         │                                  (DELIVERED)
         │                                        │
         │◄────────── attestation UID ───────────┘
         ▼
   Release With Verification
         │
         ▼
   Provider receives USDC
```

## Operations

### Create Transaction
Create a new ACTP transaction as the service requester.

**Parameters**:
- Provider Address: Ethereum address of the service provider
- Amount (USDC): Transaction amount (minimum $0.05)
- Deadline: Transaction deadline (ISO date or Unix timestamp)
- Dispute Window: Duration in seconds for dispute period (default: 2 days)

**Returns**: Transaction ID, state (INITIATED)

### Link Escrow
Lock USDC funds in escrow for the transaction. Automatically transitions state to COMMITTED.

**Parameters**:
- Transaction ID: Bytes32 transaction identifier
- Escrow Amount: Amount to lock (should be transaction amount + platform fee)

**Returns**: Transaction ID, state (COMMITTED)

### Get Transaction
Retrieve full transaction details.

**Parameters**:
- Transaction ID: Bytes32 transaction identifier

**Returns**: Complete transaction object with state, amounts, timestamps, parties

### Transition State
Transition transaction to new state (provider operations).

**Parameters**:
- Transaction ID: Bytes32 transaction identifier
- Target State: QUOTED, IN_PROGRESS, or DELIVERED

**Returns**: Transaction ID, new state

### Release Escrow
Release locked funds to provider (requester confirms completion).

**Parameters**:
- Transaction ID: Bytes32 transaction identifier

**Returns**: Transaction ID, state (SETTLED)

### Raise Dispute
Raise a dispute on a delivered transaction.

**Parameters**:
- Transaction ID: Bytes32 transaction identifier
- Dispute Reason: Description of the issue
- Evidence (optional): Supporting evidence (IPFS hash, screenshots)

**Returns**: Transaction ID, state (DISPUTED)

### Cancel Transaction
Cancel transaction before delivery (requester or provider).

**Parameters**:
- Transaction ID: Bytes32 transaction identifier

**Returns**: Transaction ID, state (CANCELLED)

## ACTP State Machine

```
INITIATED → QUOTED (optional) → COMMITTED → IN_PROGRESS (optional) → DELIVERED → SETTLED

Alternative paths:
- DELIVERED → DISPUTED → SETTLED
- Any pre-DELIVERED state → CANCELLED
```

## Example Workflow

### Happy Path (Requester → Provider) - V1.1+ Recommended

1. **Requester**: Create Transaction
   - Provider: 0x742d35...
   - Amount: 100 USDC
   - Deadline: 7 days from now

2. **Requester**: Link Escrow
   - Transaction ID: (from step 1)
   - Auto-calculates: 101 USDC (100 + 1% fee)

3. **Provider**: Transition State (IN_PROGRESS)
   - Transaction ID: (from step 1)
   - Target State: IN_PROGRESS

4. **Provider**: Transition State (DELIVERED)
   - Transaction ID: (from step 1)
   - Target State: DELIVERED
   - Provider submits attestation UID

5. **Requester**: Release With Verification (RECOMMENDED)
   - Transaction ID: (from step 1)
   - Attestation UID: (from step 4)
   - Result: Atomically verifies attestation AND releases funds
   - Provider receives 100 USDC, platform receives 1 USDC fee

### Alternative: Manual Verification (V1.1+)

5a. **Requester**: Verify Attestation (OPTIONAL)
   - Transaction ID: (from step 1)
   - Attestation UID: (from step 4)
   - Returns: { verified: true/false }

5b. **Requester**: Release Escrow (only if verified)
   - Transaction ID: (from step 1)
   - Result: Provider receives 100 USDC, platform receives 1 USDC fee

### Legacy V1.0 Workflow (NOT RECOMMENDED)

5. **Requester**: Release Escrow
   - Transaction ID: (from step 1)
   - **WARNING**: NO attestation verification!
   - **SECURITY RISK**: May pay for unverified work
   - Result: Provider receives 100 USDC, platform receives 1 USDC fee

### Dispute Path

1-4. Same as happy path

5. **Requester**: Raise Dispute
   - Transaction ID: (from step 1)
   - Reason: "Work incomplete"

6. **Off-chain arbitration** (manual intervention)

7. Mediator resolves dispute via admin function

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [SDK Documentation](https://github.com/agirails/sdk-js)

## V1 Limitations & Security Warnings

### Manual Attestation Verification Required

**CRITICAL**: The "Release Escrow" operation in V1 does NOT automatically verify delivery attestations.

**Security Risk**: If you release escrow without verifying the attestation, you may pay for undelivered or incorrectly delivered work.

**Recommended Workflow**:
1. Provider transitions to DELIVERED
2. **YOU MUST manually verify the attestation** using "Verify Attestation" operation
3. Only if verification passes, use "Release Escrow"

**Better Alternative (V1.1+)**: Use "Release With Verification" operation which atomically verifies attestation and releases escrow in one step.

### Migration Path

V1.1+ introduces:
- **Verify Attestation**: Standalone attestation verification
- **Release With Verification**: Atomic verify + release (recommended)
- **Auto-calculate Escrow Amount**: No need to manually add 1% fee

## Version History

### 1.1.0 (2025-11-28)
- Added "Verify Attestation" operation for manual attestation verification
- Added "Release With Verification" operation for atomic verify + release
- Enhanced "Link Escrow" with auto-calculate amount feature
- Improved security warnings in documentation
- Added detailed workflow examples with attestation verification

### 1.0.0 (2025-11-28)
- Initial release
- Support for all core ACTP operations
- Base Sepolia and Base Mainnet support

## License

Apache-2.0

## Support

- Issues: [GitHub Issues](https://github.com/agirails/n8n-nodes-actp/issues)
- Email: developers@agirails.io
