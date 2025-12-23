/**
 * Shared Test Fixtures
 *
 * Centralized test data for DRY and consistent testing.
 * These fixtures are used across unit, integration, and security tests.
 */

/**
 * Standard test Ethereum addresses
 */
export const TEST_ADDRESSES = {
	/** Standard requester address for tests */
	REQUESTER: '0x1111111111111111111111111111111111111111',
	/** Standard provider address for tests */
	PROVIDER: '0x2222222222222222222222222222222222222222',
	/** Third party address for access control tests */
	THIRD_PARTY: '0x3333333333333333333333333333333333333333',
	/** Zero address (should be rejected) */
	ZERO: '0x0000000000000000000000000000000000000000',
	/** Valid checksummed address */
	CHECKSUMMED: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
	/** Another valid address */
	ALICE: '0x4444444444444444444444444444444444444444',
	/** Another valid address */
	BOB: '0x5555555555555555555555555555555555555555',
} as const;

/**
 * Standard test amounts (in USDC wei - 6 decimals)
 */
export const TEST_AMOUNTS = {
	/** Minimum valid amount: $0.05 = 50,000 wei */
	MINIMUM: 50000n,
	/** Just below minimum: $0.04 (should be rejected) */
	BELOW_MINIMUM: 40000n,
	/** 1 wei above minimum: $0.050001 */
	MINIMUM_PLUS_ONE: 50001n,
	/** Small amount: $1.00 */
	SMALL: 1000000n,
	/** Medium amount: $100.00 */
	MEDIUM: 100000000n,
	/** Large amount: $1,000.00 */
	LARGE: 1000000000n,
	/** Very large amount: $1,000,000.00 */
	VERY_LARGE: 1000000000000n,
	/** Maximum safe JavaScript integer (as BigInt) */
	MAX_SAFE: BigInt(Number.MAX_SAFE_INTEGER),
	/** Amount with full precision: $123.456789 */
	FULL_PRECISION: 123456789n,
	/** Zero (should be rejected) */
	ZERO: 0n,
} as const;

/**
 * Standard test amounts as human-readable strings
 */
export const TEST_AMOUNT_STRINGS = {
	MINIMUM: '0.05',
	BELOW_MINIMUM: '0.04',
	SMALL: '1',
	MEDIUM: '100',
	LARGE: '1000',
	WITH_DECIMALS: '100.50',
	WITH_DOLLAR_SIGN: '$100',
	WITH_COMMAS: '1,000',
	MAX_PRECISION: '100.123456',
	TOO_MANY_DECIMALS: '100.1234567', // 7 decimals - should fail
} as const;

/**
 * Standard test transaction IDs (bytes32 hex)
 */
export const TEST_TRANSACTION_IDS = {
	/** Valid transaction ID */
	VALID: '0x' + 'a'.repeat(64),
	/** Another valid transaction ID */
	VALID_2: '0x' + 'b'.repeat(64),
	/** Mixed case (should be normalized to lowercase) */
	MIXED_CASE: '0x' + 'AaBbCcDd'.repeat(8),
	/** Invalid: too short */
	TOO_SHORT: '0x' + 'a'.repeat(32),
	/** Invalid: too long */
	TOO_LONG: '0x' + 'a'.repeat(65),
	/** Invalid: no 0x prefix */
	NO_PREFIX: 'a'.repeat(64),
	/** Invalid: non-hex characters */
	INVALID_CHARS: '0x' + 'g'.repeat(64),
} as const;

/**
 * Standard test private keys (for mocking only - never use real keys!)
 */
export const TEST_PRIVATE_KEYS = {
	/** Valid format private key */
	VALID: '0x' + 'a'.repeat(64),
	/** Another valid format */
	VALID_2: '0x' + 'b'.repeat(64),
	/** Mixed case */
	MIXED_CASE: '0x' + 'AaBbCcDd'.repeat(8),
	/** Invalid: too short */
	TOO_SHORT: '0x' + 'a'.repeat(32),
	/** Invalid: no prefix */
	NO_PREFIX: 'a'.repeat(64),
} as const;

/**
 * Standard test timestamps
 */
export const TEST_TIMESTAMPS = {
	/** Fixed timestamp for reproducible tests */
	FIXED: 1700000000,
	/** One hour from fixed time */
	PLUS_ONE_HOUR: 1700003600,
	/** One day from fixed time */
	PLUS_ONE_DAY: 1700086400,
	/** One week from fixed time */
	PLUS_ONE_WEEK: 1700604800,
	/** Epoch (1970-01-01) */
	EPOCH: 0,
	/** Year 2100 (far future) */
	FAR_FUTURE: 4102444800,
} as const;

/**
 * ACTP protocol states
 */
export const TEST_STATES = {
	INITIATED: 0,
	QUOTED: 1,
	COMMITTED: 2,
	IN_PROGRESS: 3,
	DELIVERED: 4,
	SETTLED: 5,
	DISPUTED: 6,
	CANCELLED: 7,
} as const;

/**
 * State name mappings
 */
export const STATE_NAMES: Record<number, string> = {
	0: 'INITIATED',
	1: 'QUOTED',
	2: 'COMMITTED',
	3: 'IN_PROGRESS',
	4: 'DELIVERED',
	5: 'SETTLED',
	6: 'DISPUTED',
	7: 'CANCELLED',
};

