/**
 * Formatter Unit Tests
 *
 * Comprehensive tests for output formatting utilities.
 * Tests cover edge cases, boundary conditions, and all ACTP states.
 */

import {
	formatAmount,
	formatTimestamp,
	formatState,
	formatTransactionSimple,
	formatTransactionAdvanced,
	formatStatusCheck,
	formatDuration,
	formatSuccess,
	formatError,
} from '../../nodes/ACTP/utils/formatters';
import {
	TEST_ADDRESSES,
	TEST_AMOUNTS,
	TEST_TIMESTAMPS,
	TEST_STATES,
	TEST_TRANSACTION_IDS,
	TransactionBuilder,
} from '../fixtures';

describe('formatAmount', () => {
	it('should format bigint to USDC string', () => {
		expect(formatAmount(100000000n)).toBe('$100.0 USDC');
	});

	it('should format string amount', () => {
		expect(formatAmount('100000000')).toBe('$100.0 USDC');
	});

	it('should format decimal amounts', () => {
		expect(formatAmount(100500000n)).toBe('$100.5 USDC');
	});

	it('should format small amounts', () => {
		expect(formatAmount(50000n)).toBe('$0.05 USDC');
	});

	it('should format large amounts', () => {
		expect(formatAmount(1000000000000n)).toBe('$1000000.0 USDC');
	});

	it('should format zero', () => {
		expect(formatAmount(0n)).toBe('$0.0 USDC');
	});
});

describe('formatTimestamp', () => {
	it('should format Unix timestamp to ISO string', () => {
		const timestamp = 1700000000;
		const result = formatTimestamp(timestamp);
		expect(result).toBe('2023-11-14T22:13:20.000Z');
	});

	it('should return "Not set" for zero', () => {
		expect(formatTimestamp(0)).toBe('Not set');
	});

	it('should return "Not set" for undefined-like values', () => {
		expect(formatTimestamp(undefined as any)).toBe('Not set');
	});
});

describe('formatState', () => {
	it('should format INITIATED state', () => {
		const result = formatState(0);
		expect(result).toEqual({
			state: 'INITIATED',
			stateNumber: 0,
			description: 'Transaction created, awaiting escrow',
		});
	});

	it('should format COMMITTED state', () => {
		const result = formatState(2);
		expect(result).toEqual({
			state: 'COMMITTED',
			stateNumber: 2,
			description: 'Funds locked in escrow, work can begin',
		});
	});

	it('should format DELIVERED state', () => {
		const result = formatState(4);
		expect(result).toEqual({
			state: 'DELIVERED',
			stateNumber: 4,
			description: 'Work delivered, awaiting confirmation',
		});
	});

	it('should format SETTLED state', () => {
		const result = formatState(5);
		expect(result).toEqual({
			state: 'SETTLED',
			stateNumber: 5,
			description: 'Payment released to provider (complete)',
		});
	});

	it('should format DISPUTED state', () => {
		const result = formatState(6);
		expect(result).toEqual({
			state: 'DISPUTED',
			stateNumber: 6,
			description: 'Dispute raised, awaiting resolution',
		});
	});

	it('should format CANCELLED state', () => {
		const result = formatState(7);
		expect(result).toEqual({
			state: 'CANCELLED',
			stateNumber: 7,
			description: 'Transaction cancelled',
		});
	});

	it('should handle unknown state', () => {
		const result = formatState(99);
		expect(result).toEqual({
			state: 'UNKNOWN',
			stateNumber: 99,
			description: 'Unknown state',
		});
	});
});

describe('formatTransactionSimple', () => {
	it('should format transaction with all fields', () => {
		const tx = {
			transactionId: '0x' + 'a'.repeat(64),
			state: 2,
			amount: 100000000n,
			requester: '0x' + '1'.repeat(40),
			provider: '0x' + '2'.repeat(40),
			deadline: 1700000000,
			createdAt: 1699990000,
			updatedAt: 1699995000,
		};

		const result = formatTransactionSimple(tx);

		expect(result.transactionId).toBe(tx.transactionId);
		expect(result.status).toBe('COMMITTED');
		expect(result.statusDescription).toBe('Funds locked in escrow, work can begin');
		expect(result.amount).toBe('$100.0 USDC');
		expect(result.amountRaw).toBe('100000000');
		expect(result.requester).toBe(tx.requester);
		expect(result.provider).toBe(tx.provider);
		expect(result.deadline).toBe('2023-11-14T22:13:20.000Z');
		expect(result.deadlineRaw).toBe(1700000000);
		expect(result.createdAt).toBeDefined();
		expect(result.updatedAt).toBeDefined();
	});

	it('should handle missing optional fields', () => {
		const tx = {
			transactionId: '0x' + 'a'.repeat(64),
			state: 0,
			amount: 50000000n,
			requester: '0x' + '1'.repeat(40),
			provider: '0x' + '2'.repeat(40),
			deadline: 1700000000,
		};

		const result = formatTransactionSimple(tx);

		expect(result.createdAt).toBeUndefined();
		expect(result.updatedAt).toBeUndefined();
	});
});

