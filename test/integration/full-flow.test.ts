/**
 * Integration Tests - Full Transaction Flow
 *
 * Tests the complete ACTP transaction lifecycle using the real SDK in mock mode.
 * These tests verify end-to-end functionality with the real SDK (not mocked).
 *
 * Uses SDK's mintTokens() to fund test wallets before each test.
 */

import { ACTPClient, IMockRuntime } from '@agirails/sdk';
import {
	createClientFromCredentials,
	clearClientCache,
} from '../../nodes/ACTP/utils/client.factory';

// Helper to access mock runtime time controls
const advanceTime = async (client: ACTPClient, seconds: number): Promise<void> => {
	const runtime = client.advanced as IMockRuntime;
	await runtime.time.advanceTime(seconds);
};

// Test addresses
const REQUESTER = '0x1111111111111111111111111111111111111111';
const PROVIDER = '0x2222222222222222222222222222222222222222';

// Amount to mint for tests (in wei: 1,000,000 USDC = 1e12 wei since USDC has 6 decimals)
const INITIAL_BALANCE = '1000000000000'; // 1M USDC in wei

describe('Integration: Full Transaction Flow', () => {
	let client: ACTPClient;

	beforeEach(async () => {
		// Create fresh client for each test
		clearClientCache();
		client = await ACTPClient.create({
			mode: 'mock',
			requesterAddress: REQUESTER,
		});

		// Fund requester wallet
		await client.mintTokens(REQUESTER, INITIAL_BALANCE);
	});

	afterEach(async () => {
		// Reset state between tests
		await client.reset();
		clearClientCache();
	});

	describe('Happy Path: Create → Fund → Deliver → Settle', () => {
		it('should complete a full transaction lifecycle', async () => {
			// Step 1: Create transaction (INITIATED)
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100', // 100 USDC (SDK converts to wei internally)
				deadline: Math.floor(Date.now() / 1000) + 86400, // +24h
				disputeWindow: 3600, // 1 hour
			});

			expect(txId).toBeDefined();
			expect(txId).toMatch(/^0x[a-fA-F0-9]{64}$/);

			// Verify INITIATED state
			let tx = await client.intermediate.getTransaction(txId);
			expect(tx).toBeDefined();
			expect(tx?.state).toBe('INITIATED');

			// Step 2: Link escrow (auto-transition to COMMITTED)
			const escrowId = await client.intermediate.linkEscrow(txId);
			expect(escrowId).toBeDefined();

			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('COMMITTED');

			// Step 3: Provider starts work (COMMITTED → IN_PROGRESS)
			await client.intermediate.transitionState(txId, 'IN_PROGRESS');
			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('IN_PROGRESS');

			// Step 4: Provider delivers (IN_PROGRESS → DELIVERED)
			await client.intermediate.transitionState(txId, 'DELIVERED');
			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DELIVERED');

			// Step 5: Wait for dispute window to expire
			await advanceTime(client, 3601); // Advance past 1 hour dispute window

			// Step 6: Release escrow (DELIVERED → SETTLED)
			await client.intermediate.releaseEscrow(escrowId);
			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('SETTLED');
		});

		it('should skip IN_PROGRESS and go directly to DELIVERED', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '50', // 50 USDC
				deadline: Math.floor(Date.now() / 1000) + 86400,
			});

			await client.intermediate.linkEscrow(txId);

			// Skip IN_PROGRESS, go directly to DELIVERED
			await client.intermediate.transitionState(txId, 'DELIVERED');

			const tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DELIVERED');
		});
	});

	describe('Beginner API: Pay and Check', () => {
		it('should create funded transaction with pay()', async () => {
			const result = await client.beginner.pay({
				to: PROVIDER,
				amount: '50',
				deadline: '+12h',
			});

			expect(result.txId).toBeDefined();
			expect(result.provider).toBe(PROVIDER);
			expect(result.amount).toContain('50');
			expect(result.state).toBe('COMMITTED');

			// Check status
			const status = await client.beginner.checkStatus(result.txId);
			expect(status.state).toBe('COMMITTED');
		});

		it('should complete work using intermediate API after pay()', async () => {
			// Pay with beginner API
			const payResult = await client.beginner.pay({
				to: PROVIDER,
				amount: '25',
			});

			// Complete using intermediate API (transitions to DELIVERED)
			await client.intermediate.transitionState(payResult.txId, 'DELIVERED');

			const status = await client.beginner.checkStatus(payResult.txId);
			expect(status.state).toBe('DELIVERED');
		});
	});

	describe('Cancellation Flow', () => {
		it('should cancel transaction before delivery', async () => {
			// Create and fund
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '75',
			});
			await client.intermediate.linkEscrow(txId);

			let tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('COMMITTED');

			// Cancel
			await client.intermediate.transitionState(txId, 'CANCELLED');

			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('CANCELLED');
		});

		it('should cancel from INITIATED state (before escrow)', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});

			// Cancel before linking escrow
			await client.intermediate.transitionState(txId, 'CANCELLED');

			const tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('CANCELLED');
		});
	});

	describe('Dispute Flow', () => {
		it('should raise dispute after delivery', async () => {
			// Create, fund, and deliver
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '200',
			});
			await client.intermediate.linkEscrow(txId);
			await client.intermediate.transitionState(txId, 'DELIVERED');

			let tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DELIVERED');

			// Raise dispute
			await client.intermediate.transitionState(txId, 'DISPUTED');

			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DISPUTED');
		});
	});

	describe('Edge Cases', () => {
		it('should handle minimum amount ($0.05)', async () => {
			const result = await client.beginner.pay({
				to: PROVIDER,
				amount: '0.05',
			});

			expect(result.txId).toBeDefined();
			expect(result.amount).toContain('0.05');
		});

		it('should handle large amounts', async () => {
			// Mint extra for large transaction
			await client.mintTokens(REQUESTER, '1000000000000000'); // 1B USDC

			const result = await client.beginner.pay({
				to: PROVIDER,
				amount: '1000000',
			});

			expect(result.txId).toBeDefined();
		});

		it('should fail on self-payment', async () => {
			await expect(
				client.beginner.pay({
					to: REQUESTER, // Same as requester
					amount: '100',
				}),
			).rejects.toThrow();
		});

		it('should fail on insufficient balance', async () => {
			// Try to pay more than minted balance
			await expect(
				client.beginner.pay({
					to: PROVIDER,
					amount: '999999999', // Way more than 10,000 USDC
				}),
			).rejects.toThrow(/insufficient/i);
		});
	});
});

