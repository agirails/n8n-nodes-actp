import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import {
	getActpClient,
	parseTransactionId,
	parseUsdcAmount,
	parseDeadline,
	formatUsdcAmount,
	formatState,
} from './GenericFunctions';
import { State } from '@agirails/sdk';

export class Actp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACTP',
		name: 'actp',
		icon: 'file:actp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with AGIRAILS ACTP (Agent Commerce Transaction Protocol)',
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
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Transaction',
						value: 'createTransaction',
						description: 'Create a new ACTP transaction (requester side)',
						action: 'Create a new transaction',
					},
					{
						name: 'Link Escrow',
						value: 'linkEscrow',
						description: 'Link escrow to transaction and lock funds (requester side)',
						action: 'Link escrow to transaction',
					},
					{
						name: 'Get Transaction',
						value: 'getTransaction',
						description: 'Retrieve transaction details and current state',
						action: 'Get transaction details',
					},
					{
						name: 'Transition State',
						value: 'transitionState',
						description: 'Transition transaction to new state (provider side)',
						action: 'Transition transaction state',
					},
					{
						name: '⚠️ Release Escrow (Legacy)',
						value: 'releaseEscrow',
						description: 'LEGACY: Releases escrow WITHOUT attestation verification. Use "Release With Verification" instead.',
						action: 'Release escrow funds (no verification)',
					},
					{
						name: 'Release With Verification',
						value: 'releaseWithVerification',
						description: 'Atomically verify attestation and release escrow (RECOMMENDED)',
						action: 'Verify and release escrow',
					},
					{
						name: 'Verify Attestation',
						value: 'verifyAttestation',
						description: 'Verify delivery attestation before releasing escrow',
						action: 'Verify delivery attestation',
					},
					{
						name: 'Raise Dispute',
						value: 'raiseDispute',
						description: 'Raise a dispute on delivered transaction',
						action: 'Raise a dispute',
					},
					{
						name: 'Cancel Transaction',
						value: 'cancelTransaction',
						description: 'Cancel transaction before delivery (transitions to CANCELLED state)',
						action: 'Cancel transaction',
					},
				],
				default: 'createTransaction',
			},

			// ============ Create Transaction ============
			{
				displayName: 'Provider Address',
				name: 'provider',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createTransaction'],
					},
				},
				default: '',
				required: true,
				placeholder: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
				description: 'Ethereum address of the service provider (agent)',
			},
			{
				displayName: 'Amount (USDC)',
				name: 'amount',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['createTransaction'],
					},
				},
				default: 10,
				required: true,
				description: 'Transaction amount in USDC (e.g., 10.50)',
				typeOptions: {
					minValue: 0.05,
				},
			},
			{
				displayName: 'Deadline',
				name: 'deadline',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createTransaction'],
					},
				},
				default: '',
				required: true,
				placeholder: '2025-12-31T23:59:59Z or Unix timestamp',
				description: 'Transaction deadline (ISO date string or Unix timestamp in seconds)',
			},
			{
				displayName: 'Dispute Window (Seconds)',
				name: 'disputeWindow',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['createTransaction'],
					},
				},
				default: 172800,
				required: true,
				description: 'Dispute window duration in seconds (default: 172800 = 2 days)',
				typeOptions: {
					minValue: 3600,
					maxValue: 2592000,
				},
			},

			// ============ Link Escrow ============
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'linkEscrow',
							'getTransaction',
							'transitionState',
							'releaseEscrow',
							'releaseWithVerification',
							'verifyAttestation',
							'raiseDispute',
							'cancelTransaction',
						],
					},
				},
				default: '',
				required: true,
				placeholder: '0x1234567890abcdef...',
				description: 'Transaction ID (bytes32 hex string)',
			},
			{
				displayName: 'Escrow Amount (USDC)',
				name: 'escrowAmount',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['linkEscrow'],
					},
				},
				default: 0,
				required: false,
				description: 'Amount to lock in escrow (USDC). If not specified, automatically calculated as transaction amount + 1% fee.',
			},

			// ============ Transition State ============
			{
				displayName: 'Target State',
				name: 'targetState',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['transitionState'],
					},
				},
				options: [
					{
						name: 'Quoted',
						value: State.QUOTED,
						description: 'Provider submitted price quote',
					},
					{
						name: 'In Progress',
						value: State.IN_PROGRESS,
						description: 'Provider actively working on service',
					},
					{
						name: 'Delivered',
						value: State.DELIVERED,
						description: 'Provider delivered result',
					},
				],
				default: State.IN_PROGRESS,
				required: true,
				description: 'Target state to transition to',
			},

			// ============ Raise Dispute ============
			{
				displayName: 'Dispute Reason',
				name: 'disputeReason',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['raiseDispute'],
					},
				},
				default: '',
				required: true,
				typeOptions: {
					rows: 4,
				},
				description: 'Reason for raising the dispute',
			},
			{
				displayName: 'Evidence',
				name: 'evidence',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['raiseDispute'],
					},
				},
				default: '',
				typeOptions: {
					rows: 4,
				},
				description: 'Optional evidence supporting the dispute (e.g., IPFS hash, screenshots)',
			},

			// ============ Attestation UID (for verification operations) ============
			{
				displayName: 'Attestation UID',
				name: 'attestationUID',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['verifyAttestation', 'releaseWithVerification'],
					},
				},
				default: '',
				required: true,
				placeholder: '0xabcdef1234567890...',
				description: 'EAS attestation UID (bytes32 hex string) from provider delivery',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const client = await getActpClient.call(this, i);

				if (operation === 'createTransaction') {
					// ============ Create Transaction ============
					const provider = this.getNodeParameter('provider', i) as string;
					const amount = this.getNodeParameter('amount', i) as number;
					const deadlineInput = this.getNodeParameter('deadline', i) as string;
					const disputeWindow = this.getNodeParameter('disputeWindow', i) as number;

					const deadline = parseDeadline(deadlineInput);
					const amountWei = parseUsdcAmount(amount);

					const requester = await client.getAddress();

					const txId = await client.kernel.createTransaction({
						requester,
						provider,
						amount: amountWei,
						deadline,
						disputeWindow,
					});

					returnData.push({
						json: {
							transactionId: txId,
							requester,
							provider,
							amount: amount.toString(),
							deadline,
							disputeWindow,
							state: 'INITIATED',
							message: 'Transaction created successfully',
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'linkEscrow') {
					// ============ Link Escrow ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);
				let escrowAmount = this.getNodeParameter('escrowAmount', i, 0) as number;
				let amountWei: bigint;

				// Auto-calculate escrow amount if not provided
				if (escrowAmount === 0) {
					// Fetch transaction to get amount
					const tx = await client.kernel.getTransaction(transactionId);
					const fee = tx.amount / BigInt(100); // 1% fee
					amountWei = tx.amount + fee;
					// Convert back to USDC decimal for display
					escrowAmount = Number(amountWei) / 1000000; // USDC has 6 decimals
				} else {
					amountWei = parseUsdcAmount(escrowAmount);
				}

					// Get network config to get USDC address
					const networkConfig = client.getNetworkConfig();

					// Step 1: Approve USDC to escrow vault
					await client.escrow.approveToken(networkConfig.contracts.usdc, amountWei);

					// Step 2: Generate unique escrow ID (bytes32)
					const { id } = await import('ethers');
					const escrowId = id(`escrow-${transactionId}-${Date.now()}`);

					// Step 3: Link escrow (this pulls USDC and transitions to COMMITTED)
					await client.kernel.linkEscrow(
						transactionId,
						networkConfig.contracts.escrowVault,
						escrowId,
					);

					returnData.push({
						json: {
							transactionId,
							escrowId,
							escrowAmount: escrowAmount.toString(),
						autoCalculated: this.getNodeParameter("escrowAmount", i, 0) === 0,
							state: 'COMMITTED',
							message: 'Escrow linked successfully. Transaction moved to COMMITTED state.',
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'getTransaction') {
					// ============ Get Transaction ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);

					const tx = await client.kernel.getTransaction(transactionId);

					returnData.push({
						json: {
							transactionId,
							requester: tx.requester,
							provider: tx.provider,
							amount: formatUsdcAmount(tx.amount),
							state: formatState(tx.state),
							stateValue: tx.state,
							deadline: Number(tx.deadline),
							disputeWindow: Number(tx.disputeWindow),
							createdAt: Number(tx.createdAt),
							escrowContract: tx.escrowContract || null,
							escrowId: tx.escrowId || null,
							metadata: tx.metadata || null,
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'transitionState') {
					// ============ Transition State ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);
					const targetState = this.getNodeParameter('targetState', i) as number;

					await client.kernel.transitionState(transactionId, targetState);

					returnData.push({
						json: {
							transactionId,
							newState: formatState(targetState),
							stateValue: targetState,
							message: `Transaction transitioned to ${formatState(targetState)} successfully`,
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'releaseEscrow') {
					// ============ Release Escrow ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);

					await client.kernel.releaseEscrow(transactionId);

					returnData.push({
						json: {
							transactionId,
							state: 'SETTLED',
							message: 'Escrow released successfully. Transaction settled.',
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'verifyAttestation') {
				// ============ Verify Attestation ============
				const transactionId = parseTransactionId(
					this.getNodeParameter('transactionId', i) as string,
				);
				const attestationUID = this.getNodeParameter('attestationUID', i) as string;

				// Check if EAS is available
				if (!client.eas) {
					throw new NodeOperationError(
						this.getNode(),
						'EAS not configured for this network. Please check SDK configuration.',
						{ itemIndex: i }
					);
				}

				const verified = await client.eas.verifyDeliveryAttestation(transactionId, attestationUID);

				returnData.push({
					json: {
						transactionId,
						attestationUID,
						verified,
						message: verified
							? 'Attestation verified successfully'
							: 'Attestation verification failed',
					},
					pairedItem: { item: i },
				});
			} else if (operation === 'releaseWithVerification') {
				// ============ Release With Verification ============
				const transactionId = parseTransactionId(
					this.getNodeParameter('transactionId', i) as string,
				);
				const attestationUID = this.getNodeParameter('attestationUID', i) as string;

				// Use SDK's atomic verify + release method
				await client.releaseEscrowWithVerification(transactionId, attestationUID);

				returnData.push({
					json: {
						transactionId,
						attestationUID,
						verified: true,
						state: 'SETTLED',
						message: 'Attestation verified and escrow released successfully. Transaction settled.',
					},
					pairedItem: { item: i },
				});
						} else if (operation === 'raiseDispute') {
					// ============ Raise Dispute ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);
					const disputeReason = this.getNodeParameter('disputeReason', i) as string;
					const evidence = this.getNodeParameter('evidence', i, '') as string;

					// SDK raiseDispute expects (txId, reason, evidence) separately
					await client.kernel.raiseDispute(transactionId, disputeReason, evidence);

					returnData.push({
						json: {
							transactionId,
							disputeReason,
							evidence,
							state: 'DISPUTED',
							message: 'Dispute raised successfully',
						},
						pairedItem: { item: i },
					});
				} else if (operation === 'cancelTransaction') {
					// ============ Cancel Transaction ============
					const transactionId = parseTransactionId(
						this.getNodeParameter('transactionId', i) as string,
					);

					// Cancel is done via transitionState to CANCELLED
					await client.kernel.transitionState(transactionId, State.CANCELLED);

					returnData.push({
						json: {
							transactionId,
							state: 'CANCELLED',
							message: 'Transaction cancelled successfully',
						},
						pairedItem: { item: i },
					});
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							operation,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