describe('formatTransactionAdvanced', () => {
	it('should include all advanced fields', () => {
		const tx = {
			transactionId: '0x' + 'a'.repeat(64),
			state: 4,
			amount: 100000000n,
			requester: '0x' + '1'.repeat(40),
			provider: '0x' + '2'.repeat(40),
			deadline: 1700000000,
			disputeWindow: 172800,
			createdAt: 1699990000,
			updatedAt: 1699995000,
			escrowId: '0x' + 'b'.repeat(64),
			contentHash: '0x' + 'c'.repeat(64),
		};

		const result = formatTransactionAdvanced(tx);

		expect(result.transactionId).toBe(tx.transactionId);
		expect(result.escrowId).toBe(tx.escrowId);
		expect(result.state).toBe('DELIVERED');
		expect(result.stateNumber).toBe(4);
		expect(result.stateDescription).toBe('Work delivered, awaiting confirmation');
		expect(result.amount).toBe('$100.0 USDC');
		expect(result.amountWei).toBe('100000000');
		expect(result.deadline).toBe('2023-11-14T22:13:20.000Z');
		expect(result.deadlineTimestamp).toBe(1700000000);
		expect(result.disputeWindow).toBe(172800);
		expect(result.contentHash).toBe(tx.contentHash);
	});
});

describe('formatStatusCheck', () => {
	it('should format status with available actions', () => {
		const status = {
			state: 2,
			canAccept: false,
			canComplete: true,
			canDispute: false,
			canFinalize: false,
		};

		const result = formatStatusCheck(status);

		expect(result.status).toBe('COMMITTED');
		expect(result.availableActions).toContain('Mark as delivered');
		expect(result.availableActions).not.toContain('Accept transaction');
		expect(result.canComplete).toBe(true);
	});

	it('should include multiple actions when available', () => {
		const status = {
			state: 4,
			canAccept: false,
			canComplete: false,
			canDispute: true,
			canFinalize: true,
		};

		const result = formatStatusCheck(status);

		expect(result.availableActions).toContain('Raise dispute');
		expect(result.availableActions).toContain('Release payment');
	});

	it('should format time remaining', () => {
		const status = {
			state: 4,
			timeRemaining: 3700, // 1h 1m 40s
		};

		const result = formatStatusCheck(status);

		expect(result.timeRemaining).toBe('1h 1m');
		expect(result.timeRemainingSeconds).toBe(3700);
	});
});

describe('formatDuration', () => {
	it('should format days', () => {
		expect(formatDuration(86400)).toBe('1d');
		expect(formatDuration(172800)).toBe('2d');
	});

	it('should format hours', () => {
		expect(formatDuration(3600)).toBe('1h');
		expect(formatDuration(7200)).toBe('2h');
	});

	it('should format minutes', () => {
		expect(formatDuration(60)).toBe('1m');
		expect(formatDuration(120)).toBe('2m');
	});

	it('should format combined durations', () => {
		expect(formatDuration(90061)).toBe('1d 1h 1m'); // 1 day, 1 hour, 1 minute
	});

	it('should handle very short durations', () => {
		expect(formatDuration(30)).toBe('Less than 1 minute');
	});

	it('should handle expired (zero or negative)', () => {
		expect(formatDuration(0)).toBe('Expired');
		expect(formatDuration(-100)).toBe('Expired');
	});
});

describe('formatSuccess', () => {
	it('should wrap data with success flag', () => {
		const data = { transactionId: '0x123', state: 'COMMITTED' };
		const result = formatSuccess('createTransaction', data as any);

		expect(result.success).toBe(true);
		expect(result.operation).toBe('createTransaction');
		expect(result.transactionId).toBe('0x123');
		expect(result.state).toBe('COMMITTED');
	});
});

