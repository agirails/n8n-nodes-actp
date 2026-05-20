/**
 * ACTP Protocol Constants
 *
 * Single source of truth for protocol-level constants.
 * Used across handlers, formatters, and parsers.
 */

/**
 * ACTP State Enum
 *
 * Maps to the 8-state machine defined in ACTPKernel.sol
 */
export enum ACTPState {
	INITIATED = 0,
	QUOTED = 1,
	COMMITTED = 2,
	IN_PROGRESS = 3,
	DELIVERED = 4,
	SETTLED = 5,
	DISPUTED = 6,
	CANCELLED = 7,
}

/**
 * State names indexed by state number
 *
 * Uses number index for flexibility (allows graceful UNKNOWN fallback)
 */
export const STATE_NAMES: Record<number, string> = {
	[ACTPState.INITIATED]: 'INITIATED',
	[ACTPState.QUOTED]: 'QUOTED',
	[ACTPState.COMMITTED]: 'COMMITTED',
	[ACTPState.IN_PROGRESS]: 'IN_PROGRESS',
	[ACTPState.DELIVERED]: 'DELIVERED',
	[ACTPState.SETTLED]: 'SETTLED',
	[ACTPState.DISPUTED]: 'DISPUTED',
	[ACTPState.CANCELLED]: 'CANCELLED',
};

/**
 * State descriptions for user-friendly output
 *
 * Uses number index for flexibility (allows graceful UNKNOWN fallback)
 */
export const STATE_DESCRIPTIONS: Record<number, string> = {
	[ACTPState.INITIATED]: 'Transaction created, awaiting escrow',
	[ACTPState.QUOTED]: 'Provider submitted price quote',
	[ACTPState.COMMITTED]: 'Funds locked in escrow, work can begin',
	[ACTPState.IN_PROGRESS]: 'Provider is working on the service',
	[ACTPState.DELIVERED]: 'Work delivered, awaiting confirmation',
	[ACTPState.SETTLED]: 'Payment released to provider (complete)',
	[ACTPState.DISPUTED]: 'Dispute raised, awaiting resolution',
	[ACTPState.CANCELLED]: 'Transaction cancelled',
};

/**
 * Map state string to enum value
 *
 * Handles various input formats:
 * - INITIATED, initiated, Initiated
 * - IN_PROGRESS, in_progress, inprogress
 * - CANCELLED, cancelled, canceled (US spelling)
 */
export const STATE_STRING_TO_ENUM: Record<string, ACTPState> = {
	// Standard uppercase
	INITIATED: ACTPState.INITIATED,
	QUOTED: ACTPState.QUOTED,
	COMMITTED: ACTPState.COMMITTED,
	IN_PROGRESS: ACTPState.IN_PROGRESS,
	DELIVERED: ACTPState.DELIVERED,
	SETTLED: ACTPState.SETTLED,
	DISPUTED: ACTPState.DISPUTED,
	CANCELLED: ACTPState.CANCELLED,

	// Lowercase variants
	initiated: ACTPState.INITIATED,
	quoted: ACTPState.QUOTED,
	committed: ACTPState.COMMITTED,
	in_progress: ACTPState.IN_PROGRESS,
	inprogress: ACTPState.IN_PROGRESS,
	delivered: ACTPState.DELIVERED,
	settled: ACTPState.SETTLED,
	disputed: ACTPState.DISPUTED,
	cancelled: ACTPState.CANCELLED,
	canceled: ACTPState.CANCELLED, // US spelling
};

/**
 * Valid states for state transitions (subset of all states)
 */
export type TransitionableState =
	| 'QUOTED'
	| 'IN_PROGRESS'
	| 'DELIVERED'
	| 'DISPUTED'
	| 'CANCELLED';

/**
 * Valid transition target states
 */
export const VALID_TRANSITION_STATES: TransitionableState[] = [
	'QUOTED',
	'IN_PROGRESS',
	'DELIVERED',
	'DISPUTED',
	'CANCELLED',
];

/**
 * Convert state string to enum, with validation
 *
 * @param state - State string (any case)
 * @returns ACTPState enum value
 * @throws Error if state is invalid
 */
export function parseStateToEnum(state: string): ACTPState {
	// Normalize: lowercase, remove non-alpha except underscore
	const normalized = state.toLowerCase().replace(/[^a-z_]/g, '');
	const stateValue = STATE_STRING_TO_ENUM[normalized];

	if (stateValue === undefined) {
		const validStates = Object.keys(STATE_NAMES).map(
			(k) => STATE_NAMES[k as unknown as ACTPState],
		);
		throw new Error(
			`Invalid state: "${state}". Valid states: ${validStates.join(', ')}.`,
		);
	}

	return stateValue;
}

/**
 * Convert state string to number
 *
 * @param state - State string (any case)
 * @returns State number (0-7)
 */
export function stateStringToNumber(state: string): number {
	return parseStateToEnum(state);
}

/**
 * Get state name from number
 *
 * @param stateNumber - State number (0-7)
 * @returns State name string
 */
export function stateNumberToString(stateNumber: number): string {
	return STATE_NAMES[stateNumber as ACTPState] || 'UNKNOWN';
}

/**
 * Validate if a string is a valid transition target state
 *
 * @param state - State to validate
 * @returns true if valid transition state
 */
export function isValidTransitionState(state: string): state is TransitionableState {
	const upper = state.toUpperCase();
	return VALID_TRANSITION_STATES.includes(upper as TransitionableState);
}

/**
 * Protocol Constants
 */
export const PROTOCOL_CONSTANTS = {
	/**
	 * Minimum transaction amount in USDC wei (6 decimals)
	 * $0.05 = 50000 wei
	 */
	MIN_AMOUNT_WEI: 50000n,

	/**
	 * Minimum transaction amount in USD
	 */
	MIN_AMOUNT_USD: 0.05,

	/**
	 * USDC decimals
	 */
	USDC_DECIMALS: 6,

	/**
	 * Default deadline (24 hours from now)
	 */
	DEFAULT_DEADLINE_HOURS: 24,

	/**
	 * Default dispute window (2 days)
	 */
	DEFAULT_DISPUTE_WINDOW_SECONDS: 172800, // 2 * 86400

	/**
	 * SDK operation timeout (30 seconds)
	 */
	SDK_TIMEOUT_MS: 30000,

	/**
	 * Maximum retry attempts for transient errors
	 */
	MAX_RETRY_ATTEMPTS: 3,

	/**
	 * Base delay for exponential backoff (ms)
	 */
	RETRY_BASE_DELAY_MS: 1000,
} as const;
