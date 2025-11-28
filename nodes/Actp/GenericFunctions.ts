import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';

/**
 * Initialize ACTP SDK client from n8n credentials
 */
export async function getActpClient(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
): Promise<ACTPClient> {
	const credentials = await this.getCredentials('actpApi', itemIndex);

	const network = credentials.network as 'base-sepolia' | 'base-mainnet';
	const privateKey = credentials.privateKey as string;
	const rpcUrl = credentials.rpcUrl as string | undefined;

	// Validate private key format
	if (!privateKey.startsWith('0x')) {
		throw new Error('Private key must start with 0x');
	}

	// Initialize ACTP client
	const client = await ACTPClient.create({
		network,
		privateKey,
		rpcUrl: rpcUrl || undefined,
	});

	return client;
}

/**
 * Parse transaction ID from various input formats
 */
export function parseTransactionId(txId: string): string {
	// Support both hex string and bytes32 format
	if (!txId.startsWith('0x')) {
		return `0x${txId}`;
	}
	return txId;
}

/**
 * Convert USDC amount from human-readable to wei (6 decimals)
 */
export function parseUsdcAmount(amount: number | string): bigint {
	const amountStr = typeof amount === 'string' ? amount : amount.toString();
	const amountFloat = parseFloat(amountStr);

	// USDC has 6 decimals
	return BigInt(Math.floor(amountFloat * 1_000_000));
}

/**
 * Convert USDC amount from wei (6 decimals) to human-readable
 */
export function formatUsdcAmount(amount: bigint): string {
	return (Number(amount) / 1_000_000).toFixed(2);
}

/**
 * Parse deadline timestamp from various formats
 */
export function parseDeadline(deadline: string | number): number {
	if (typeof deadline === 'number') {
		return deadline;
	}

	// Support ISO date strings, Unix timestamps (seconds), or relative time
	const parsed = Date.parse(deadline);
	if (!isNaN(parsed)) {
		return Math.floor(parsed / 1000); // Convert to Unix timestamp (seconds)
	}

	// Try parsing as Unix timestamp
	const timestamp = parseInt(deadline, 10);
	if (!isNaN(timestamp)) {
		// If > 1e10, assume milliseconds and convert to seconds
		return timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp;
	}

	throw new Error('Invalid deadline format. Use ISO date string or Unix timestamp.');
}

/**
 * Format state enum to human-readable string
 */
export function formatState(state: number): string {
	const states = [
		'INITIATED',
		'QUOTED',
		'COMMITTED',
		'IN_PROGRESS',
		'DELIVERED',
		'SETTLED',
		'DISPUTED',
		'CANCELLED',
	];
	return states[state] || `UNKNOWN(${state})`;
}