describe('formatError', () => {
	it('should format Error object', () => {
		const error = new Error('Something went wrong');
		const result = formatError('sendPayment', error);

		expect(result.success).toBe(false);
		expect(result.operation).toBe('sendPayment');
		expect(result.error).toBe('Something went wrong');
	});

	it('should format string error', () => {
		const result = formatError('sendPayment', 'Connection failed');

		expect(result.success).toBe(false);
		expect(result.error).toBe('Connection failed');
	});
});

// ============================================================================
// EDGE CASE TESTS - Added for comprehensive coverage
// ============================================================================

describe('formatAmount - Edge Cases', () => {
	describe('extreme values', () => {
		it('should format 1 wei (smallest unit)', () => {
			expect(formatAmount(1n)).toBe('$0.000001 USDC');
		});

		it('should format 2 wei', () => {
			expect(formatAmount(2n)).toBe('$0.000002 USDC');
		});

		it('should format full 6-decimal precision', () => {
			expect(formatAmount(123456789n)).toBe('$123.456789 USDC');
		});

		it('should format very large amounts (billion USDC)', () => {
			const billionUsdc = 1000000000000000n; // 1 billion * 10^6
			expect(formatAmount(billionUsdc)).toBe('$1000000000.0 USDC');
		});

		it('should format amounts near MAX_SAFE_INTEGER', () => {
			const nearMax = BigInt(Number.MAX_SAFE_INTEGER);
			const result = formatAmount(nearMax);
			expect(result).toContain('USDC');
			expect(result.startsWith('$')).toBe(true);
		});

		it('should format string representations of large numbers', () => {
			expect(formatAmount('999999999999')).toContain('USDC');
		});
	});

	describe('precision handling', () => {
		it('should handle trailing zeros correctly', () => {
			expect(formatAmount(100000000n)).toBe('$100.0 USDC');
			expect(formatAmount(100100000n)).toBe('$100.1 USDC');
		});

		it('should preserve all significant decimal places', () => {
			expect(formatAmount(100000001n)).toBe('$100.000001 USDC');
		});
	});
});

describe('formatTimestamp - Edge Cases', () => {
	describe('boundary conditions', () => {
		it('should handle epoch (timestamp 1)', () => {
			// Timestamp 1 is valid (1 second after epoch)
			const result = formatTimestamp(1);
			expect(result).toBe('1970-01-01T00:00:01.000Z');
		});

		it('should handle far future timestamp (year 2100)', () => {
			const year2100 = 4102444800; // 2100-01-01
			const result = formatTimestamp(year2100);
			expect(result).toBe('2100-01-01T00:00:00.000Z');
		});

		it('should handle maximum reasonable timestamp', () => {
			// Year 3000: 32503680000
			const year3000 = 32503680000;
			const result = formatTimestamp(year3000);
			expect(result).toContain('3000');
		});
	});

	describe('null/undefined handling', () => {
		it('should return "Not set" for null', () => {
			expect(formatTimestamp(null as any)).toBe('Not set');
		});

		it('should return "Not set" for NaN', () => {
			expect(formatTimestamp(NaN)).toBe('Not set');
		});
	});

	describe('test fixtures integration', () => {
		it('should format TEST_TIMESTAMPS.FIXED correctly', () => {
			const result = formatTimestamp(TEST_TIMESTAMPS.FIXED);
			expect(result).toBe('2023-11-14T22:13:20.000Z');
		});
	});
});

