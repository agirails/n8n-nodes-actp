/**
 * ACTP Node - Agent Commerce Transaction Protocol for n8n
 *
 * Add payment rails to any n8n workflow.
 * Supports Mock (testing), Testnet (Base Sepolia), and Mainnet (Base).
 *
 * Features:
 * - Simple mode: Easy operations for common payment flows
 * - Advanced mode: Full protocol control for power users
 * - Flexible inputs: Human-friendly amount, deadline, and address parsing
 * - Rich outputs: Formatted data with raw values for chaining
 *
 * @packageDocumentation
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ACTPClient } from '@agirails/sdk';

// Import field descriptions
import { modeField, simpleFields, advancedFields } from './descriptions';

// Import handlers
import {
	// Simple mode
	handleSendPayment,
	handleCheckStatus,
	handleStartWork,
	handleMarkDelivered,
	handleReleasePayment,
	handleRaiseDispute,
	handleCancelSimple,
	// Advanced mode
	handleCreateTransaction,
	handleLinkEscrow,
	handleTransitionState,
	handleReleaseEscrow,
	handleGetTransaction,
	handleGetEscrowBalance,
	handleCancelAdvanced,
} from './handlers';

// Import utilities
import { createActpClient, sanitizeError } from './utils';

/**
 * Execute Simple mode operation
 */
async function executeSimpleOperation(
	context: IExecuteFunctions,
	client: ACTPClient,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'sendPayment':
			return handleSendPayment(context, client, itemIndex);

		case 'checkStatus':
			return handleCheckStatus(context, client, itemIndex);

		case 'startWork':
			return handleStartWork(context, client, itemIndex);

		case 'markDelivered':
			return handleMarkDelivered(context, client, itemIndex);

		case 'releasePayment':
			return handleReleasePayment(context, client, itemIndex);

		case 'raiseDispute':
			return handleRaiseDispute(context, client, itemIndex);

		case 'cancel':
			return handleCancelSimple(context, client, itemIndex);

		default:
			throw new NodeOperationError(
				context.getNode(),
				`Unknown Simple mode operation: ${operation}`,
				{ itemIndex },
			);
	}
}

/**
 * Execute Advanced mode operation
 */
async function executeAdvancedOperation(
	context: IExecuteFunctions,
	client: ACTPClient,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'createTransaction':
			return handleCreateTransaction(context, client, itemIndex);

		case 'linkEscrow':
			return handleLinkEscrow(context, client, itemIndex);

		case 'transitionState':
			return handleTransitionState(context, client, itemIndex);

		case 'releaseEscrow':
			return handleReleaseEscrow(context, client, itemIndex);

		case 'getTransaction':
			return handleGetTransaction(context, client, itemIndex);

		case 'getEscrowBalance':
			return handleGetEscrowBalance(context, client, itemIndex);

		case 'cancelAdvanced':
			return handleCancelAdvanced(context, client, itemIndex);

		default:
			throw new NodeOperationError(
				context.getNode(),
				`Unknown Advanced mode operation: ${operation}`,
				{ itemIndex },
			);
	}
}

/**
 * ACTP Node Implementation
 *
 * Main n8n node class that orchestrates all ACTP operations.
 */
export class Actp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACTP',
		name: 'actp',
		icon: 'file:actp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Add payment rails to your workflow with AGIRAILS ACTP',
		defaults: {
			name: 'ACTP',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'actpApi',
				required: true,
			},
		],
		properties: [
			// Mode selector (Simple vs Advanced)
			modeField,

			// Simple mode operations and fields
			...simpleFields,

			// Advanced mode operations and fields
			...advancedFields,
		],
	};

	/**
	 * Execute the node
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get mode and operation
		const mode = this.getNodeParameter('mode', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				// Create ACTP client from credentials
				const client = await createActpClient(this, i);

				// Get operation for this item
				const operation = this.getNodeParameter('operation', i) as string;

				let result: INodeExecutionData[];

				// Route to appropriate handler based on mode and operation
				if (mode === 'simple') {
					result = await executeSimpleOperation(this, client, operation, i);
				} else {
					result = await executeAdvancedOperation(this, client, operation, i);
				}

				returnData.push(...result);
			} catch (error) {
				// Handle errors with item context
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: sanitizeError(error as Error),
							itemIndex: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
