import { formatUnits } from 'ethers';
import type { IDataObject } from 'n8n-workflow';

/**
 * State enum to human-readable string
 */
const STATE_NAMES: Record<number, string> = {
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
 * State descriptions for user understanding
 */
const STATE_DESCRIPTIONS: Record<number, string> = {
	0: 'Transaction created, awaiting escrow',
	1: 'Provider submitted price quote',
	2: 'Funds locked in escrow, work can begin',
	3: 'Provider is working on the service',
	4: 'Work delivered, awaiting confirmation',
	5: 'Payment released to provider (complete)',
	6: 'Dispute raised, awaiting resolution',
	7: 'Transaction cancelled',
};

/**
 * Format amount from USDC wei (6 decimals) to human-readable string
 */
export function formatAmount(amount: bigint | string): string {
	const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
	const formatted = formatUnits(amountBigInt, 6);
	return `$${formatted} USDC`;
}

/**
 * Format Unix timestamp to human-readable date
 */
export function formatTimestamp(timestamp: number): string {
	if (!timestamp || timestamp === 0 || Number.isNaN(timestamp)) {
		return 'Not set';
	}
	return new Date(timestamp * 1000).toISOString();
}

/**
 * Format state number to human-readable object
 */
export function formatState(stateNumber: number): {
	state: string;
	stateNumber: number;
	description: string;
} {
	return {
		state: STATE_NAMES[stateNumber] || 'UNKNOWN',
		stateNumber,
		description: STATE_DESCRIPTIONS[stateNumber] || 'Unknown state',
	};
}

/**
 * Format a full transaction for n8n output (Simple mode)
 */
export function formatTransactionSimple(tx: {
	transactionId: string;
	state: number;
	amount: bigint | string;
	requester: string;
	provider: string;
	deadline: number;
	createdAt?: number;
	updatedAt?: number;
	[key: string]: unknown;
}): IDataObject {
	const stateInfo = formatState(tx.state);

	return {
		transactionId: tx.transactionId,
		status: stateInfo.state,
		statusDescription: stateInfo.description,
		amount: formatAmount(tx.amount),
		amountRaw: tx.amount.toString(),
		requester: tx.requester,
		provider: tx.provider,
		deadline: formatTimestamp(tx.deadline),
		deadlineRaw: tx.deadline,
		createdAt: tx.createdAt ? formatTimestamp(tx.createdAt) : undefined,
		updatedAt: tx.updatedAt ? formatTimestamp(tx.updatedAt) : undefined,
	} as IDataObject;
}

/**
 * Format a full transaction for n8n output (Advanced mode - all fields)
 */
export function formatTransactionAdvanced(tx: {
	transactionId: string;
	state: number;
	amount: bigint | string;
	requester: string;
	provider: string;
	deadline: number;
	disputeWindow?: number;
	createdAt?: number;
	updatedAt?: number;
	escrowId?: string;
	contentHash?: string;
	[key: string]: unknown;
}): IDataObject {
	const stateInfo = formatState(tx.state);

	return {
		// Core identifiers
		transactionId: tx.transactionId,
		escrowId: tx.escrowId,

		// State info
		state: stateInfo.state,
		stateNumber: stateInfo.stateNumber,
		stateDescription: stateInfo.description,

		// Parties
		requester: tx.requester,
		provider: tx.provider,

		// Amounts (both formatted and raw for chaining)
		amount: formatAmount(tx.amount),
		amountWei: tx.amount.toString(),

		// Timestamps (both formatted and raw)
		deadline: formatTimestamp(tx.deadline),
		deadlineTimestamp: tx.deadline,
		disputeWindow: tx.disputeWindow,
		createdAt: tx.createdAt ? formatTimestamp(tx.createdAt) : undefined,
		createdAtTimestamp: tx.createdAt,
		updatedAt: tx.updatedAt ? formatTimestamp(tx.updatedAt) : undefined,
		updatedAtTimestamp: tx.updatedAt,

		// Proofs
		contentHash: tx.contentHash,
	} as IDataObject;
}

/**
 * Format status check result (Simple mode)
 */
export function formatStatusCheck(status: {
	state: number;
	canAccept?: boolean;
	canComplete?: boolean;
	canDispute?: boolean;
	canFinalize?: boolean;
	timeRemaining?: number;
	[key: string]: unknown;
}): IDataObject {
	const stateInfo = formatState(status.state);

	const actions: string[] = [];
	if (status.canAccept) actions.push('Accept transaction');
	if (status.canComplete) actions.push('Mark as delivered');
	if (status.canDispute) actions.push('Raise dispute');
	if (status.canFinalize) actions.push('Release payment');

	return {
		status: stateInfo.state,
		statusDescription: stateInfo.description,
		availableActions: actions,
		canAccept: status.canAccept ?? false,
		canComplete: status.canComplete ?? false,
		canDispute: status.canDispute ?? false,
		canFinalize: status.canFinalize ?? false,
		timeRemaining: status.timeRemaining !== undefined
			? formatDuration(status.timeRemaining)
			: undefined,
		timeRemainingSeconds: status.timeRemaining,
	} as IDataObject;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
	if (seconds <= 0) return 'Expired';

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);

	return parts.length > 0 ? parts.join(' ') : 'Less than 1 minute';
}

/**
 * Format success response
 */
export function formatSuccess(
	operation: string,
	data: IDataObject,
): IDataObject {
	return {
		success: true,
		operation,
		...data,
	} as IDataObject;
}

/**
 * Format error response
 */
export function formatError(
	operation: string,
	error: Error | string,
): IDataObject {
	const message = typeof error === 'string' ? error : error.message;

	return {
		success: false,
		operation,
		error: message,
	} as IDataObject;
}