describe('formatState - All 8 ACTP States', () => {
	describe('complete state coverage', () => {
		it('should format INITIATED (0)', () => {
			const result = formatState(TEST_STATES.INITIATED);
			expect(result.state).toBe('INITIATED');
			expect(result.stateNumber).toBe(0);
		});

		it('should format QUOTED (1)', () => {
			const result = formatState(TEST_STATES.QUOTED);
			expect(result.state).toBe('QUOTED');
			expect(result.stateNumber).toBe(1);
			expect(result.description).toBe('Provider submitted price quote');
		});

		it('should format COMMITTED (2)', () => {
			const result = formatState(TEST_STATES.COMMITTED);
			expect(result.state).toBe('COMMITTED');
			expect(result.stateNumber).toBe(2);
		});

		it('should format IN_PROGRESS (3)', () => {
			const result = formatState(TEST_STATES.IN_PROGRESS);
			expect(result.state).toBe('IN_PROGRESS');
			expect(result.stateNumber).toBe(3);
			expect(result.description).toBe('Provider is working on the service');
		});

		it('should format DELIVERED (4)', () => {
			const result = formatState(TEST_STATES.DELIVERED);
			expect(result.state).toBe('DELIVERED');
			expect(result.stateNumber).toBe(4);
		});

		it('should format SETTLED (5)', () => {
			const result = formatState(TEST_STATES.SETTLED);
			expect(result.state).toBe('SETTLED');
			expect(result.stateNumber).toBe(5);
		});

		it('should format DISPUTED (6)', () => {
			const result = formatState(TEST_STATES.DISPUTED);
			expect(result.state).toBe('DISPUTED');
			expect(result.stateNumber).toBe(6);
		});

		it('should format CANCELLED (7)', () => {
			const result = formatState(TEST_STATES.CANCELLED);
			expect(result.state).toBe('CANCELLED');
			expect(result.stateNumber).toBe(7);
		});
	});

	describe('edge cases', () => {
		it('should handle negative state number', () => {
			const result = formatState(-1);
			expect(result.state).toBe('UNKNOWN');
			expect(result.description).toBe('Unknown state');
		});

		it('should handle state number 8 (out of range)', () => {
			const result = formatState(8);
			expect(result.state).toBe('UNKNOWN');
		});

		it('should handle very large state number', () => {
			const result = formatState(1000);
			expect(result.state).toBe('UNKNOWN');
		});
	});
});

describe('formatDuration - Edge Cases', () => {
	describe('boundary conditions', () => {
		it('should format exactly 1 second as less than 1 minute', () => {
			expect(formatDuration(1)).toBe('Less than 1 minute');
		});

		it('should format 59 seconds as less than 1 minute', () => {
			expect(formatDuration(59)).toBe('Less than 1 minute');
		});

		it('should format exactly 60 seconds as 1m', () => {
			expect(formatDuration(60)).toBe('1m');
		});

		it('should format 3599 seconds (59m 59s) as 59m', () => {
			expect(formatDuration(3599)).toBe('59m');
		});

		it('should format exactly 3600 seconds as 1h', () => {
			expect(formatDuration(3600)).toBe('1h');
		});

		it('should format exactly 86400 seconds as 1d', () => {
			expect(formatDuration(86400)).toBe('1d');
		});
	});

	describe('large durations', () => {
		it('should format one week', () => {
			expect(formatDuration(604800)).toBe('7d');
		});

		it('should format 30 days', () => {
			expect(formatDuration(2592000)).toBe('30d');
		});

		it('should format 365 days', () => {
			expect(formatDuration(31536000)).toBe('365d');
		});
	});

	describe('combined durations', () => {
		it('should format 1d 12h', () => {
			expect(formatDuration(129600)).toBe('1d 12h');
		});

		it('should format 2d 3h 45m', () => {
			expect(formatDuration(186300)).toBe('2d 3h 45m');
		});

		it('should omit zero components', () => {
			// 1 day exactly - no hours or minutes
			expect(formatDuration(86400)).toBe('1d');
			// 1 hour exactly
			expect(formatDuration(3600)).toBe('1h');
		});
	});

	describe('negative and zero', () => {
		it('should return Expired for -1', () => {
			expect(formatDuration(-1)).toBe('Expired');
		});

		it('should return Expired for -1000', () => {
			expect(formatDuration(-1000)).toBe('Expired');
		});

		it('should return Expired for exactly 0', () => {
			expect(formatDuration(0)).toBe('Expired');
		});
	});
});

describe('formatTransactionSimple - Using Fixtures', () => {
	it('should format transaction built with TransactionBuilder', () => {
		const tx = new TransactionBuilder()
			.withState(TEST_STATES.COMMITTED)
			.withAmount(TEST_AMOUNTS.MEDIUM)
			.withRequester(TEST_ADDRESSES.REQUESTER)
			.withProvider(TEST_ADDRESSES.PROVIDER)
			.withDeadline(TEST_TIMESTAMPS.PLUS_ONE_DAY)
			.build();

		const result = formatTransactionSimple(tx);

		expect(result.status).toBe('COMMITTED');
		expect(result.amount).toBe('$100.0 USDC');
		expect(result.requester).toBe(TEST_ADDRESSES.REQUESTER);
		expect(result.provider).toBe(TEST_ADDRESSES.PROVIDER);
	});

	it('should handle minimum amount transaction', () => {
		const tx = new TransactionBuilder()
			.withAmount(TEST_AMOUNTS.MINIMUM)
			.build();

		const result = formatTransactionSimple(tx);

		expect(result.amount).toBe('$0.05 USDC');
	});

	it('should handle large amount transaction', () => {
		const tx = new TransactionBuilder()
			.withAmount(TEST_AMOUNTS.VERY_LARGE)
			.build();

		const result = formatTransactionSimple(tx);

		expect(result.amount).toBe('$1000000.0 USDC');
	});
});