describe('Integration: State Machine Validation', () => {
	let client: ACTPClient;

	beforeEach(async () => {
		clearClientCache();
		client = await ACTPClient.create({
			mode: 'mock',
			requesterAddress: REQUESTER,
		});
		await client.mintTokens(REQUESTER, INITIAL_BALANCE);
	});

	afterEach(async () => {
		await client.reset();
		clearClientCache();
	});

	describe('Valid State Transitions', () => {
		it('INITIATED → COMMITTED (via linkEscrow)', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});

			let tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('INITIATED');

			await client.intermediate.linkEscrow(txId);

			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('COMMITTED');
		});

		it('COMMITTED → IN_PROGRESS → DELIVERED', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});
			await client.intermediate.linkEscrow(txId);

			await client.intermediate.transitionState(txId, 'IN_PROGRESS');
			let tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('IN_PROGRESS');

			await client.intermediate.transitionState(txId, 'DELIVERED');
			tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DELIVERED');
		});

		it('DELIVERED → DISPUTED', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});
			await client.intermediate.linkEscrow(txId);
			await client.intermediate.transitionState(txId, 'DELIVERED');

			await client.intermediate.transitionState(txId, 'DISPUTED');

			const tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('DISPUTED');
		});
	});

	describe('Invalid State Transitions', () => {
		it('should reject INITIATED → DELIVERED (must go through COMMITTED)', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});

			await expect(
				client.intermediate.transitionState(txId, 'DELIVERED'),
			).rejects.toThrow(/invalid.*state/i);
		});

		it('should reject COMMITTED → SETTLED (must go through DELIVERED)', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});
			await client.intermediate.linkEscrow(txId);

			await expect(
				client.intermediate.transitionState(txId, 'SETTLED'),
			).rejects.toThrow(/invalid.*state/i);
		});
	});

	describe('Terminal States', () => {
		it('SETTLED should be terminal', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
				disputeWindow: 3600, // Minimum allowed dispute window (1 hour)
			});
			const escrowId = await client.intermediate.linkEscrow(txId);
			await client.intermediate.transitionState(txId, 'DELIVERED');

			// Wait for dispute window to expire
			await advanceTime(client, 3601);
			await client.intermediate.releaseEscrow(escrowId);

			const tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('SETTLED');

			// Attempting further transitions should fail
			await expect(
				client.intermediate.transitionState(txId, 'DELIVERED'),
			).rejects.toThrow();
		});

		it('CANCELLED should be terminal', async () => {
			const txId = await client.intermediate.createTransaction({
				provider: PROVIDER,
				amount: '100',
			});
			await client.intermediate.linkEscrow(txId);
			await client.intermediate.transitionState(txId, 'CANCELLED');

			const tx = await client.intermediate.getTransaction(txId);
			expect(tx?.state).toBe('CANCELLED');

			// Attempting further transitions should fail
			await expect(
				client.intermediate.transitionState(txId, 'DELIVERED'),
			).rejects.toThrow();
		});
	});
});

describe('Integration: Client Factory', () => {
	beforeEach(() => {
		clearClientCache();
	});

	it('should create mock client successfully', async () => {
		const client = await createClientFromCredentials({
			environment: 'mock',
			mockAddress: '0x' + '5'.repeat(40),
		});

		expect(client).toBeDefined();
		expect(client.beginner).toBeDefined();
		expect(client.intermediate).toBeDefined();
	});

	it('should cache clients', async () => {
		const client1 = await createClientFromCredentials({
			environment: 'mock',
			mockAddress: '0x' + '6'.repeat(40),
		});

		const client2 = await createClientFromCredentials({
			environment: 'mock',
			mockAddress: '0x' + '6'.repeat(40),
		});

		// Should be the same cached instance
		expect(client1).toBe(client2);
	});
});
