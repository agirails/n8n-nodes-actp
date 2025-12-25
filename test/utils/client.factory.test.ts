/**
 * Client Factory Unit Tests
 *
 * Tests for ACTP client creation and caching.
 */

import {
	createClientFromCredentials,
	clearClientCache,
	sanitizeError,
} from '../../nodes/ACTP/utils/client.factory';

// Mock the SDK
jest.mock('@agirails/sdk', () => ({
	ACTPClient: {
		create: jest.fn().mockImplementation(async (config) => {
			// Store config for inspection
			const mockClient = {
				_config: config, // Internal for test inspection
				basic: { pay: jest.fn(), checkStatus: jest.fn() },
				standard: {
					createTransaction: jest.fn(),
					linkEscrow: jest.fn(),
					transitionState: jest.fn(),
					releaseEscrow: jest.fn(),
					getTransaction: jest.fn(),
					getEscrowBalance: jest.fn(),
				},
			};
			return mockClient;
		}),
	},
}));

describe('createClientFromCredentials', () => {
	beforeEach(() => {
		clearClientCache();
		jest.clearAllMocks();
	});

	describe('mock mode', () => {
		it('should create mock client with default address', async () => {
			const { ACTPClient } = require('@agirails/sdk');
			const credentials = {
				environment: 'mock',
			};

			const client = await createClientFromCredentials(credentials);

			expect(client).toBeDefined();
			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'mock',
					requesterAddress: '0x1111111111111111111111111111111111111111',
				}),
			);
		});

		it('should create mock client with custom address', async () => {
			const { ACTPClient } = require('@agirails/sdk');
			const mockAddress = '0x' + '9'.repeat(40);
			const credentials = {
				environment: 'mock',
				mockAddress,
			};

			await createClientFromCredentials(credentials);

			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					requesterAddress: mockAddress,
				}),
			);
		});

		it('should use state directory if provided', async () => {
			const { ACTPClient } = require('@agirails/sdk');

			const credentials = {
				environment: 'mock',
				stateDirectory: '/tmp/actp-test',
			};

			await createClientFromCredentials(credentials);

			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					stateDirectory: '/tmp/actp-test',
				}),
			);
		});
	});

	describe('testnet mode', () => {
		const validPrivateKey = '0x' + 'a'.repeat(64);

		it('should create testnet client with private key', async () => {
			const { ACTPClient } = require('@agirails/sdk');
			const credentials = {
				environment: 'testnet',
				privateKey: validPrivateKey,
			};

			const client = await createClientFromCredentials(credentials);

			expect(client).toBeDefined();
			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'testnet',
					privateKey: validPrivateKey,
				}),
			);
		});

		it('should throw on missing private key', async () => {
			const credentials = {
				environment: 'testnet',
				privateKey: '',
			};

			await expect(createClientFromCredentials(credentials)).rejects.toThrow(
				'Private key is required',
			);
		});

		it('should throw on invalid private key format (no 0x)', async () => {
			const credentials = {
				environment: 'testnet',
				privateKey: 'a'.repeat(64),
			};

			await expect(createClientFromCredentials(credentials)).rejects.toThrow(
				'must start with 0x',
			);
		});

		it('should throw on invalid private key length', async () => {
			const credentials = {
				environment: 'testnet',
				privateKey: '0x' + 'a'.repeat(32),
			};

			await expect(createClientFromCredentials(credentials)).rejects.toThrow(
				'Invalid private key format',
			);
		});

		it('should use custom RPC URL if provided', async () => {
			const { ACTPClient } = require('@agirails/sdk');

			const credentials = {
				environment: 'testnet',
				privateKey: validPrivateKey,
				rpcUrl: 'https://custom-rpc.example.com',
			};

			await createClientFromCredentials(credentials);

			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					rpcUrl: 'https://custom-rpc.example.com',
				}),
			);
		});
	});

	describe('mainnet mode', () => {
		const validPrivateKey = '0x' + 'b'.repeat(64);

		it('should create mainnet client', async () => {
			const { ACTPClient } = require('@agirails/sdk');
			const credentials = {
				environment: 'mainnet',
				privateKey: validPrivateKey,
			};

			const client = await createClientFromCredentials(credentials);

			expect(client).toBeDefined();
			expect(ACTPClient.create).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'mainnet',
					privateKey: validPrivateKey,
				}),
			);
		});
	});

	describe('unknown environment', () => {
		it('should throw on unknown environment', async () => {
			const credentials = {
				environment: 'unknown',
			};

			await expect(createClientFromCredentials(credentials)).rejects.toThrow(
				'Unknown environment',
			);
		});
	});

	describe('client caching', () => {
		it('should cache and return same client for identical credentials', async () => {
			const credentials = {
				environment: 'mock',
				mockAddress: '0x' + '1'.repeat(40),
			};

			const client1 = await createClientFromCredentials(credentials);
			const client2 = await createClientFromCredentials(credentials);

			expect(client1).toBe(client2);
		});

		it('should create different clients for different addresses', async () => {
			const creds1 = {
				environment: 'mock',
				mockAddress: '0x' + '1'.repeat(40),
			};
			const creds2 = {
				environment: 'mock',
				mockAddress: '0x' + '2'.repeat(40),
			};

			const client1 = await createClientFromCredentials(creds1);
			const client2 = await createClientFromCredentials(creds2);

			expect(client1).not.toBe(client2);
		});

		it('should clear cache', async () => {
			const { ACTPClient } = require('@agirails/sdk');

			const credentials = {
				environment: 'mock',
			};

			await createClientFromCredentials(credentials);
			clearClientCache();
			await createClientFromCredentials(credentials);

			// Should have been called twice (once before cache, once after clear)
			expect(ACTPClient.create).toHaveBeenCalledTimes(2);
		});
	});
});

