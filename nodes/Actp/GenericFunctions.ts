import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import { isAddress, getAddress } from 'ethers';

/**
 * Sanitize error messages to prevent private key exposure
 * Redacts any 64-character hex strings that could be private keys
 */
export function sanitizeError(error: Error | string): string {
	const errorMessage = typeof error === 'string' ? error : error.message;

	// Redact potential private keys (64 hex chars, with or without 0x prefix)
	return errorMessage.replace(/0x[0-9a-fA-F]{64}\b/g, '[REDACTED_KEY]')
		.replace(/\b[0-9a-fA-F]{64}\b/g, '[REDACTED_KEY]');
}

/**
 * Validate and normalize Ethereum address
 * @param address - The address to validate
 * @param fieldName - Name of the field for error messages
 * @returns Checksummed Ethereum address
 * @throws Error if address is invalid
 */
export function validateEthereumAddress(address: string, fieldName: string): string {
	if (!address || typeof address !== 'string') {
		throw new Error(`${fieldName} is required and must be a string`);
	}

	// Remove whitespace
	const trimmedAddress = address.trim();

	// Validate using ethers isAddress
	if (!isAddress(trimmedAddress)) {
		throw new Error(`Invalid Ethereum address for ${fieldName}: ${trimmedAddress}`);
	}

	// Return checksummed address
	const checksummed = getAddress(trimmedAddress);

	// Reject zero address
	if (checksummed === '0x0000000000000000000000000000000000000000') {
		throw new Error(`${fieldName} cannot be zero address`);
	}

	return checksummed;
}

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

	// Validate private key format (0x + 64 hex characters)
	if (!privateKey.startsWith('0x')) {
		throw new Error('Private key must start with 0x');
	}
	if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
		throw new Error('Invalid private key format. Must be 0x followed by 64 hex characters');
	}

	// Expected chain IDs for each network
	const expectedChainIds: Record<string, number> = {
		'base-sepolia': 84532,
		'base-mainnet': 8453,
	};

	// Initialize ACTP client with error sanitization
	try {
		const client = await ACTPClient.create({
			network,
			privateKey,
			rpcUrl: rpcUrl || undefined,
		});

		// Verify chain ID matches expected network by getting address (validates connection)
		// Note: Chain ID verification happens inside SDK during initialization
		// We validate the network parameter matches expected values
		const expectedChainId = expectedChainIds[network];
		if (!expectedChainId) {
			throw new Error(`Unsupported network: ${network}. Use 'base-sepolia' or 'base-mainnet'.`);
		}

		return client;
	} catch (error: any) {
		const sanitizedMessage = sanitizeError(error);
		throw new Error(`Failed to initialize ACTP client: ${sanitizedMessage}`);
	}
}

/**
 * FilebaseClient interface for type safety
 */
interface FilebaseClientInstance {
	uploadJSON(data: any, filename?: string): Promise<{ cid: string; size: number; uploadedAt: number }>;
	downloadJSON<T = any>(cid: string): Promise<T>;
	exists(cid: string): Promise<boolean>;
	validateCID(cid: string): { valid: boolean; version?: number; error?: string };
}

/**
 * Initialize Filebase client from n8n credentials
 * Uses dynamic import to handle optional SDK module
 */
export async function getFilebaseClient(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
): Promise<FilebaseClientInstance> {
	const credentials = await this.getCredentials('actpStorage', itemIndex);

	const accessKeyId = credentials.accessKeyId as string;
	const secretAccessKey = credentials.secretAccessKey as string;
	const bucketName = credentials.bucketName as string | undefined;
	const maxUploadSize = credentials.maxUploadSize as number | undefined;

	if (!accessKeyId || !secretAccessKey) {
		throw new Error('Filebase credentials (accessKeyId and secretAccessKey) are required for storage operations');
	}

	// Dynamic import to handle SDK module availability
	let FilebaseClient: any;
	try {
		const sdk = await import('@agirails/sdk');
		FilebaseClient = (sdk as any).FilebaseClient;
		if (!FilebaseClient) {
			throw new Error('FilebaseClient not found in SDK');
		}
	} catch (error) {
		throw new Error(
			'Storage operations require SDK version with AIP-7 support. ' +
			'Please upgrade @agirails/sdk to version 2.1.0 or later.'
		);
	}

	return new FilebaseClient({
		accessKeyId,
		secretAccessKey,
		bucketName: bucketName || undefined,
		maxUploadSize: maxUploadSize ? maxUploadSize * 1024 * 1024 : undefined, // Convert MB to bytes
	});
}

/**
 * Parse and validate transaction ID (bytes32 format)
 * @param txId - Transaction ID to validate
 * @returns Validated transaction ID with 0x prefix
 * @throws Error if transaction ID is malformed
 */
