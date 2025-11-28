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
