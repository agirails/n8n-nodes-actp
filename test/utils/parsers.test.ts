/**
 * Parser Unit Tests
 *
 * Tests for smart input parsing utilities.
 */

import {
	parseAmount,
	parseDeadline,
	parseDisputeWindow,
	parseAddress,
	parseTransactionId,
	parseState,
} from '../../nodes/ACTP/utils/parsers';
import { formatAmount } from '../../nodes/ACTP/utils/formatters';

describe('parseAmount', () => {
	describe('valid inputs', () => {
		it('should parse integer string', () => {
			const result = parseAmount('100');
			expect(result).toBe(100000000n); // 100 USDC = 100 * 10^6
		});

		it('should parse decimal string', () => {
			const result = parseAmount('100.50');
			expect(result).toBe(100500000n);
		});

		it('should parse number input', () => {
			const result = parseAmount(50);
			expect(result).toBe(50000000n);
		});

		it('should parse with dollar sign', () => {
			const result = parseAmount('$100');
			expect(result).toBe(100000000n);
		});

		it('should parse with commas', () => {
			const result = parseAmount('1,000');
			expect(result).toBe(1000000000n);
		});

		it('should parse minimum valid amount ($0.05)', () => {
			const result = parseAmount('0.05');
			expect(result).toBe(50000n);
		});

		it('should parse large amounts', () => {
			const result = parseAmount('1000000');
			expect(result).toBe(1000000000000n);
		});

		it('should handle whitespace', () => {
			const result = parseAmount('  100  ');
			expect(result).toBe(100000000n);
		});
	});

	describe('invalid inputs', () => {
		it('should throw on empty string', () => {
			expect(() => parseAmount('')).toThrow('Invalid amount');
		});

		it('should throw on non-numeric string', () => {
			expect(() => parseAmount('abc')).toThrow('Invalid amount');
		});

		it('should throw on negative amount', () => {
			expect(() => parseAmount('-100')).toThrow(); // Will fail BigInt conversion
		});

		it('should throw on amount below minimum ($0.05)', () => {
			expect(() => parseAmount('0.04')).toThrow('at least $0.05');
		});

		it('should throw on zero amount', () => {
			expect(() => parseAmount('0')).toThrow('at least $0.05');
		});
	});

	describe('boundary conditions (USDC 6 decimals)', () => {
		it('should handle exact 6 decimal precision', () => {
			const result = parseAmount('100.123456');
			expect(result).toBe(100123456n);
		});

		it('should throw on more than 6 decimals', () => {
			// ethers parseUnits throws "too many decimals" for >6 decimal places
			expect(() => parseAmount('100.1234567')).toThrow();
		});

		it('should handle minimum amount exactly ($0.05)', () => {
			const result = parseAmount('0.050000');
			expect(result).toBe(50000n);
		});

		it('should throw on $0.049999 (below minimum)', () => {
			expect(() => parseAmount('0.049999')).toThrow('at least $0.05');
		});

		it('should handle very large amounts (1 billion USDC)', () => {
			const result = parseAmount('1000000000');
			expect(result).toBe(1000000000000000n); // 1B * 10^6
		});

		it('should handle maximum realistic USDC supply (~50B)', () => {
			const result = parseAmount('50000000000');
			expect(result).toBe(50000000000000000n);
		});

		it('should handle amounts with trailing zeros', () => {
			const result = parseAmount('100.100000');
			expect(result).toBe(100100000n);
		});

		it('should handle 1 wei above minimum', () => {
			const result = parseAmount('0.050001');
			expect(result).toBe(50001n);
		});
	});

	describe('round-trip consistency (parseAmount ↔ formatAmount)', () => {
		it('should round-trip integer amounts', () => {
			const original = '100';
			const parsed = parseAmount(original);
			const formatted = formatAmount(parsed); // "$100.0 USDC"
			const reparsed = parseAmount(formatted.replace('$', '').replace(' USDC', ''));
			expect(reparsed).toBe(parsed);
		});

		it('should round-trip decimal amounts', () => {
			const original = '100.50';
			const parsed = parseAmount(original);
			const formatted = formatAmount(parsed);
			const reparsed = parseAmount(formatted.replace('$', '').replace(' USDC', ''));
			expect(reparsed).toBe(parsed);
		});

		it('should round-trip minimum amount', () => {
			const original = '0.05';
			const parsed = parseAmount(original);
			const formatted = formatAmount(parsed);
			const reparsed = parseAmount(formatted.replace('$', '').replace(' USDC', ''));
			expect(reparsed).toBe(parsed);
		});

		it('should round-trip 6 decimal precision', () => {
			const original = '123.456789';
			const parsed = parseAmount(original);
			const formatted = formatAmount(parsed);
			const reparsed = parseAmount(formatted.replace('$', '').replace(' USDC', ''));
			expect(reparsed).toBe(parsed);
		});
	});
});

