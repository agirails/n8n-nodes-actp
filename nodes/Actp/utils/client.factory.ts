import type { IExecuteFunctions, ICredentialDataDecryptedObject } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import { redactSecrets } from './secrets';

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

			client = await ACTPClient.create({
				mode: 'testnet',
				requesterAddress: '0x0000000000000000000000000000000000000000', // Derived from privateKey
				privateKey,
				rpcUrl: (credentials.rpcUrl as string) || undefined,
			});
			break;
		}

		case 'mainnet': {
			const privateKey = credentials.privateKey as string;
			validatePrivateKey(privateKey);

			client = await ACTPClient.create({
				mode: 'mainnet',
				requesterAddress: '0x0000000000000000000000000000000000000000', // Derived from privateKey
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
 */
function generateCacheKey(credentials: ICredentialDataDecryptedObject): string {
	const environment = credentials.environment as string;

	if (environment === 'mock') {
		return `mock:${credentials.mockAddress || 'default'}`;
	}

	// For blockchain modes, use a hash of the address (not the private key!)
	// The address is derived from private key, so same key = same address
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
