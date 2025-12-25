/**
 * Simple Mode Handler Tests
 *
 * Tests for user-friendly operations.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	handleSendPayment,
	handleCheckStatus,
	handleStartWork,
	handleMarkDelivered,
	handleReleasePayment,
	handleRaiseDispute,
	handleCancelSimple,
} from '../../nodes/ACTP/handlers/simple.handlers';

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
	return {
		basic: {
			pay: jest.fn().mockResolvedValue({
				txId: '0x' + 'a'.repeat(64),
				provider: '0x' + '2'.repeat(40),
				requester: '0x' + '1'.repeat(40),
				amount: '$100.00 USDC',
				deadline: '2024-12-31T23:59:59.000Z',
				state: 'COMMITTED',
			}),
			checkStatus: jest.fn().mockResolvedValue({
				state: 'COMMITTED',
				canAccept: false,
				canComplete: true,
				canDispute: false,
			}),
			...overrides.basic,
		},
		standard: {
			transitionState: jest.fn().mockResolvedValue(undefined),
			getTransaction: jest.fn().mockResolvedValue({
				state: 'IN_PROGRESS',
				amount: '100000000',
				requester: '0x' + '1'.repeat(40),
				provider: '0x' + '2'.repeat(40),
				deadline: 1700000000,
			}),
			releaseEscrow: jest.fn().mockResolvedValue(undefined),
			...overrides.standard,
		},
		...overrides,
	};
};

describe('handleSendPayment', () => {
	it('should create payment successfully', async () => {
		const context = createMockContext({
			to: '0x' + '2'.repeat(40),
			amount: '100',
			deadline: 24,
			disputeWindow: '2d',
		});
		const client = createMockClient();

		const result = await handleSendPayment(context, client as any, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json.success).toBe(true);
		expect(result[0].json.operation).toBe('sendPayment');
		expect(result[0].json.transactionId).toBeDefined();
		expect(result[0].json.amount).toBe('$100.00 USDC');
	});

	it('should call basic.pay with correct params', async () => {
		const context = createMockContext({
			to: '0x' + '2'.repeat(40),
			amount: '50.25',
			deadline: '+48h',
			disputeWindow: '1d',
		});
		const client = createMockClient();

		await handleSendPayment(context, client as any, 0);

		expect(client.basic.pay).toHaveBeenCalledWith(
			expect.objectContaining({
				to: '0x' + '2'.repeat(40),
				amount: '50.25',
			}),
		);
	});

	it('should throw on invalid address', async () => {
		const context = createMockContext({
			to: 'invalid',
			amount: '100',
		});
		const client = createMockClient();

		await expect(handleSendPayment(context, client as any, 0)).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should throw on SDK error', async () => {
		const context = createMockContext({
			to: '0x' + '2'.repeat(40),
			amount: '100',
		});
		const client = createMockClient({
			basic: {
				pay: jest.fn().mockRejectedValue(new Error('Insufficient balance')),
			},
		});

		await expect(handleSendPayment(context, client as any, 0)).rejects.toThrow(
			'Insufficient balance',
		);
	});
});

describe('handleCheckStatus', () => {
	it('should return status with action hints', async () => {
		const context = createMockContext({
			transactionId: '0x' + 'a'.repeat(64),
		});
		const client = createMockClient();

		const result = await handleCheckStatus(context, client as any, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json.success).toBe(true);
		expect(result[0].json.status).toBe('COMMITTED');
		expect(result[0].json.canComplete).toBe(true);
	});

	it('should throw on invalid transaction ID', async () => {
		const context = createMockContext({
			transactionId: 'invalid',
		});
		const client = createMockClient();

		await expect(handleCheckStatus(context, client as any, 0)).rejects.toThrow(
			NodeOperationError,
		);
	});
});

describe('handleStartWork', () => {
	it('should transition to IN_PROGRESS', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient();

		const result = await handleStartWork(context, client as any, 0);

		expect(client.standard.transitionState).toHaveBeenCalledWith(txId, 'IN_PROGRESS');
		expect(result[0].json.success).toBe(true);
		expect(result[0].json.state).toBe('IN_PROGRESS');
	});
});

describe('handleMarkDelivered', () => {
	it('should transition to DELIVERED', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient({
			standard: {
				transitionState: jest.fn().mockResolvedValue(undefined),
				getTransaction: jest.fn().mockResolvedValue({ state: 'DELIVERED' }),
			},
		});

		const result = await handleMarkDelivered(context, client as any, 0);

		expect(client.standard.transitionState).toHaveBeenCalledWith(txId, 'DELIVERED');
		expect(result[0].json.state).toBe('DELIVERED');
	});
});

describe('handleReleasePayment', () => {
	it('should release escrow', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient({
			standard: {
				getTransaction: jest.fn().mockResolvedValue({
					state: 'DELIVERED',
					escrowId: txId,
				}),
				releaseEscrow: jest.fn().mockResolvedValue(undefined),
			},
		});

		const result = await handleReleasePayment(context, client as any, 0);

		expect(client.standard.releaseEscrow).toHaveBeenCalledWith(txId);
		expect(result[0].json.state).toBe('SETTLED');
	});

	it('should throw if transaction not found', async () => {
		const context = createMockContext({
			transactionId: '0x' + 'a'.repeat(64),
		});
		const client = createMockClient({
			standard: {
				getTransaction: jest.fn().mockResolvedValue(null),
			},
		});

		await expect(handleReleasePayment(context, client as any, 0)).rejects.toThrow('not found');
	});
});

describe('handleRaiseDispute', () => {
	it('should transition to DISPUTED', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
			reason: 'Work not delivered as expected',
		});
		const client = createMockClient();

		const result = await handleRaiseDispute(context, client as any, 0);

		expect(client.standard.transitionState).toHaveBeenCalledWith(txId, 'DISPUTED');
		expect(result[0].json.state).toBe('DISPUTED');
		expect(result[0].json.reason).toBe('Work not delivered as expected');
	});

	it('should handle empty reason', async () => {
		const context = createMockContext({
			transactionId: '0x' + 'a'.repeat(64),
			reason: '',
		});
		const client = createMockClient();

		const result = await handleRaiseDispute(context, client as any, 0);

		expect(result[0].json.reason).toBe('No reason provided');
	});
});

describe('handleCancelSimple', () => {
	it('should transition to CANCELLED', async () => {
		const txId = '0x' + 'a'.repeat(64);
		const context = createMockContext({
			transactionId: txId,
		});
		const client = createMockClient();

		const result = await handleCancelSimple(context, client as any, 0);

		expect(client.standard.transitionState).toHaveBeenCalledWith(txId, 'CANCELLED');
		expect(result[0].json.state).toBe('CANCELLED');
	});
});
