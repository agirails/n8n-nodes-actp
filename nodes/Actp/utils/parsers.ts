import { parseUnits, isAddress } from 'ethers';
import { MAX_INPUT_LENGTHS, isZeroAddress } from './secrets';

/**
 * Parse amount string to USDC wei (6 decimals)
 *
 * Accepts:
 * - "100" → 100 USDC
 * - "100.50" → 100.50 USDC
 * - "0.01" → 0.01 USDC
 *
 * Security: Validates input length to prevent DoS attacks
 */
export function parseAmount(amount: string | number): bigint {
	const amountStr = typeof amount === 'number' ? amount.toString() : amount;

	// DoS protection: limit input length
	if (amountStr.length > MAX_INPUT_LENGTHS.amount) {
		throw new Error(
			`Amount input too long (${amountStr.length} chars). Maximum ${MAX_INPUT_LENGTHS.amount} characters allowed.`,
		);
	}

	// Remove any currency symbols or whitespace
	const cleaned = amountStr.replace(/[$ ,]/g, '').trim();

	if (!cleaned || isNaN(Number(cleaned))) {
		throw new Error(`Invalid amount: "${amount}". Use a number like "100" or "100.50"`);
	}

	const parsedAmount = parseUnits(cleaned, 6);

	// Minimum $0.05 (50000 wei at 6 decimals)
	if (parsedAmount < 50000n) {
		throw new Error(`Amount must be at least $0.05. Got: $${cleaned}`);
	}

	return parsedAmount;
}

/**
 * Parse deadline input to Unix timestamp
 *
 * Accepts:
 * - Number (hours from now): 24 → now + 24 hours
 * - String "+24h" → now + 24 hours
 * - String "+7d" → now + 7 days
 * - ISO date string: "2024-12-31T23:59:59Z"
 * - Unix timestamp: 1735689599
 *
 * Security: Validates input length to prevent DoS attacks
 */
export function parseDeadline(deadline: string | number): number {
	// DoS protection: limit input length for strings
	if (typeof deadline === 'string' && deadline.length > MAX_INPUT_LENGTHS.deadline) {
		throw new Error(
			`Deadline input too long (${deadline.length} chars). Maximum ${MAX_INPUT_LENGTHS.deadline} characters allowed.`,
		);
	}

	const now = Math.floor(Date.now() / 1000);

	// Number: treat as hours from now
	if (typeof deadline === 'number') {
		if (deadline < 1000000000) {
			// Less than ~2001 timestamp, treat as hours
			return now + Math.floor(deadline * 3600);
		}
		// Already a Unix timestamp
		return Math.floor(deadline);
	}

	const deadlineStr = deadline.toString().trim();

	// Relative time: +24h, +7d, +30m
	const relativeMatch = deadlineStr.match(/^\+(\d+)(h|d|m)$/i);
	if (relativeMatch) {
		const value = parseInt(relativeMatch[1], 10);
		const unit = relativeMatch[2].toLowerCase();
		switch (unit) {
			case 'm':
				return now + value * 60;
			case 'h':
				return now + value * 3600;
			case 'd':
				return now + value * 86400;
		}
	}

	// ISO date string
	const parsed = Date.parse(deadlineStr);
	if (!isNaN(parsed)) {
		return Math.floor(parsed / 1000);
	}

	// Try as Unix timestamp
	const asNumber = Number(deadlineStr);
	if (!isNaN(asNumber) && asNumber > 1000000000) {
		return Math.floor(asNumber);
	}

	throw new Error(
		`Invalid deadline: "${deadline}". Use hours (24), relative time (+24h, +7d), ISO date, or Unix timestamp.`,
	);
}

/**
 * Parse dispute window to seconds
 *
 * Accepts:
 * - Number (seconds): 3600
 * - String "1h" → 3600
 * - String "2d" → 172800
 * - String "30m" → 1800
 *
 * Security: Validates input length to prevent DoS attacks
 */
