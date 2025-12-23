/**
 * Secrets Detection Security Tests
 *
 * Tests for the secrets detection and redaction module.
 * Ensures sensitive data (private keys, mnemonics, API keys) are properly
 * identified and redacted from error messages and logs.
 */

import {
	isMnemonicPhrase,
	isPrivateKey,
	isApiKey,
	redactSecrets,
	validateInputLength,
	isZeroAddress,
	MAX_INPUT_LENGTHS,
	ZERO_ADDRESS,
} from '../../nodes/ACTP/utils/secrets';
import {
	TEST_PRIVATE_KEYS,
	TEST_MNEMONICS,
	TEST_API_KEYS,
	TEST_ADDRESSES,
} from '../fixtures';

describe('Security: Secrets Detection', () => {
	describe('isMnemonicPhrase', () => {
		describe('valid mnemonics', () => {
			it('should detect 12-word BIP-39 mnemonic', () => {
				expect(isMnemonicPhrase(TEST_MNEMONICS.TWELVE_WORD)).toBe(true);
			});

			it('should detect 24-word BIP-39 mnemonic', () => {
				expect(isMnemonicPhrase(TEST_MNEMONICS.TWENTY_FOUR_WORD)).toBe(true);
			});

			it('should detect mnemonic with mixed case', () => {
				const mixedCase = 'Abandon ABANDON abandon abandon abandon abandon abandon abandon abandon abandon abandon About';
				expect(isMnemonicPhrase(mixedCase)).toBe(true);
			});

			it('should detect mnemonic with extra whitespace', () => {
				const extraSpace = '  abandon   abandon   abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
				expect(isMnemonicPhrase(extraSpace)).toBe(true);
			});

			it('should detect 11-word partial mnemonic (edge case)', () => {
				expect(isMnemonicPhrase(TEST_MNEMONICS.ELEVEN_WORD)).toBe(true);
			});
		});

		describe('non-mnemonics', () => {
			it('should reject random words not in BIP-39', () => {
				expect(isMnemonicPhrase(TEST_MNEMONICS.NOT_MNEMONIC)).toBe(false);
			});

			it('should reject too few words (10)', () => {
				const tooFew = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
				expect(isMnemonicPhrase(tooFew)).toBe(false);
			});

			it('should reject too many words (25)', () => {
				const tooMany = ('abandon '.repeat(25)).trim();
				expect(isMnemonicPhrase(tooMany)).toBe(false);
			});

			it('should reject empty string', () => {
				expect(isMnemonicPhrase('')).toBe(false);
			});

			it('should reject null', () => {
				expect(isMnemonicPhrase(null as any)).toBe(false);
			});

			it('should reject undefined', () => {
				expect(isMnemonicPhrase(undefined as any)).toBe(false);
			});

			it('should reject single long word', () => {
				expect(isMnemonicPhrase('abandon')).toBe(false);
			});

			it('should reject sentence with numbers', () => {
				const withNumbers = 'abandon 123 abandon 456 abandon 789 abandon 111 abandon 222 abandon 333';
				expect(isMnemonicPhrase(withNumbers)).toBe(false);
			});
		});

		describe('threshold behavior (80% match)', () => {
			it('should accept 80% BIP-39 words (10 of 12)', () => {
				// 10 valid + 2 invalid = 83% valid
				const mostly = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyzzy qwerty';
				expect(isMnemonicPhrase(mostly)).toBe(true);
			});

			it('should reject less than 80% BIP-39 words', () => {
				// 8 valid + 4 invalid = 67% valid
				const lessValid = 'abandon abandon abandon abandon abandon abandon abandon abandon xyzzy qwerty foobar bazqux';
				expect(isMnemonicPhrase(lessValid)).toBe(false);
			});
		});
	});

	describe('isPrivateKey', () => {
		describe('valid private keys', () => {
			it('should detect 64-char hex with 0x prefix', () => {
				expect(isPrivateKey(TEST_PRIVATE_KEYS.VALID)).toBe(true);
			});

			it('should detect 64-char hex without prefix', () => {
				expect(isPrivateKey(TEST_PRIVATE_KEYS.NO_PREFIX)).toBe(true);
			});

			it('should detect mixed case hex', () => {
				expect(isPrivateKey(TEST_PRIVATE_KEYS.MIXED_CASE)).toBe(true);
			});

			it('should detect various hex patterns', () => {
				expect(isPrivateKey('0x' + 'dead'.repeat(16))).toBe(true);
				expect(isPrivateKey('0x' + 'cafe'.repeat(16))).toBe(true);
				expect(isPrivateKey('0x' + '1234'.repeat(16))).toBe(true);
			});
		});

		describe('non-private keys', () => {
			it('should reject too short with prefix', () => {
				expect(isPrivateKey(TEST_PRIVATE_KEYS.TOO_SHORT)).toBe(false);
			});

			it('should reject too long', () => {
				expect(isPrivateKey('0x' + 'a'.repeat(65))).toBe(false);
			});

			it('should reject non-hex characters', () => {
				expect(isPrivateKey('0x' + 'g'.repeat(64))).toBe(false);
			});

			it('should reject empty string', () => {
				expect(isPrivateKey('')).toBe(false);
			});

			it('should reject null', () => {
				expect(isPrivateKey(null as any)).toBe(false);
			});

			it('should reject Ethereum address (40 chars)', () => {
				expect(isPrivateKey(TEST_ADDRESSES.REQUESTER)).toBe(false);
			});
		});
	});

	describe('isApiKey', () => {
		describe('valid API keys', () => {
			it('should detect Stripe live key', () => {
				expect(isApiKey(TEST_API_KEYS.STRIPE_LIVE)).toBe(true);
			});

			it('should detect Stripe test key', () => {
				expect(isApiKey(TEST_API_KEYS.STRIPE_TEST)).toBe(true);
			});

			it('should detect AWS access key', () => {
				expect(isApiKey(TEST_API_KEYS.AWS)).toBe(true);
			});

			it('should detect GitHub PAT', () => {
				expect(isApiKey(TEST_API_KEYS.GITHUB)).toBe(true);
			});

			it('should detect GitLab PAT', () => {
				expect(isApiKey(TEST_API_KEYS.GITLAB)).toBe(true);
			});

			it('should detect Slack token', () => {
				expect(isApiKey(TEST_API_KEYS.SLACK)).toBe(true);
			});
		});

		describe('non-API keys', () => {
			it('should reject random strings', () => {
				expect(isApiKey('hello_world_12345')).toBe(false);
			});

			it('should reject empty string', () => {
				expect(isApiKey('')).toBe(false);
			});

			it('should reject partial patterns', () => {
				expect(isApiKey('sk_live_')).toBe(false); // Too short
				expect(isApiKey('AKIA')).toBe(false); // Too short
			});
		});
	});

	describe('redactSecrets', () => {
		describe('private key redaction', () => {
			it('should redact single private key', () => {
				const input = `Error with key: ${TEST_PRIVATE_KEYS.VALID}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
				expect(result).toContain('[REDACTED_KEY]');
			});

			it('should redact multiple private keys', () => {
				const input = `Keys: ${TEST_PRIVATE_KEYS.VALID} and ${TEST_PRIVATE_KEYS.VALID_2}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID_2);
				expect(result.match(/\[REDACTED_KEY\]/g)?.length).toBe(2);
			});

			it('should redact private key without 0x prefix', () => {
				const bareKey = 'a'.repeat(64);
				const input = `Raw key: ${bareKey}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(bareKey);
				expect(result).toContain('[REDACTED_KEY]');
			});

			it('should redact private keys in JSON', () => {
				const json = JSON.stringify({ privateKey: TEST_PRIVATE_KEYS.VALID });
				const result = redactSecrets(json);

				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
			});

			it('should redact private keys in stack traces', () => {
				const stack = `Error: Failed
    at wallet.ts:42 with key ${TEST_PRIVATE_KEYS.VALID}
    at processQueue.ts:18`;
				const result = redactSecrets(stack);

				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
				expect(result).toContain('wallet.ts:42'); // Preserves stack info
			});
		});

		describe('API key redaction', () => {
			it('should redact Stripe keys', () => {
				const input = `Stripe error: ${TEST_API_KEYS.STRIPE_LIVE}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(TEST_API_KEYS.STRIPE_LIVE);
				expect(result).toContain('[REDACTED_API_KEY]');
			});

			it('should redact AWS keys', () => {
				const input = `AWS access key: ${TEST_API_KEYS.AWS}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(TEST_API_KEYS.AWS);
				expect(result).toContain('[REDACTED_API_KEY]');
			});

			it('should redact GitHub tokens', () => {
				const input = `GitHub token: ${TEST_API_KEYS.GITHUB}`;
				const result = redactSecrets(input);

				expect(result).not.toContain(TEST_API_KEYS.GITHUB);
				expect(result).toContain('[REDACTED_API_KEY]');
			});
		});

		describe('mnemonic redaction', () => {
			it('should redact quoted mnemonic phrases', () => {
				const input = `Seed phrase: "${TEST_MNEMONICS.TWELVE_WORD}"`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_MNEMONIC]');
				expect(result).not.toContain('abandon abandon');
			});

			it('should redact mnemonic after "mnemonic:" prefix', () => {
				const input = `mnemonic: ${TEST_MNEMONICS.TWELVE_WORD}`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_MNEMONIC]');
			});

			it('should redact mnemonic after "seed:" prefix', () => {
				const input = `seed: ${TEST_MNEMONICS.TWELVE_WORD}`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_MNEMONIC]');
			});

			it('should redact mnemonic after "phrase:" prefix', () => {
				const input = `phrase: ${TEST_MNEMONICS.TWELVE_WORD}`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_MNEMONIC]');
			});

			it('should redact mnemonic after "recovery:" prefix', () => {
				const input = `recovery: ${TEST_MNEMONICS.TWELVE_WORD}`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_MNEMONIC]');
			});
		});

		describe('mixed secrets', () => {
			it('should redact private key and mnemonic in same message', () => {
				const input = `Key: ${TEST_PRIVATE_KEYS.VALID}, Seed: "${TEST_MNEMONICS.TWELVE_WORD}"`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_KEY]');
				expect(result).toContain('[REDACTED_MNEMONIC]');
				expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
			});

			it('should redact all secret types together', () => {
				const input = `Key: ${TEST_PRIVATE_KEYS.VALID}, API: ${TEST_API_KEYS.STRIPE_LIVE}, Seed: "${TEST_MNEMONICS.TWELVE_WORD}"`;
				const result = redactSecrets(input);

				expect(result).toContain('[REDACTED_KEY]');
				expect(result).toContain('[REDACTED_API_KEY]');
				expect(result).toContain('[REDACTED_MNEMONIC]');
			});
		});

		describe('edge cases', () => {
			it('should handle empty string', () => {
				expect(redactSecrets('')).toBe('');
			});

			it('should handle null', () => {
				expect(redactSecrets(null as any)).toBe(null);
			});

			it('should handle undefined', () => {
				expect(redactSecrets(undefined as any)).toBe(undefined);
			});

			it('should preserve non-secret content', () => {
				const input = 'Normal error message with no secrets';
				expect(redactSecrets(input)).toBe(input);
			});

			it('should not redact Ethereum addresses (40 chars)', () => {
				const input = `Address: ${TEST_ADDRESSES.REQUESTER}`;
				const result = redactSecrets(input);

				expect(result).toContain(TEST_ADDRESSES.REQUESTER);
			});

			it('should truncate very long inputs', () => {
				const longInput = 'x'.repeat(20000);
				const result = redactSecrets(longInput);

				expect(result.length).toBeLessThan(longInput.length);
				expect(result).toContain('[TRUNCATED]');
			});
		});
	});

	describe('validateInputLength', () => {
		it('should pass for input within limit', () => {
			expect(() => validateInputLength('short', 100, 'Field')).not.toThrow();
		});

		it('should pass for input at exact limit', () => {
			const input = 'x'.repeat(100);
			expect(() => validateInputLength(input, 100, 'Field')).not.toThrow();
		});

		it('should throw for input exceeding limit', () => {
			const input = 'x'.repeat(101);
			expect(() => validateInputLength(input, 100, 'Field')).toThrow(
				'Field input too long',
			);
		});

		it('should include actual length in error message', () => {
			const input = 'x'.repeat(150);
			expect(() => validateInputLength(input, 100, 'Amount')).toThrow(
				'150 chars',
			);
		});

		it('should handle empty string', () => {
			expect(() => validateInputLength('', 100, 'Field')).not.toThrow();
		});
	});

	describe('isZeroAddress', () => {
		it('should return true for zero address', () => {
			expect(isZeroAddress(ZERO_ADDRESS)).toBe(true);
		});

		it('should return true for lowercase zero address', () => {
			expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true);
		});

		it('should return true for mixed case zero address', () => {
			expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true);
		});

		it('should return false for non-zero address', () => {
			expect(isZeroAddress(TEST_ADDRESSES.REQUESTER)).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isZeroAddress('')).toBe(false);
		});

		it('should return false for null', () => {
			expect(isZeroAddress(null as any)).toBe(false);
		});

		it('should handle whitespace', () => {
			expect(isZeroAddress('  0x0000000000000000000000000000000000000000  ')).toBe(true);
		});
	});

	describe('MAX_INPUT_LENGTHS constants', () => {
		it('should have reasonable limits for all fields', () => {
			expect(MAX_INPUT_LENGTHS.amount).toBeGreaterThan(0);
			expect(MAX_INPUT_LENGTHS.address).toBeGreaterThan(0);
			expect(MAX_INPUT_LENGTHS.transactionId).toBeGreaterThan(0);
			expect(MAX_INPUT_LENGTHS.deadline).toBeGreaterThan(0);
			expect(MAX_INPUT_LENGTHS.disputeWindow).toBeGreaterThan(0);
			expect(MAX_INPUT_LENGTHS.errorMessage).toBeGreaterThan(0);
		});

		it('should have address limit greater than 42 (Ethereum address)', () => {
			expect(MAX_INPUT_LENGTHS.address).toBeGreaterThan(42);
		});

		it('should have transactionId limit greater than 66 (bytes32)', () => {
			expect(MAX_INPUT_LENGTHS.transactionId).toBeGreaterThan(66);
		});
	});
});

describe('Security: Integration with sanitizeError', () => {
	// These tests verify the integration between secrets.ts and client.factory.ts

	const { sanitizeError } = require('../../nodes/ACTP/utils/client.factory');

	it('should redact private keys in error messages', () => {
		const error = new Error(`Failed with key: ${TEST_PRIVATE_KEYS.VALID}`);
		const result = sanitizeError(error);

		expect(result).not.toContain(TEST_PRIVATE_KEYS.VALID);
		expect(result).toContain('[REDACTED_KEY]');
	});

	it('should redact mnemonics in error messages', () => {
		const error = `Seed phrase error: "${TEST_MNEMONICS.TWELVE_WORD}"`;
		const result = sanitizeError(error);

		expect(result).toContain('[REDACTED_MNEMONIC]');
	});

	it('should redact API keys in error messages', () => {
		const error = `Stripe error with ${TEST_API_KEYS.STRIPE_LIVE}`;
		const result = sanitizeError(error);

		expect(result).not.toContain(TEST_API_KEYS.STRIPE_LIVE);
		expect(result).toContain('[REDACTED_API_KEY]');
	});

	it('should handle null error', () => {
		expect(sanitizeError(null)).toBe('Unknown error');
	});

	it('should handle undefined error', () => {
		expect(sanitizeError(undefined)).toBe('Unknown error');
	});
});