describe('sanitizeError', () => {
	it('should redact 64-char hex strings (private keys)', () => {
		const privateKey = '0x' + 'a'.repeat(64);
		const error = `Error with key: ${privateKey}`;

		const result = sanitizeError(error);

		expect(result).not.toContain(privateKey);
		expect(result).toContain('[REDACTED_KEY]');
	});

	it('should redact private keys without 0x prefix', () => {
		const rawKey = 'a'.repeat(64);
		const error = `Raw key: ${rawKey}`;

		const result = sanitizeError(error);

		expect(result).not.toContain(rawKey);
		expect(result).toContain('[REDACTED_KEY]');
	});

	it('should handle Error objects', () => {
		const privateKey = '0x' + 'b'.repeat(64);
		const error = new Error(`Failed with key: ${privateKey}`);

		const result = sanitizeError(error);

		expect(result).not.toContain(privateKey);
	});

	it('should not redact short hex strings (transaction IDs are OK)', () => {
		const txId = '0x' + 'c'.repeat(40); // 40 chars, not 64
		const error = `Transaction: ${txId}`;

		const result = sanitizeError(error);

		expect(result).toContain(txId);
	});

	it('should preserve non-sensitive error messages', () => {
		const error = 'Connection timeout after 30 seconds';

		const result = sanitizeError(error);

		expect(result).toBe(error);
	});

	// === SECURITY EDGE CASES ===

	describe('security edge cases', () => {
		it('should redact multiple private keys in one error', () => {
			const key1 = '0x' + 'a'.repeat(64);
			const key2 = '0x' + 'b'.repeat(64);
			const error = `Keys: ${key1} and ${key2}`;

			const result = sanitizeError(error);

			expect(result).not.toContain(key1);
			expect(result).not.toContain(key2);
			expect(result.match(/\[REDACTED_KEY\]/g)?.length).toBe(2);
		});

		it('should redact keys in stack traces', () => {
			const privateKey = '0x' + 'dead'.repeat(16);
			const stackTrace = `Error: Transaction failed
    at sendTransaction (/app/wallet.js:42:15)
    privateKey: ${privateKey}
    at processQueue (/app/queue.js:18:3)`;

			const result = sanitizeError(stackTrace);

			expect(result).not.toContain(privateKey);
			expect(result).toContain('[REDACTED_KEY]');
			expect(result).toContain('sendTransaction'); // Stack trace preserved
		});

		it('should redact keys in JSON stringified errors', () => {
			const privateKey = '0x' + 'cafe'.repeat(16);
			const jsonError = JSON.stringify({
				error: 'Failed',
				config: { privateKey },
			});

			const result = sanitizeError(jsonError);

			expect(result).not.toContain(privateKey);
		});

		it('should handle error with mixed case hex', () => {
			const mixedKey = '0x' + 'AaBbCcDd'.repeat(8);
			const error = `Key: ${mixedKey}`;

			const result = sanitizeError(error);

			expect(result).not.toContain(mixedKey);
		});

		it('should NOT redact 64-char non-hex strings', () => {
			const notAKey = 'g'.repeat(64); // 'g' is not hex
			const error = `Data: ${notAKey}`;

			const result = sanitizeError(error);

			expect(result).toContain(notAKey); // Should NOT be redacted
		});

		it('should redact keys embedded in URLs', () => {
			const privateKey = '0x' + '1234'.repeat(16);
			const error = `RPC error at https://api.example.com?key=${privateKey}`;

			const result = sanitizeError(error);

			expect(result).not.toContain(privateKey);
		});

		it('should handle null and undefined gracefully', () => {
			expect(sanitizeError(null as any)).toBe('Unknown error');
			expect(sanitizeError(undefined as any)).toBe('Unknown error');
		});

		it('should handle non-string, non-Error objects', () => {
			const result = sanitizeError({ code: 500, message: 'Server error' } as any);

			expect(result).toContain('Server error');
		});
	});
});