/**
 * Test mnemonic phrases (NEVER use real mnemonics!)
 */
export const TEST_MNEMONICS = {
	/** Standard 12-word test mnemonic */
	TWELVE_WORD: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
	/** 24-word test mnemonic */
	TWENTY_FOUR_WORD: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
	/** Partial mnemonic (11 words - edge case) */
	ELEVEN_WORD: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
	/** Not a mnemonic (random words) */
	NOT_MNEMONIC: 'hello world foo bar baz qux quux corge grault garply waldo fred',
} as const;

/**
 * Test API keys (fake patterns for testing redaction)
 */
export const TEST_API_KEYS = {
	STRIPE_LIVE: 'sk_live_' + 'a'.repeat(32),
	STRIPE_TEST: 'sk_test_' + 'b'.repeat(32),
	AWS: 'AKIA' + 'A'.repeat(16),
	GITHUB: 'ghp_' + 'c'.repeat(36),
	GITLAB: 'glpat-' + 'd'.repeat(20),
	SLACK: 'xoxb-' + 'e'.repeat(40),
} as const;

/**
 * Test duration strings
 */
export const TEST_DURATIONS = {
	ONE_MINUTE: '1m',
	ONE_HOUR: '1h',
	ONE_DAY: '1d',
	SECONDS: '3600s',
	PLAIN_NUMBER: '3600',
} as const;

/**
 * Test deadline strings
 */
export const TEST_DEADLINES = {
	PLUS_ONE_HOUR: '+1h',
	PLUS_ONE_DAY: '+1d',
	PLUS_THIRTY_MINUTES: '+30m',
	ISO_DATE: '2024-12-31T23:59:59Z',
	UNIX_TIMESTAMP: '1735689599',
} as const;

/**
 * Malicious input patterns for security testing
 */
export const MALICIOUS_INPUTS = {
	SQL_INJECTION: "100'; DROP TABLE users;--",
	XSS_SCRIPT: '<script>alert("xss")</script>',
	COMMAND_INJECTION: '100; rm -rf /',
	PATH_TRAVERSAL: '../../../etc/passwd',
	ENCODED_PATH_TRAVERSAL: '%2e%2e%2f%2e%2e%2fetc/passwd',
	NULL_BYTE: 'valid\x00malicious',
	PROTOTYPE_POLLUTION: '{"__proto__": {"polluted": true}}',
	UNICODE_HOMOGRAPH: '0x' + 'а'.repeat(40), // Cyrillic 'а' looks like Latin 'a'
	ZERO_WIDTH: 'test\u200B', // Zero-width space
	VERY_LONG_STRING: 'a'.repeat(10000),
} as const;

/**
 * Builder for creating test transactions
 */
export class TransactionBuilder {
	private data: {
		transactionId: string;
		state: number;
		amount: bigint;
		requester: string;
		provider: string;
		deadline: number;
		disputeWindow?: number;
		createdAt?: number;
		updatedAt?: number;
		escrowId?: string;
		contentHash?: string;
	};

	constructor() {
		this.data = {
			transactionId: TEST_TRANSACTION_IDS.VALID,
			state: TEST_STATES.INITIATED,
			amount: TEST_AMOUNTS.MEDIUM,
			requester: TEST_ADDRESSES.REQUESTER,
			provider: TEST_ADDRESSES.PROVIDER,
			deadline: TEST_TIMESTAMPS.PLUS_ONE_DAY,
		};
	}

	withTransactionId(id: string): this {
		this.data.transactionId = id;
		return this;
	}

	withState(state: number): this {
		this.data.state = state;
		return this;
	}

	withAmount(amount: bigint): this {
		this.data.amount = amount;
		return this;
	}

	withRequester(address: string): this {
		this.data.requester = address;
		return this;
	}

	withProvider(address: string): this {
		this.data.provider = address;
		return this;
	}

	withDeadline(timestamp: number): this {
		this.data.deadline = timestamp;
		return this;
	}

	withDisputeWindow(seconds: number): this {
		this.data.disputeWindow = seconds;
		return this;
	}

	withCreatedAt(timestamp: number): this {
		this.data.createdAt = timestamp;
		return this;
	}

	withUpdatedAt(timestamp: number): this {
		this.data.updatedAt = timestamp;
		return this;
	}

	withEscrowId(id: string): this {
		this.data.escrowId = id;
		return this;
	}

	withContentHash(hash: string): this {
		this.data.contentHash = hash;
		return this;
	}

	build() {
		return { ...this.data };
	}
}

/**
 * Create a mock transaction with default values
 */
export function createMockTransaction(overrides?: Partial<ReturnType<TransactionBuilder['build']>>) {
	const builder = new TransactionBuilder();
	const tx = builder.build();
	return { ...tx, ...overrides };
}

/**
 * Initial balance for test wallets (1M USDC in wei)
 */
export const INITIAL_BALANCE = '1000000000000'; // 1M USDC = 1e12 wei (6 decimals)

/**
 * Dispute window values
 */
export const DISPUTE_WINDOWS = {
	ONE_HOUR: 3600,
	TWO_HOURS: 7200,
	ONE_DAY: 86400,
	ONE_WEEK: 604800,
	MINIMUM: 3600, // 1 hour minimum
	MAXIMUM: 2592000, // 30 days maximum
} as const;
