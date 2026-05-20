/**
 * ACTP Node Utilities
 *
 * Shared utilities for the ACTP n8n node.
 */

// Client factory
export {
	createActpClient,
	createClientFromCredentials,
	clearClientCache,
	sanitizeError,
	withTimeout,
	withRetry,
	executeWithProtection,
} from './client.factory';

// Input parsers
export {
	parseAmount,
	parseDeadline,
	parseDisputeWindow,
	parseAddress,
	parseTransactionId,
	parseState,
} from './parsers';

// Output formatters
export {
	formatAmount,
	formatTimestamp,
	formatState,
	formatTransactionSimple,
	formatTransactionAdvanced,
	formatStatusCheck,
	formatDuration,
	formatSuccess,
	formatError,
} from './formatters';

// Constants
export {
	ACTPState,
	STATE_NAMES,
	STATE_DESCRIPTIONS,
	STATE_STRING_TO_ENUM,
	VALID_TRANSITION_STATES,
	PROTOCOL_CONSTANTS,
	parseStateToEnum,
	stateStringToNumber,
	stateNumberToString,
	isValidTransitionState,
	type TransitionableState,
} from './constants';

// Transaction helpers
export {
	getTransactionOrThrow,
	validateTransitionState,
	sdkStateToNumber,
	executeSDKOperation,
	type TransactionData,
} from './transaction.helpers';
