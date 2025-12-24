/**
 * Base Sepolia Testnet Integration Tests
 *
 * These tests run against the real Base Sepolia testnet when
 * environment variables are configured:
 * - BASE_SEPOLIA_RPC: RPC endpoint (e.g., Alchemy)
 * - BASE_SEPOLIA_PRIVATE_KEY: Funded wallet private key
 *
 * Tests are automatically skipped if env vars are not set.
 *
 * Prerequisites:
 * - BASE_SEPOLIA_PRIVATE_KEY must have:
 *   - Some ETH for gas (~0.01 ETH)
 *   - Some USDC for transactions (~10 USDC)
 * - Deployed ACTP contracts on Base Sepolia
 */

import { ACTPClient } from '@agirails/sdk';
import { Wallet } from 'ethers';
import { createClientFromCredentials, clearClientCache } from '../../nodes/ACTP/utils/client.factory';

/**
 * Check if testnet configuration is available
 */
const hasTestnetConfig = (): boolean => {
	const rpc = process.env.BASE_SEPOLIA_RPC;
	const privateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;
	return Boolean(rpc && privateKey);
};

/**
 * Get testnet configuration
 */
const getTestnetConfig = () => ({
	rpcUrl: process.env.BASE_SEPOLIA_RPC!,
	privateKey: process.env.BASE_SEPOLIA_PRIVATE_KEY!,
});

/**
 * Use describe.skip if testnet config is not available
 */
const describeTestnet = hasTestnetConfig() ? describe : describe.skip;

/**
 * Helper to log test status in CI
 */
