/**
 * Advanced Mode Operation Handlers
 *
 * Full control over the ACTP protocol using IntermediateAdapter API.
 * For users who need fine-grained control over the transaction lifecycle.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ACTPClient } from '@agirails/sdk';
import {
	parseDeadline,
	parseDisputeWindow,
	parseAddress,
	parseTransactionId,
	formatTransactionAdvanced,
	formatSuccess,
	sanitizeError,
	stateStringToNumber,
	getTransactionOrThrow,
	executeSDKOperation,
	validateTransitionState,
} from '../utils';

/**
 * Create Transaction - Create without funding
 *
 * Creates a transaction in INITIATED state.
 * Must call linkEscrow separately to fund.
 */
export async function handleCreateTransaction(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const provider = context.getNodeParameter('provider', itemIndex) as string;
		const amount = context.getNodeParameter('amount', itemIndex) as string | number;
		const deadlineInput = context.getNodeParameter('deadline', itemIndex, 24) as string | number;
		const disputeWindowInput = context.getNodeParameter('disputeWindow', itemIndex, '2d') as
			| string
			| number;
		const serviceDescription = context.getNodeParameter(
			'serviceDescription',
			itemIndex,
			'',
		) as string;

		// Parse and validate
		const parsedProvider = parseAddress(provider, 'Provider address');
		const parsedDeadline = parseDeadline(deadlineInput);
		const parsedDisputeWindow = parseDisputeWindow(disputeWindowInput);

		// Create transaction with timeout and retry protection
		const txId = await executeSDKOperation(
			() => client.intermediate.createTransaction({
				provider: parsedProvider,
				amount,
				deadline: parsedDeadline,
				disputeWindow: parsedDisputeWindow,
				serviceDescription: serviceDescription || undefined,
			}),
			'createTransaction',
			context,
			itemIndex,
		);

		// Get created transaction
		const tx = await getTransactionOrThrow(client, txId, context, itemIndex);

		return [
			{
				json: formatSuccess('createTransaction', {
					transactionId: txId,
					state: tx.state,
					provider: parsedProvider,
					amount: typeof amount === 'number' ? `$${amount} USDC` : amount,
					deadline: new Date(parsedDeadline * 1000).toISOString(),
					disputeWindow: parsedDisputeWindow,
					serviceDescription: serviceDescription || undefined,
					message: 'Transaction created. Call Link Escrow to fund it.',
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
 * Link Escrow - Fund a transaction
 *
 * Automatically transitions INITIATED → COMMITTED.
 * Locks funds in escrow.
 */
export async function handleLinkEscrow(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Link escrow with timeout and retry protection
		const escrowId = await executeSDKOperation(
			() => client.intermediate.linkEscrow(parsedTxId),
			'linkEscrow',
			context,
			itemIndex,
		);

		// Get updated transaction
		const tx = await getTransactionOrThrow(client, parsedTxId, context, itemIndex);

		return [
			{
				json: formatSuccess('linkEscrow', {
					transactionId: parsedTxId,
					escrowId,
					state: tx.state,
					message: 'Escrow linked. Funds are now locked. Provider can start work.',
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
 * Transition State - Manually change transaction state
 *
 * Valid transitions are enforced by the protocol.
 */
export async function handleTransitionState(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const newState = context.getNodeParameter('newState', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Validate state is a valid transition target (fixes type safety - no more `as any`)
		const validatedState = validateTransitionState(newState, context, itemIndex);

		// Get current state for context
		const txBefore = await getTransactionOrThrow(client, parsedTxId, context, itemIndex);
		const stateBefore = txBefore.state;

		// Transition state with timeout and retry protection
		await executeSDKOperation(
			() => client.intermediate.transitionState(parsedTxId, validatedState),
			'transitionState',
			context,
			itemIndex,
		);

		// Get updated transaction
		const txAfter = await getTransactionOrThrow(client, parsedTxId, context, itemIndex);

		return [
			{
				json: formatSuccess('transitionState', {
					transactionId: parsedTxId,
					previousState: stateBefore,
					newState: txAfter.state,
					message: `State transitioned from ${stateBefore} to ${txAfter.state}.`,
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
 * Release Escrow - Release funds to provider
 *
 * Can only be called when transaction is DELIVERED
 * and dispute window has expired.
 */
export async function handleReleaseEscrow(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const escrowId = context.getNodeParameter('escrowId', itemIndex) as string;
		const attestationUID = context.getNodeParameter('attestationUID', itemIndex, '') as string;

		// Build attestation params if provided
		const attestationParams = attestationUID
			? { txId: escrowId, attestationUID }
			: undefined;

		// Release escrow with timeout and retry protection
		await executeSDKOperation(
			() => client.intermediate.releaseEscrow(escrowId, attestationParams),
			'releaseEscrow',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('releaseEscrow', {
					escrowId,
					state: 'SETTLED',
					message: 'Escrow released. Funds transferred to provider.',
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
 * Get Transaction - Retrieve transaction details
 */
export async function handleGetTransaction(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Use helper that includes timeout protection and null check
		const tx = await getTransactionOrThrow(client, parsedTxId, context, itemIndex);

		return [
			{
				json: formatSuccess(
					'getTransaction',
					formatTransactionAdvanced({
						transactionId: parsedTxId,
						state: stateStringToNumber(tx.state),
						amount: BigInt(tx.amount),
						requester: tx.requester,
						provider: tx.provider,
						deadline: tx.deadline,
						disputeWindow: tx.disputeWindow,
						createdAt: tx.createdAt ?? undefined,
						updatedAt: tx.updatedAt ?? undefined,
						escrowId: tx.escrowId ?? undefined,
					}),
				),
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
 * Get Escrow Balance - Check escrow balance
 */
export async function handleGetEscrowBalance(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const escrowId = context.getNodeParameter('escrowId', itemIndex) as string;

		// Get escrow balance with timeout and retry protection
		const balance = await executeSDKOperation(
			() => client.intermediate.getEscrowBalance(escrowId),
			'getEscrowBalance',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('getEscrowBalance', {
					escrowId,
					balance,
					message: `Escrow balance: ${balance}`,
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
 * Cancel Transaction - Cancel in advanced mode
 *
 * Same as simple mode but with full output.
 */
export async function handleCancelAdvanced(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const parsedTxId = parseTransactionId(txId);

		// Get state before (with timeout protection and null check)
		const txBefore = await getTransactionOrThrow(client, parsedTxId, context, itemIndex);
		const stateBefore = txBefore.state;

		// Transition to CANCELLED with timeout and retry protection
		await executeSDKOperation(
			() => client.intermediate.transitionState(parsedTxId, 'CANCELLED'),
			'transitionState',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('cancel', {
					transactionId: parsedTxId,
					previousState: stateBefore,
					newState: 'CANCELLED',
					message: 'Transaction cancelled. Escrow funds returned to requester.',
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