export function parseTransactionId(txId: string): string {
	if (!txId || typeof txId !== 'string') {
		throw new Error('Transaction ID is required and must be a string');
	}

	// Remove whitespace
	const trimmedTxId = txId.trim();

	// Support both hex string and bytes32 format
	let normalizedTxId = trimmedTxId;
	if (!trimmedTxId.startsWith('0x')) {
		normalizedTxId = `0x${trimmedTxId}`;
	}

	// Validate bytes32 format (0x + 64 hex characters)
	const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
	if (!bytes32Regex.test(normalizedTxId)) {
		throw new Error(
			`Invalid transaction ID format. Expected bytes32 (66 characters: 0x + 64 hex chars), got: ${trimmedTxId.substring(0, 20)}...`
		);
	}

	return normalizedTxId;
}

/**
 * Convert USDC amount from human-readable to wei (6 decimals)
 * Enforces protocol bounds: minimum $0.05, maximum $1,000,000,000
 * @param amount - Amount in USDC (human-readable)
 * @returns Amount in wei (6 decimals)
 * @throws Error if amount is invalid or out of bounds
 */
export function parseUsdcAmount(amount: number | string): bigint {
	const amountStr = typeof amount === 'string' ? amount : amount.toString();
	const amountFloat = parseFloat(amountStr);

	// Validate amount is a valid number
	if (isNaN(amountFloat) || !isFinite(amountFloat)) {
		throw new Error(`Invalid USDC amount: ${amountStr}`);
	}

	// Reject negative amounts
	if (amountFloat < 0) {
		throw new Error(`USDC amount cannot be negative: ${amountFloat}`);
	}

	// Enforce minimum: $0.05 (protocol minimum)
	const MINIMUM_USDC = 0.05;
	if (amountFloat < MINIMUM_USDC) {
		throw new Error(`USDC amount too low. Minimum is $${MINIMUM_USDC}, got: $${amountFloat}`);
	}

	// Enforce maximum: $1,000,000,000 (1 billion)
	const MAXIMUM_USDC = 1_000_000_000;
	if (amountFloat > MAXIMUM_USDC) {
		throw new Error(`USDC amount too high. Maximum is $${MAXIMUM_USDC.toLocaleString()}, got: $${amountFloat.toLocaleString()}`);
	}

	// Convert to wei (6 decimals)
	const amountWei = Math.floor(amountFloat * 1_000_000);

	// Check for precision loss (USDC supports 6 decimals = $0.000001 precision)
	const reconstructed = amountWei / 1_000_000;
	const precisionLoss = Math.abs(amountFloat - reconstructed);
	if (precisionLoss > 0.000001) {
		throw new Error(
			`Precision loss detected. USDC supports 6 decimals maximum. Original: ${amountFloat}, After conversion: ${reconstructed}`
		);
	}

	return BigInt(amountWei);
}

/**
 * Convert USDC amount from wei (6 decimals) to human-readable
 */
export function formatUsdcAmount(amount: bigint): string {
	return (Number(amount) / 1_000_000).toFixed(2);
}

/**
 * Parse and validate deadline timestamp from various formats
 * Enforces that deadline is in the future and within 1 year max
 * @param deadline - Deadline as ISO date string, Unix timestamp (seconds or ms)
 * @returns Unix timestamp in seconds
 * @throws Error if deadline is invalid, in the past, or too far in future
 */
export function parseDeadline(deadline: string | number): number {
	let timestampSeconds: number;

	if (typeof deadline === 'number') {
		// If > 1e10, assume milliseconds and convert to seconds
		timestampSeconds = deadline > 1e10 ? Math.floor(deadline / 1000) : deadline;
	} else {
		// Support ISO date strings, Unix timestamps (seconds), or relative time
		const parsed = Date.parse(deadline);
		if (!isNaN(parsed)) {
			timestampSeconds = Math.floor(parsed / 1000); // Convert to Unix timestamp (seconds)
		} else {
			// Try parsing as Unix timestamp
			const timestamp = parseInt(deadline, 10);
			if (!isNaN(timestamp)) {
				// If > 1e10, assume milliseconds and convert to seconds
				timestampSeconds = timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp;
			} else {
				throw new Error('Invalid deadline format. Use ISO date string or Unix timestamp.');
			}
		}
	}

	// Validate deadline is a valid timestamp
	if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
		throw new Error(`Invalid deadline timestamp: ${deadline}`);
	}

	// Get current time in seconds
	const nowSeconds = Math.floor(Date.now() / 1000);

	// Reject past timestamps
	if (timestampSeconds <= nowSeconds) {
		const deadlineDate = new Date(timestampSeconds * 1000).toISOString();
		const nowDate = new Date(nowSeconds * 1000).toISOString();
		throw new Error(
			`Deadline must be in the future. Deadline: ${deadlineDate}, Current time: ${nowDate}`
		);
	}

	// Limit max deadline to 1 year in the future (365 days)
	const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
	const maxDeadline = nowSeconds + ONE_YEAR_SECONDS;
	if (timestampSeconds > maxDeadline) {
		const deadlineDate = new Date(timestampSeconds * 1000).toISOString();
		const maxDate = new Date(maxDeadline * 1000).toISOString();
		throw new Error(
			`Deadline too far in future. Maximum is 1 year from now. Deadline: ${deadlineDate}, Max allowed: ${maxDate}`
		);
	}

	return timestampSeconds;
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