describe('parseDeadline', () => {
	const mockNow = 1700000000; // Fixed timestamp for testing

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(mockNow * 1000);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('relative time formats', () => {
		it('should parse hours as number', () => {
			const result = parseDeadline(24);
			expect(result).toBe(mockNow + 24 * 3600);
		});

		it('should parse +Xh format', () => {
			const result = parseDeadline('+24h');
			expect(result).toBe(mockNow + 24 * 3600);
		});

		it('should parse +Xd format', () => {
			const result = parseDeadline('+7d');
			expect(result).toBe(mockNow + 7 * 86400);
		});

		it('should parse +Xm format (minutes)', () => {
			const result = parseDeadline('+30m');
			expect(result).toBe(mockNow + 30 * 60);
		});

		it('should handle case insensitivity', () => {
			const result = parseDeadline('+24H');
			expect(result).toBe(mockNow + 24 * 3600);
		});
	});

	describe('absolute time formats', () => {
		it('should parse ISO date string', () => {
			const futureDate = '2024-12-31T23:59:59Z';
			const result = parseDeadline(futureDate);
			expect(result).toBe(Math.floor(Date.parse(futureDate) / 1000));
		});

		it('should pass through Unix timestamp', () => {
			const futureTimestamp = 1800000000;
			const result = parseDeadline(futureTimestamp);
			expect(result).toBe(futureTimestamp);
		});

		it('should parse Unix timestamp as string', () => {
			const result = parseDeadline('1800000000');
			expect(result).toBe(1800000000);
		});
	});

	describe('invalid inputs', () => {
		it('should throw on invalid format', () => {
			expect(() => parseDeadline('invalid')).toThrow('Invalid deadline');
		});

		it('should throw on unsupported unit', () => {
			expect(() => parseDeadline('+5w')).toThrow('Invalid deadline');
		});
	});
});

describe('parseDisputeWindow', () => {
	describe('valid inputs', () => {
		it('should parse seconds as number', () => {
			expect(parseDisputeWindow(3600)).toBe(3600);
		});

		it('should parse seconds string', () => {
			expect(parseDisputeWindow('3600')).toBe(3600);
		});

		it('should parse Xs format', () => {
			expect(parseDisputeWindow('3600s')).toBe(3600);
		});

		it('should parse Xm format', () => {
			expect(parseDisputeWindow('30m')).toBe(1800);
		});

		it('should parse Xh format', () => {
			expect(parseDisputeWindow('2h')).toBe(7200);
		});

		it('should parse Xd format', () => {
			expect(parseDisputeWindow('2d')).toBe(172800);
		});

		it('should handle case insensitivity', () => {
			expect(parseDisputeWindow('2D')).toBe(172800);
		});
	});

	describe('invalid inputs', () => {
		it('should throw on invalid format', () => {
			expect(() => parseDisputeWindow('invalid')).toThrow('Invalid dispute window');
		});

		it('should throw on unsupported unit', () => {
			expect(() => parseDisputeWindow('2w')).toThrow('Invalid dispute window');
		});
	});
});

