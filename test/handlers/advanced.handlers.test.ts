/**
 * Advanced Mode Handler Tests
 *
 * Tests for full protocol control operations.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	handleCreateTransaction,
	handleLinkEscrow,
	handleTransitionState,
	handleReleaseEscrow,
	handleGetTransaction,
	handleGetEscrowBalance,
	handleCancelAdvanced,
} from '../../nodes/ACTP/handlers/advanced.handlers';

// Mock n8n context
const createMockContext = (params: Record<string, any> = {}): IExecuteFunctions => {
	return {
		getNodeParameter: jest.fn((name: string, _itemIndex: number, defaultValue?: any) => {
			return params[name] !== undefined ? params[name] : defaultValue;
		}),
		getNode: jest.fn(() => ({ name: 'ACTP' })),
		continueOnFail: jest.fn(() => false),
	} as unknown as IExecuteFunctions;
};

// Mock ACTP Client
const createMockClient = (overrides: Record<string, any> = {}) => {
	const defaultTxId = '0x' + 'a'.repeat(64);
	const defaultEscrowId = '0x' + 'b'.repeat(64);

	return {
		intermediate: {
			createTransaction: jest.fn().mockResolvedValue(defaultTxId),
			linkEscrow: jest.fn().mockResolvedValue(defaultEscrowId),
			transitionState: jest.fn().mockResolvedValue(undefined),
			releaseEscrow: jest.fn().mockResolvedValue(undefined),
			getTransaction: jest.fn().mockResolvedValue({
				state: 'COMMITTED',
				amount: '100000000',
				requester: '0x' + '1'.repeat(40),
				provider: '0x' + '2'.repeat(40),
				deadline: 1700000000,
				disputeWindow: 172800,
				createdAt: 1699990000,
				updatedAt: 1699995000,
				escrowId: defaultEscrowId,
			}),
			getEscrowBalance: jest.fn().mockResolvedValue('100.00 USDC'),
			...overrides.intermediate,
		},
		...overrides,
	};
};

describe('handleCreateTransaction', () => {
	it('should create transaction without funding', async () => {
		const context = createMockContext({
			provider: '0x' + '2'.repeat(40),
			amount: '100',
			deadline: 24,
			disputeWindow: '2d',
			serviceDescription: 'AI translation service',
		});
		const client = createMockClient();

		const result = await handleCreateTransaction(context, client as any, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json.success).toBe(true);
		expect(result[0].json.operation).toBe('createTransaction');
		expect(result[0].json.transactionId).toBe('0x' + 'a'.repeat(64));
		expect(result[0].json.state).toBe('COMMITTED'); // From mock getTransaction
		expect(result[0].json.message).toContain('Link Escrow');
	});

	it('should call createTransaction with correct params', async () => {
		const provider = '0x' + '2'.repeat(40);
		const context = createMockContext({
			provider,
			amount: '50',
			deadline: '+48h',
			disputeWindow: '1d',
			serviceDescription: 'Test service',
		});
		const client = createMockClient();

		await handleCreateTransaction(context, client as any, 0);

		expect(client.intermediate.createTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				provider,
				amount: '50',
				serviceDescription: 'Test service',
			}),
		);
	});

	it('should handle numeric amount', async () => {
		const context = createMockContext({
			provider: '0x' + '2'.repeat(40),
			amount: 100,
		});
		const client = createMockClient();

		const result = await handleCreateTransaction(context, client as any, 0);

		expect(result[0].json.amount).toBe('$100 USDC');
	});

	it('should throw on invalid provider address', async () => {
		const context = createMockContext({
			provider: 'invalid',
			amount: '100',
		});
		const client = createMockClient();

		await expect(handleCreateTransaction(context, client as any, 0)).rejects.toThrow(
			NodeOperationError,
		);
	});
});

describe('handleLinkEscrow', () => {
	it('should link escrow and return escrowId', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient();

		const result = await handleLinkEscrow(context, client as any, 0);

		expect(client.intermediate.linkEscrow).toHaveBeenCalledWith(txId);
		expect(result[0].json.success).toBe(true);
		expect(result[0].json.escrowId).toBe('0x' + 'b'.repeat(64));
		expect(result[0].json.state).toBe('COMMITTED');
	});
});

describe('handleTransitionState', () => {
	it('should transition state and show before/after', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
			newState: 'DELIVERED',
		});
		const client = createMockClient({
			intermediate: {
				getTransaction: jest
					.fn()
					.mockResolvedValueOnce({ state: 'COMMITTED' })
					.mockResolvedValueOnce({ state: 'DELIVERED' }),
				transitionState: jest.fn().mockResolvedValue(undefined),
			},
		});

		const result = await handleTransitionState(context, client as any, 0);

		expect(client.intermediate.transitionState).toHaveBeenCalledWith(txId, 'DELIVERED');
		expect(result[0].json.previousState).toBe('COMMITTED');
		expect(result[0].json.newState).toBe('DELIVERED');
		expect(result[0].json.message).toContain('COMMITTED');
		expect(result[0].json.message).toContain('DELIVERED');
	});

	it('should throw if transaction not found (hardened behavior)', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
			newState: 'DELIVERED',
		});
		const client = createMockClient({
			intermediate: {
				getTransaction: jest.fn().mockResolvedValue(null),
				transitionState: jest.fn().mockResolvedValue(undefined),
			},
		});

		await expect(handleTransitionState(context, client as any, 0)).rejects.toThrow(
			NodeOperationError,
		);
	});
});

describe('handleReleaseEscrow', () => {
	it('should release escrow without attestation', async () => {
		const escrowId = '0x' + 'b'.repeat(64);
		const context = createMockContext({
			escrowId,
			attestationUID: '',
		});
		const client = createMockClient();

		const result = await handleReleaseEscrow(context, client as any, 0);

		expect(client.intermediate.releaseEscrow).toHaveBeenCalledWith(escrowId, undefined);
		expect(result[0].json.state).toBe('SETTLED');
	});

	it('should release escrow with attestation', async () => {
		const escrowId = '0x' + 'b'.repeat(64);
		const attestationUID = '0x' + 'c'.repeat(64);
		const context = createMockContext({
			escrowId,
			attestationUID,
		});
		const client = createMockClient();

		const result = await handleReleaseEscrow(context, client as any, 0);

		expect(client.intermediate.releaseEscrow).toHaveBeenCalledWith(escrowId, {
			txId: escrowId,
			attestationUID,
		});
		expect(result[0].json.success).toBe(true);
	});
});

describe('handleGetTransaction', () => {
	it('should return formatted transaction', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient();

		const result = await handleGetTransaction(context, client as any, 0);

		expect(result[0].json.success).toBe(true);
		expect(result[0].json.transactionId).toBe(txId);
		expect(result[0].json.state).toBe('COMMITTED');
		expect(result[0].json.stateNumber).toBe(2);
		expect(result[0].json.amount).toContain('USDC');
	});

	it('should throw if transaction not found', async () => {
		const context = createMockContext({
			transactionId: '0x' + 'a'.repeat(64),
		});
		const client = createMockClient({
			intermediate: {
				getTransaction: jest.fn().mockResolvedValue(null),
			},
		});

		await expect(handleGetTransaction(context, client as any, 0)).rejects.toThrow('not found');
	});
});

describe('handleGetEscrowBalance', () => {
	it('should return balance', async () => {
		const escrowId = '0x' + 'b'.repeat(64);
		const context = createMockContext({
			escrowId,
		});
		const client = createMockClient();

		const result = await handleGetEscrowBalance(context, client as any, 0);

		expect(client.intermediate.getEscrowBalance).toHaveBeenCalledWith(escrowId);
		expect(result[0].json.escrowId).toBe(escrowId);
		expect(result[0].json.balance).toBe('100.00 USDC');
	});
});

describe('handleCancelAdvanced', () => {
	it('should cancel and show previous state', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient({
			intermediate: {
				getTransaction: jest.fn().mockResolvedValue({ state: 'COMMITTED' }),
				transitionState: jest.fn().mockResolvedValue(undefined),
			},
		});

		const result = await handleCancelAdvanced(context, client as any, 0);

		expect(client.intermediate.transitionState).toHaveBeenCalledWith(txId, 'CANCELLED');
		expect(result[0].json.previousState).toBe('COMMITTED');
		expect(result[0].json.newState).toBe('CANCELLED');
	});
});