describe('formatTransactionAdvanced - Using Fixtures', () => {
	it('should include escrowId and contentHash', () => {
		const tx = new TransactionBuilder()
			.withState(TEST_STATES.DELIVERED)
			.withEscrowId(TEST_TRANSACTION_IDS.VALID_2)
			.withContentHash('0x' + 'c'.repeat(64))
			.withDisputeWindow(86400)
			.build();

		const result = formatTransactionAdvanced(tx);

		expect(result.escrowId).toBe(TEST_TRANSACTION_IDS.VALID_2);
		expect(result.contentHash).toBe('0x' + 'c'.repeat(64));
		expect(result.disputeWindow).toBe(86400);
	});

	it('should format all 8 states correctly', () => {
		for (let state = 0; state <= 7; state++) {
			const tx = new TransactionBuilder().withState(state).build();
			const result = formatTransactionAdvanced(tx);

			expect(result.stateNumber).toBe(state);
			expect(['INITIATED', 'QUOTED', 'COMMITTED', 'IN_PROGRESS', 'DELIVERED', 'SETTLED', 'DISPUTED', 'CANCELLED'])
				.toContain(result.state);
		}
	});
});

describe('formatStatusCheck - Edge Cases', () => {
	it('should handle no actions available', () => {
		const status = {
			state: TEST_STATES.SETTLED,
			canAccept: false,
			canComplete: false,
			canDispute: false,
			canFinalize: false,
		};

		const result = formatStatusCheck(status);

		expect(result.availableActions).toHaveLength(0);
	});

	it('should handle all actions available', () => {
		const status = {
			state: TEST_STATES.COMMITTED,
			canAccept: true,
			canComplete: true,
			canDispute: true,
			canFinalize: true,
		};

		const result = formatStatusCheck(status);

		expect(result.availableActions).toHaveLength(4);
	});

	it('should handle undefined action flags', () => {
		const status = {
			state: TEST_STATES.INITIATED,
			// No action flags provided
		};

		const result = formatStatusCheck(status);

		expect(result.canAccept).toBe(false);
		expect(result.canComplete).toBe(false);
		expect(result.canDispute).toBe(false);
		expect(result.canFinalize).toBe(false);
	});

	it('should handle zero time remaining', () => {
		const status = {
			state: TEST_STATES.DELIVERED,
			timeRemaining: 0,
		};

		const result = formatStatusCheck(status);

		expect(result.timeRemaining).toBe('Expired');
	});

	it('should not include timeRemaining if not provided', () => {
		const status = {
			state: TEST_STATES.DELIVERED,
		};

		const result = formatStatusCheck(status);

		expect(result.timeRemaining).toBeUndefined();
		expect(result.timeRemainingSeconds).toBeUndefined();
	});
});

describe('formatSuccess - Edge Cases', () => {
	it('should handle empty data object', () => {
		const result = formatSuccess('getTransaction', {} as any);

		expect(result.success).toBe(true);
		expect(result.operation).toBe('getTransaction');
	});

	it('should handle data with nested objects', () => {
		const data = {
			transaction: {
				id: '0x123',
				state: 'COMMITTED',
			},
			metadata: {
				timestamp: Date.now(),
			},
		};

		const result = formatSuccess('createTransaction', data as any);

		expect(result.success).toBe(true);
		expect((result as any).transaction.id).toBe('0x123');
	});
});

describe('formatError - Edge Cases', () => {
	it('should handle Error with empty message', () => {
		const error = new Error('');
		const result = formatError('operation', error);

		expect(result.success).toBe(false);
		expect(result.error).toBe('');
	});

	it('should handle very long error messages', () => {
		const longMessage = 'Error: ' + 'x'.repeat(10000);
		const result = formatError('operation', longMessage);

		expect(result.success).toBe(false);
		expect(result.error).toBe(longMessage);
	});

	it('should handle special characters in error', () => {
		const error = 'Error with <script>alert("xss")</script>';
		const result = formatError('operation', error);

		// Error message is passed through unchanged
		expect(result.error).toContain('<script>');
	});
});