describe('parseAddress', () => {
	describe('valid inputs', () => {
		it('should accept valid Ethereum address', () => {
			const address = '0x1234567890123456789012345678901234567890';
			expect(parseAddress(address)).toBe(address);
		});

		it('should accept checksummed address', () => {
			const address = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
			expect(parseAddress(address)).toBe(address);
		});

		it('should trim whitespace', () => {
			const address = '  0x1234567890123456789012345678901234567890  ';
			expect(parseAddress(address)).toBe(address.trim());
		});
	});

	describe('invalid inputs', () => {
		it('should throw on empty string', () => {
			expect(() => parseAddress('')).toThrow('required');
		});

		it('should accept address without 0x prefix (ethers.js behavior)', () => {
			// ethers.js isAddress() accepts 40-char hex strings without 0x
			const result = parseAddress('1234567890123456789012345678901234567890');
			expect(result).toBe('1234567890123456789012345678901234567890');
		});

		it('should throw on wrong length', () => {
			expect(() => parseAddress('0x123456')).toThrow('not a valid Ethereum address');
		});

		it('should throw on invalid characters', () => {
			expect(() => parseAddress('0xZZZZ567890123456789012345678901234567890')).toThrow(
				'not a valid Ethereum address',
			);
		});

		it('should use custom field name in error', () => {
			expect(() => parseAddress('', 'Provider')).toThrow('Provider is required');
		});
	});
});

describe('parseTransactionId', () => {
	describe('valid inputs', () => {
		it('should accept valid bytes32 hex string', () => {
			const txId = '0x' + 'a'.repeat(64);
			expect(parseTransactionId(txId)).toBe(txId);
		});

		it('should convert to lowercase', () => {
			const txId = '0x' + 'A'.repeat(64);
			expect(parseTransactionId(txId)).toBe(txId.toLowerCase());
		});

		it('should trim whitespace', () => {
			const txId = '  0x' + 'a'.repeat(64) + '  ';
			expect(parseTransactionId(txId)).toBe(('0x' + 'a'.repeat(64)));
		});
	});

	describe('invalid inputs', () => {
		it('should throw on empty string', () => {
			expect(() => parseTransactionId('')).toThrow('required');
		});

		it('should throw on missing 0x prefix', () => {
			expect(() => parseTransactionId('a'.repeat(64))).toThrow('Invalid transaction ID');
		});

		it('should throw on wrong length', () => {
			expect(() => parseTransactionId('0x' + 'a'.repeat(32))).toThrow('Invalid transaction ID');
		});

		it('should throw on too long', () => {
			expect(() => parseTransactionId('0x' + 'a'.repeat(65))).toThrow('Invalid transaction ID');
		});
	});
});

describe('parseState', () => {
	describe('valid inputs', () => {
		it('should parse INITIATED', () => {
			expect(parseState('INITIATED')).toBe(0);
		});

		it('should parse QUOTED', () => {
			expect(parseState('QUOTED')).toBe(1);
		});

		it('should parse COMMITTED', () => {
			expect(parseState('COMMITTED')).toBe(2);
		});

		it('should parse IN_PROGRESS', () => {
			expect(parseState('IN_PROGRESS')).toBe(3);
		});

		it('should parse DELIVERED', () => {
			expect(parseState('DELIVERED')).toBe(4);
		});

		it('should parse SETTLED', () => {
			expect(parseState('SETTLED')).toBe(5);
		});

		it('should parse DISPUTED', () => {
			expect(parseState('DISPUTED')).toBe(6);
		});

		it('should parse CANCELLED', () => {
			expect(parseState('CANCELLED')).toBe(7);
		});

		it('should handle lowercase', () => {
			expect(parseState('initiated')).toBe(0);
		});

		it('should handle mixed case', () => {
			expect(parseState('Delivered')).toBe(4);
		});

		it('should handle CANCELED (US spelling)', () => {
			expect(parseState('CANCELED')).toBe(7);
		});

		it('should handle INPROGRESS (no underscore)', () => {
			expect(parseState('INPROGRESS')).toBe(3);
		});
	});

	describe('invalid inputs', () => {
		it('should throw on unknown state', () => {
			expect(() => parseState('UNKNOWN')).toThrow('Invalid state');
		});

		it('should throw on empty string', () => {
			expect(() => parseState('')).toThrow('Invalid state');
		});
	});
});