export function parseDisputeWindow(window: string | number): number {
	// DoS protection: limit input length for strings
	if (typeof window === 'string' && window.length > MAX_INPUT_LENGTHS.disputeWindow) {
		throw new Error(
			`Dispute window input too long (${window.length} chars). Maximum ${MAX_INPUT_LENGTHS.disputeWindow} characters allowed.`,
		);
	}

	// Number: treat as seconds
	if (typeof window === 'number') {
		return Math.floor(window);
	}

	const windowStr = window.toString().trim().toLowerCase();

	// Parse time units
	const match = windowStr.match(/^(\d+)(s|m|h|d)$/);
	if (match) {
		const value = parseInt(match[1], 10);
		const unit = match[2];
		switch (unit) {
			case 's':
				return value;
			case 'm':
				return value * 60;
			case 'h':
				return value * 3600;
			case 'd':
				return value * 86400;
		}
	}

	// Try as plain number (seconds)
	const asNumber = Number(windowStr);
	if (!isNaN(asNumber)) {
		return Math.floor(asNumber);
	}

	throw new Error(
		`Invalid dispute window: "${window}". Use seconds (3600), or time format (1h, 2d, 30m).`,
	);
}

/**
 * Validate and normalize Ethereum address
 *
 * Security:
 * - Validates input length to prevent DoS attacks
 * - Rejects zero address (0x000...000) to prevent accidental burns
 */
export function parseAddress(address: string, fieldName = 'Address'): string {
	// DoS protection: limit input length
	if (address.length > MAX_INPUT_LENGTHS.address) {
		throw new Error(
			`${fieldName} input too long (${address.length} chars). Maximum ${MAX_INPUT_LENGTHS.address} characters allowed.`,
		);
	}

	const cleaned = address.trim();

	if (!cleaned) {
		throw new Error(`${fieldName} is required`);
	}

	if (!isAddress(cleaned)) {
		throw new Error(`${fieldName} is not a valid Ethereum address: "${cleaned}"`);
	}

	// Security: reject zero address to prevent accidental burns
	if (isZeroAddress(cleaned)) {
		throw new Error(`${fieldName} cannot be the zero address (0x0000...0000)`);
	}

	return cleaned;
}

/**
 * Parse transaction ID (bytes32 hex string)
 *
 * Security: Validates input length to prevent DoS attacks
 */
export function parseTransactionId(txId: string): string {
	// DoS protection: limit input length
	if (txId.length > MAX_INPUT_LENGTHS.transactionId) {
		throw new Error(
			`Transaction ID input too long (${txId.length} chars). Maximum ${MAX_INPUT_LENGTHS.transactionId} characters allowed.`,
		);
	}

	const cleaned = txId.trim();

	if (!cleaned) {
		throw new Error('Transaction ID is required');
	}

	// Must be 0x + 64 hex characters
	if (!/^0x[0-9a-fA-F]{64}$/.test(cleaned)) {
		throw new Error(
			`Invalid transaction ID: "${cleaned}". Must be a 66-character hex string (0x + 64 hex chars).`,
		);
	}

	return cleaned.toLowerCase();
}

/**
 * Parse state string to enum value
 */
export function parseState(state: string): number {
	const stateMap: Record<string, number> = {
		initiated: 0,
		quoted: 1,
		committed: 2,
		in_progress: 3,
		inprogress: 3,
		delivered: 4,
		settled: 5,
		disputed: 6,
		cancelled: 7,
		canceled: 7,
	};

	const normalized = state.toLowerCase().replace(/[^a-z_]/g, '');
	const stateValue = stateMap[normalized];

	if (stateValue === undefined) {
		throw new Error(
			`Invalid state: "${state}". Valid states: INITIATED, QUOTED, COMMITTED, IN_PROGRESS, DELIVERED, SETTLED, DISPUTED, CANCELLED.`,
		);
	}

	return stateValue;
}