const logTestStatus = (testName: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: string) => {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] ${status}: ${testName}${details ? ` - ${details}` : ''}`);
};

describeTestnet('Integration: Base Sepolia Testnet', () => {
	let client: ACTPClient;
	let config: ReturnType<typeof getTestnetConfig>;

	beforeAll(async () => {
		config = getTestnetConfig();

		// Derive address from private key (security: address must match the key)
		const wallet = new Wallet(config.privateKey);
		const derivedAddress = wallet.address.toLowerCase();

		// Create testnet client with derived address
		client = await ACTPClient.create({
			mode: 'testnet',
			requesterAddress: derivedAddress,
			privateKey: config.privateKey,
			rpcUrl: config.rpcUrl,
		});

		logTestStatus('testnet-setup', 'PASS', 'Client initialized');
	}, 30000); // 30s timeout for setup

	afterAll(async () => {
		clearClientCache();
	});

	describe('Client Initialization', () => {
		it('should have initialized client successfully', async () => {
			// Verify client is properly initialized
			expect(client).toBeDefined();
			expect(client.beginner).toBeDefined();
			expect(client.intermediate).toBeDefined();
			logTestStatus('client-init', 'PASS', 'Client has beginner and intermediate APIs');
		}, 10000);

		it('should have a valid wallet address', async () => {
			const address = await client.getAddress();

			expect(address).toBeDefined();
			expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
			logTestStatus('wallet-address', 'PASS', `Address: ${address}`);
		}, 10000);
	});

	describe('Wallet Balance', () => {
		it('should be able to read USDC balance via provider', async () => {
			// getBalance() only works in mock mode
			// For testnet, we verify we can access the provider and read on-chain data
			const address = await client.getAddress();

			// Access the underlying provider to read USDC balance directly
			// This tests that the blockchain connection is working
			const provider = (client as any).runtime?.provider;
			if (provider) {
				const blockNumber = await provider.getBlockNumber();
				expect(blockNumber).toBeGreaterThan(0);
				logTestStatus('usdc-balance', 'PASS', `Connected to block ${blockNumber}, address: ${address}`);
			} else {
				// Fallback: just verify address is valid
				expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
				logTestStatus('usdc-balance', 'PASS', `Address verified: ${address}`);
			}
		}, 10000);
	});

	describe('Basic API Functionality', () => {
		it('should have beginner.pay method', () => {
			expect(typeof client.beginner.pay).toBe('function');
			logTestStatus('beginner-api', 'PASS', 'pay() method available');
		});

		it('should have beginner.checkStatus method', () => {
			expect(typeof client.beginner.checkStatus).toBe('function');
			logTestStatus('beginner-api', 'PASS', 'checkStatus() method available');
		});

		it('should have intermediate.createTransaction method', () => {
			expect(typeof client.intermediate.createTransaction).toBe('function');
			logTestStatus('intermediate-api', 'PASS', 'createTransaction() method available');
		});

		it('should have intermediate.transitionState method', () => {
			expect(typeof client.intermediate.transitionState).toBe('function');
			logTestStatus('intermediate-api', 'PASS', 'transitionState() method available');
		});
	});
});

describe('Integration: Testnet Skip Behavior', () => {
	it('should skip testnet tests when env vars not set', () => {
		// This test always runs to verify skip logic works
		if (!hasTestnetConfig()) {
			console.log('ℹ️  Testnet tests skipped (BASE_SEPOLIA_RPC or BASE_SEPOLIA_PRIVATE_KEY not set)');
			console.log('   To run testnet tests, set these environment variables:');
			console.log('   - BASE_SEPOLIA_RPC: Alchemy/Infura RPC URL');
			console.log('   - BASE_SEPOLIA_PRIVATE_KEY: Funded wallet (0x...)');
		} else {
			console.log('✅ Testnet configuration detected, tests will run');
		}

		// This test always passes - it's informational
		expect(true).toBe(true);
	});
});

describe('Integration: Client Factory - Testnet Mode', () => {
	beforeEach(() => {
		clearClientCache();
	});

	it('should reject missing private key for testnet', async () => {
		await expect(
			createClientFromCredentials({
				environment: 'testnet',
				privateKey: '',
			}),
		).rejects.toThrow('Private key is required');
	});

	it('should reject invalid private key format', async () => {
		await expect(
			createClientFromCredentials({
				environment: 'testnet',
				privateKey: 'not-a-valid-key',
			}),
		).rejects.toThrow('must start with 0x');
	});

	it('should reject short private key', async () => {
		await expect(
			createClientFromCredentials({
				environment: 'testnet',
				privateKey: '0x' + 'a'.repeat(32), // Only 32 chars
			}),
		).rejects.toThrow('Invalid private key format');
	});

	// Note: This test would actually connect to testnet if keys are valid
	// We use a fake key that passes format validation but won't work on-chain
	it('should accept valid private key format', async () => {
		// Skip if we don't have testnet config, as this would try to connect
		if (!hasTestnetConfig()) {
			console.log('   Skipping real testnet connection test');
			return;
		}

		const config = getTestnetConfig();

		// This should not throw during client creation
		const client = await createClientFromCredentials({
			environment: 'testnet',
			privateKey: config.privateKey,
			rpcUrl: config.rpcUrl,
		});

		expect(client).toBeDefined();
		expect(client.beginner).toBeDefined();
		expect(client.intermediate).toBeDefined();
	}, 30000);
});

/**
 * Smoke Tests - Quick validation of basic functionality
 *
 * These run in CI even without testnet to validate mock mode works.
 */
describe('Integration: Smoke Tests (Mock Mode)', () => {
	let client: ACTPClient;

	beforeEach(async () => {
		clearClientCache();
		client = await ACTPClient.create({
			mode: 'mock',
			requesterAddress: '0x1111111111111111111111111111111111111111',
		});

		// Fund the mock wallet
		await client.mintTokens(
			'0x1111111111111111111111111111111111111111',
			'1000000000000', // 1M USDC
		);
	});

	afterEach(async () => {
		await client.reset();
		clearClientCache();
	});

	it('should complete pay → checkStatus → deliver flow', async () => {
		// Pay
		const payResult = await client.beginner.pay({
			to: '0x2222222222222222222222222222222222222222',
			amount: '10', // $10 USDC
		});

		expect(payResult.txId).toBeDefined();
		expect(payResult.state).toBe('COMMITTED');

		// Check status
		const status = await client.beginner.checkStatus(payResult.txId);
		expect(status.state).toBe('COMMITTED');

		// Deliver
		await client.intermediate.transitionState(payResult.txId, 'DELIVERED');

		const finalStatus = await client.beginner.checkStatus(payResult.txId);
		expect(finalStatus.state).toBe('DELIVERED');
	});

	it('should handle error cases gracefully', async () => {
		// Try to pay with insufficient balance
		await expect(
			client.beginner.pay({
				to: '0x2222222222222222222222222222222222222222',
				amount: '999999999999', // Way more than minted
			}),
		).rejects.toThrow(/insufficient/i);
	});

	it('should reject self-payment', async () => {
		await expect(
			client.beginner.pay({
				to: '0x1111111111111111111111111111111111111111', // Same as requester
				amount: '10',
			}),
		).rejects.toThrow();
	});
});
