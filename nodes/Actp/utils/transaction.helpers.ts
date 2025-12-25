/**
 * Transaction Helper Utilities
 *
 * Common transaction operations with proper error handling.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import { sanitizeError, executeWithProtection } from './client.factory';
import {
	TransitionableState,
	VALID_TRANSITION_STATES,
	stateStringToNumber,
} from './constants';

/**
 * Transaction data returned from SDK
 */
export interface TransactionData {
	state: string;
	amount: string | bigint;
	requester: string;
	provider: string;
	deadline: number;
	disputeWindow?: number;
	createdAt?: number;
	updatedAt?: number;
	escrowId?: string;
	contentHash?: string;
}

/**
 * Get transaction with null check
 *
 * @param client - ACTP client
 * @param txId - Transaction ID
 * @param context - n8n execution context
 * @param itemIndex - Item index for error context
 * @returns Transaction data
 * @throws NodeOperationError if transaction not found
 */
export async function getTransactionOrThrow(
	client: ACTPClient,
	txId: string,
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<TransactionData> {
	const tx = await executeWithProtection(
		() => client.standard.getTransaction(txId),
		'getTransaction',
	);

	if (!tx) {
		throw new NodeOperationError(
			context.getNode(),
			`Transaction ${txId} not found`,
			{ itemIndex },
		);
	}

	return tx as TransactionData;
}

/**
 * Validate and normalize state transition target
 *
 * @param state - State string from user input
 * @param context - n8n execution context
 * @param itemIndex - Item index for error context
 * @returns Validated TransitionableState
 * @throws NodeOperationError if state is invalid
 */
export function validateTransitionState(
	state: string,
	context: IExecuteFunctions,
	itemIndex: number,
): TransitionableState {
	const normalized = state.toUpperCase().trim();

	if (!VALID_TRANSITION_STATES.includes(normalized as TransitionableState)) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid transition state: "${state}". Valid states: ${VALID_TRANSITION_STATES.join(', ')}`,
			{ itemIndex },
		);
	}

	return normalized as TransitionableState;
}

/**
 * Convert SDK state string to state number
 *
 * Safely handles unknown states by returning 0 (INITIATED) as fallback.
 *
 * @param state - State string from SDK
 * @returns State number (0-7)
 */
export function sdkStateToNumber(state: string | undefined): number {
	if (!state) return 0;

	try {
		return stateStringToNumber(state);
	} catch {
		// Unknown state, default to INITIATED
		return 0;
	}
}

/**
 * Wrap SDK operation with error handling
 *
 * Combines:
 * - Timeout protection (30s)
 * - Retry on transient errors
 * - Error sanitization
 * - NodeOperationError wrapping
 *
 * @param operation - Async operation to execute
 * @param operationName - Name for error messages
 * @param context - n8n execution context
 * @param itemIndex - Item index for error context
 * @returns Operation result
 */
export async function executeSDKOperation<T>(
	operation: () => Promise<T>,
	operationName: string,
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<T> {
	try {
		return await executeWithProtection(operation, operationName);
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}