// ============================================================================
// SECURITY TESTS - DoS Protection & Input Validation
// ============================================================================

describe('Security: DoS Protection - Input Length Limits', () => {
	describe('parseAmount length validation', () => {
		it('should reject extremely long amount strings', () => {
			const veryLongAmount = '9'.repeat(2000);
			expect(() => parseAmount(veryLongAmount)).toThrow(/too long/i);
		});

		it('should include character count in error', () => {
			const longAmount = '1'.repeat(2000);
			expect(() => parseAmount(longAmount)).toThrow(/2000 chars/);
		});

		it('should accept reasonable length amounts', () => {
			const reasonableAmount = '1'.repeat(100);
			// This should fail on parsing (not a valid number with 100 1s)
			// but NOT on length validation
			try {
				parseAmount(reasonableAmount);
			} catch (e: any) {
				expect(e.message).not.toMatch(/too long/i);
			}
		});
	});

	describe('parseDeadline length validation', () => {
		it('should reject extremely long deadline strings', () => {
			const veryLongDeadline = '+' + '9'.repeat(500) + 'h';
			expect(() => parseDeadline(veryLongDeadline)).toThrow(/too long/i);
		});

		it('should accept reasonable length deadlines', () => {
			// Valid deadline that's not too long
			const result = parseDeadline('+24h');
			expect(result).toBeGreaterThan(0);
		});
	});

	describe('parseDisputeWindow length validation', () => {
		it('should reject extremely long dispute window strings', () => {
			const veryLongWindow = '9'.repeat(500);
			expect(() => parseDisputeWindow(veryLongWindow)).toThrow(/too long/i);
		});

		it('should accept reasonable length dispute windows', () => {
			const result = parseDisputeWindow('7d');
			expect(result).toBe(604800);
		});
	});

	describe('parseAddress length validation', () => {
		it('should reject extremely long address strings', () => {
			const veryLongAddress = '0x' + 'a'.repeat(500);
			expect(() => parseAddress(veryLongAddress)).toThrow(/too long/i);
		});

		it('should accept valid length addresses', () => {
			const validAddress = '0x1234567890123456789012345678901234567890';
			const result = parseAddress(validAddress);
			expect(result).toBe(validAddress);
		});
	});

	describe('parseTransactionId length validation', () => {
		it('should reject extremely long transaction ID strings', () => {
			const veryLongTxId = '0x' + 'a'.repeat(500);
			expect(() => parseTransactionId(veryLongTxId)).toThrow(/too long/i);
		});

		it('should accept valid length transaction IDs', () => {
			const validTxId = '0x' + 'a'.repeat(64);
			const result = parseTransactionId(validTxId);
			expect(result).toBe(validTxId.toLowerCase());
		});
	});
});

describe('Security: Zero Address Validation', () => {
	describe('parseAddress zero address rejection', () => {
		it('should reject zero address', () => {
			const zeroAddress = '0x0000000000000000000000000000000000000000';
			expect(() => parseAddress(zeroAddress)).toThrow(/zero address/i);
		});

		it('should reject zero address with custom field name', () => {
			const zeroAddress = '0x0000000000000000000000000000000000000000';
			expect(() => parseAddress(zeroAddress, 'Provider')).toThrow(
				'Provider cannot be the zero address',
			);
		});

		it('should accept non-zero addresses', () => {
			const validAddress = '0x1234567890123456789012345678901234567890';
			const result = parseAddress(validAddress);
			expect(result).toBe(validAddress);
		});

		it('should accept address with all different digits', () => {
			const address = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
			const result = parseAddress(address);
			expect(result).toBe(address);
		});
	});
});
