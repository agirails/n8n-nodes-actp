# Changelog

All notable changes to n8n-nodes-actp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-28

### Added
- Initial release of n8n-nodes-actp
- ACTP API credentials (Private Key, Network, RPC URL)
- Create Transaction operation (requester side)
- Link Escrow operation (lock funds)
- Get Transaction operation (query state)
- Transition State operation (QUOTED, IN_PROGRESS, DELIVERED)
- Release Escrow operation (settle payment)
- Raise Dispute operation (initiate dispute resolution)
- Cancel Transaction operation (cancel before delivery)
- Support for Base Sepolia testnet (mainnet coming soon)
- Comprehensive error handling and validation
- Human-readable state formatting
- USDC amount conversion (human-readable ↔ wei)
- Deadline parsing (ISO dates, Unix timestamps)
- Full documentation and testing guide

### Security
- Private key stored securely in n8n credentials
- SDK v2.0.1-beta dependency with security enhancements
- Gas buffer protection for all operations
- Validation for all input parameters

## [Unreleased]

### Planned
- EAS (Ethereum Attestation Service) integration
- Quote building operations
- Batch transaction support
- Webhook triggers for transaction events
- Advanced filtering for Get Transaction
- Multi-signature escrow support (V2)
