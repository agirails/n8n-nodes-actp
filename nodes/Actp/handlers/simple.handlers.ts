/**
 * Simple Mode Operation Handlers
 *
 * User-friendly operations using the BeginnerAdapter API.
 * Designed for users who want "just make it work" simplicity.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import {
	parseAmount,
	parseDeadline,
	parseDisputeWindow,
	parseAddress,
	parseTransactionId,
	formatTransactionSimple,
	formatStatusCheck,
	formatSuccess,
	sanitizeError,
} from '../utils';

/**
 * Send Payment - Create and fund a transaction in one step
 *
 * Uses beginner.pay() for maximum simplicity.
 * Automatically links escrow after creation.
 */
export async function handleSendPayment(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		// Get inputs
		const to = context.getNodeParameter('to', itemIndex) as string;
		const amount = context.getNodeParameter('amount', itemIndex) as string | number;
		const deadlineInput = context.getNodeParameter('deadline', itemIndex, 24) as string | number;
		const disputeWindowInput = context.getNodeParameter('disputeWindow', itemIndex, '2d') as
			| string
			| number;

		// Parse and validate
		const provider = parseAddress(to, 'Recipient address');
		const parsedDeadline = parseDeadline(deadlineInput);
		const parsedDisputeWindow = parseDisputeWindow(disputeWindowInput);

		// Use beginner adapter for simplicity
		const result = await client.beginner.pay({
			to: provider,
			amount: amount,
			deadline: parsedDeadline,
			disputeWindow: parsedDisputeWindow,
		});

		return [
			{
				json: formatSuccess('sendPayment', {
					transactionId: result.txId,
					provider: result.provider,
					requester: result.requester,
					amount: result.amount,
					deadline: result.deadline,
					state: result.state,
					message: `Payment of ${result.amount} created and escrow funded. Provider can now start work.`,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Check Status - Get transaction status with action hints
 *
 * Uses beginner.checkStatus() for user-friendly output.
 */
export async function handleCheckStatus(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		const status = await client.beginner.checkStatus(parsedTxId);

		return [
			{
				json: formatSuccess('checkStatus', formatStatusCheck({
					state: status.state === 'INITIATED' ? 0 :
						status.state === 'QUOTED' ? 1 :
						status.state === 'COMMITTED' ? 2 :
						status.state === 'IN_PROGRESS' ? 3 :
						status.state === 'DELIVERED' ? 4 :
						status.state === 'SETTLED' ? 5 :
						status.state === 'DISPUTED' ? 6 : 7,
					canAccept: status.canAccept,
					canComplete: status.canComplete,
					canDispute: status.canDispute,
				})),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Start Work - Provider accepts and starts working
 *
 * Transitions: COMMITTED → IN_PROGRESS (optional state)
 */
export async function handleStartWork(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Transition to IN_PROGRESS
		await client.intermediate.transitionState(parsedTxId, 'IN_PROGRESS');

		// Get updated transaction
		const tx = await client.intermediate.getTransaction(parsedTxId);

		return [
			{
				json: formatSuccess('startWork', {
					transactionId: parsedTxId,
					state: tx?.state || 'IN_PROGRESS',
					message: 'Work started. Remember to mark as delivered when complete.',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Mark Delivered - Provider marks work as complete
 *
 * Transitions: COMMITTED/IN_PROGRESS → DELIVERED
 */
export async function handleMarkDelivered(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Transition to DELIVERED
		await client.intermediate.transitionState(parsedTxId, 'DELIVERED');

		// Get updated transaction
		const tx = await client.intermediate.getTransaction(parsedTxId);

		return [
			{
				json: formatSuccess('markDelivered', {
					transactionId: parsedTxId,
					state: tx?.state || 'DELIVERED',
					message: 'Work delivered. Waiting for requester to release payment or dispute window to expire.',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Release Payment - Requester releases funds to provider
 *
 * Transitions: DELIVERED → SETTLED
 */
export async function handleReleasePayment(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Get transaction to find escrow
		const tx = await client.intermediate.getTransaction(parsedTxId);
		if (!tx) {
			throw new Error(`Transaction ${parsedTxId} not found`);
		}

		// Release escrow (uses txId as escrowId in mock mode)
		await client.intermediate.releaseEscrow(parsedTxId);

		return [
			{
				json: formatSuccess('releasePayment', {
					transactionId: parsedTxId,
					state: 'SETTLED',
					message: 'Payment released to provider. Transaction complete!',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Raise Dispute - Either party raises a dispute
 *
 * Transitions: DELIVERED → DISPUTED
 */
export async function handleRaiseDispute(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const reason = context.getNodeParameter('reason', itemIndex, '') as string;
		const parsedTxId = parseTransactionId(txId);

		// Transition to DISPUTED
		await client.intermediate.transitionState(parsedTxId, 'DISPUTED');

		return [
			{
				json: formatSuccess('raiseDispute', {
					transactionId: parsedTxId,
					state: 'DISPUTED',
					reason: reason || 'No reason provided',
					message: 'Dispute raised. Transaction is now in dispute resolution.',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}

/**
 * Cancel Transaction - Cancel before delivery
 *
 * Transitions: INITIATED/QUOTED/COMMITTED → CANCELLED
 */
export async function handleCancelSimple(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Transition to CANCELLED
		await client.intermediate.transitionState(parsedTxId, 'CANCELLED');

		return [
			{
				json: formatSuccess('cancel', {
					transactionId: parsedTxId,
					state: 'CANCELLED',
					message: 'Transaction cancelled. Funds returned to requester.',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			sanitizeError(error as Error),
			{ itemIndex },
		);
	}
}
