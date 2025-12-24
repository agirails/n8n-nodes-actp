import type { IExecuteFunctions, ICredentialDataDecryptedObject } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import { keccak256, toUtf8Bytes, Wallet as ethersWallet } from 'ethers';
import { redactSecrets } from './secrets';
import { PROTOCOL_CONSTANTS } from './constants';

// Re-export for internal use (avoid naming collision with credentials)
const ethers = { Wallet: ethersWallet };

/**
 * Client cache to avoid re-initialization overhead
 */
const clientCache = new Map<string, ACTPClient>();

/**
 * Creates an ACTPClient from n8n credentials
 *
 * Handles all three environments:
 * - mock: Local simulation, no blockchain
 * - testnet: Base Sepolia
 * - mainnet: Base Mainnet
 */
export async function createActpClient(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<ACTPClient> {
	const credentials = await context.getCredentials('actpApi', itemIndex);
	return createClientFromCredentials(credentials);
}

/**
 * Create client from raw credentials object
 * (Useful for testing)
 */
export async function createClientFromCredentials(
	credentials: ICredentialDataDecryptedObject,
): Promise<ACTPClient> {
	const environment = credentials.environment as string;
	const cacheKey = generateCacheKey(credentials);

	// Return cached client if exists
	if (clientCache.has(cacheKey)) {
		return clientCache.get(cacheKey)!;
	}

	let client: ACTPClient;

	switch (environment) {
		case 'mock': {
			const mockAddress = (credentials.mockAddress as string) ||
				'0x1111111111111111111111111111111111111111';
			const stateDirectory = credentials.stateDirectory as string | undefined;

			client = await ACTPClient.create({
				mode: 'mock',
				requesterAddress: mockAddress,
				stateDirectory: stateDirectory || undefined,
			});
			break;
		}

		case 'testnet': {
			const privateKey = credentials.privateKey as string;
			validatePrivateKey(privateKey);

			// Derive address from private key (security: address must match the key)
			const wallet = new ethers.Wallet(privateKey);
			const derivedAddress = wallet.address.toLowerCase();

			client = await ACTPClient.create({
				mode: 'testnet',
				requesterAddress: derivedAddress,
				privateKey,
				rpcUrl: (credentials.rpcUrl as string) || undefined,
			});
			break;
		}

		case 'mainnet': {
			const privateKey = credentials.privateKey as string;
			validatePrivateKey(privateKey);

			// Derive address from private key (security: address must match the key)
			const wallet = new ethers.Wallet(privateKey);
			const derivedAddress = wallet.address.toLowerCase();

			client = await ACTPClient.create({
				mode: 'mainnet',
				requesterAddress: derivedAddress,
				privateKey,
				rpcUrl: (credentials.rpcUrl as string) || undefined,
			});
			break;
		}

		default:
			throw new Error(`Unknown environment: ${environment}. Use 'mock', 'testnet', or 'mainnet'.`);
	}

	// Cache the client
	clientCache.set(cacheKey, client);

	return client;
}

/**
 * Validate private key format
 */
function validatePrivateKey(privateKey: string): void {
	if (!privateKey) {
		throw new Error('Private key is required for testnet/mainnet mode');
	}

	if (!privateKey.startsWith('0x')) {
		throw new Error('Private key must start with 0x');
	}

	if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
		throw new Error('Invalid private key format. Must be 0x followed by 64 hex characters.');
	}
}

/**
 * Generate cache key for client (excludes sensitive data from key)
 *
 * Security: Uses hash of private key to ensure different wallets get different cache entries
 * even when using the same RPC URL. The hash is one-way and doesn't expose the key.
 */
function generateCacheKey(credentials: ICredentialDataDecryptedObject): string {
	const environment = credentials.environment as string;

	if (environment === 'mock') {
		return `mock:${credentials.mockAddress || 'default'}`;
	}

	// For blockchain modes, hash the private key to create unique cache key
	// This ensures different wallets don't share cached clients
	const privateKey = credentials.privateKey as string;
	if (privateKey) {
		// Use first 16 chars of keccak256 hash (8 bytes = 64 bits of entropy)
		const keyHash = keccak256(toUtf8Bytes(privateKey)).slice(0, 18);
		return `${environment}:${keyHash}:${credentials.rpcUrl || 'default'}`;
	}

	// Fallback for edge cases (shouldn't happen with proper validation)
	return `${environment}:${credentials.rpcUrl || 'default'}`;
}

/**
 * Clear client cache (useful for testing)
 */
export function clearClientCache(): void {
	clientCache.clear();
}

/**
 * Sanitize error messages to prevent secret exposure
 *
 * Redacts:
 * - Private keys (64-char hex strings)
 * - BIP-39 mnemonic phrases (12-24 word sequences)
 * - API keys (Stripe, AWS, Slack, GitHub, etc.)
 *
 * Security: Uses the secrets module for comprehensive detection
 */
export function sanitizeError(error: Error | string | unknown): string {
	// Handle null/undefined
	if (error == null) {
		return 'Unknown error';
	}

	// Extract message from various error types
	let message: string;
	if (typeof error === 'string') {
		message = error;
	} else if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === 'object' && 'message' in error) {
		message = String((error as { message: unknown }).message);
	} else {
		message = String(error);
	}

	// Use comprehensive secret redaction
	return redactSecrets(message);
}

/**
 * Execute a promise with timeout
 *
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @param operation - Operation name for error message
 * @returns Promise result
 * @throws Error if timeout exceeded
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = PROTOCOL_CONSTANTS.SDK_TIMEOUT_MS,
	operation = 'Operation',
): Promise<T> {
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(
			() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
			timeoutMs,
		),
	);
	return Promise.race([promise, timeout]);
}

/**
 * Check if an error is retryable (transient)
 */
function isRetryableError(error: Error): boolean {
	const message = error.message.toLowerCase();
	return (
		message.includes('rate limit') ||
		message.includes('timeout') ||
		message.includes('network') ||
		message.includes('econnreset') ||
		message.includes('econnrefused') ||
		message.includes('socket hang up') ||
		message.includes('fetch failed')
	);
}

/**
 * Execute a function with retry on transient errors
 *
 * Uses exponential backoff: 1s, 2s, 4s...
 *
 * @param fn - Function to execute
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Function result
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = PROTOCOL_CONSTANTS.MAX_RETRY_ATTEMPTS,
	baseDelay: number = PROTOCOL_CONSTANTS.RETRY_BASE_DELAY_MS,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			const isLastAttempt = attempt === maxRetries - 1;

			if (isLastAttempt || !isRetryableError(lastError)) {
				throw lastError;
			}

			// Exponential backoff
			const delay = baseDelay * Math.pow(2, attempt);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

/**
 * Execute SDK operation with timeout and retry
 *
 * Combines timeout protection and retry logic for robust SDK calls.
 *
 * @param fn - Async function to execute
 * @param operation - Operation name for error messages
 * @returns Function result
 */
export async function executeWithProtection<T>(
	fn: () => Promise<T>,
	operation: string,
): Promise<T> {
	return withRetry(
		() => withTimeout(fn(), PROTOCOL_CONSTANTS.SDK_TIMEOUT_MS, operation),
	);
}
