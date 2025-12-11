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
	sanitizeError,
	validateEthereumAddress,
} from './GenericFunctions';
import { State } from '@agirails/sdk';

// Import descriptions
import {
	transactionOperations,
	transactionFields,
	escrowOperations,
	escrowFields,
	registryOperations,
	registryFields,
	didOperations,
	didFields,
	storageOperations,
	storageFields,
} from './descriptions';

export class Actp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACTP',
		name: 'actp',
		icon: 'file:actp.svg',
		group: ['transform'],
		version: 2,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'AGIRAILS ACTP - Agent Commerce Transaction Protocol (AIP-7)',
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
			{
				name: 'actpStorage',
				required: false,
				displayOptions: {
					show: {
						resource: ['storage'],
					},
				},
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Transaction',
						value: 'transaction',
						description: 'Core transaction lifecycle operations',
					},
					{
						name: 'Escrow',
						value: 'escrow',
						description: 'Fund management and release operations',
					},
					{
						name: 'Agent Registry',
						value: 'registry',
						description: 'Agent identity, services, and reputation (AIP-7)',
					},
					{
						name: 'DID',
						value: 'did',
						description: 'Decentralized Identity operations (AIP-7)',
					},
					{
						name: 'Storage',
						value: 'storage',
						description: 'IPFS storage via Filebase (AIP-7)',
					},
				],
				default: 'transaction',
			},
			// Operations and fields for each resource
			...transactionOperations,
			...transactionFields,
			...escrowOperations,
			...escrowFields,
			...registryOperations,
			...registryFields,
			...didOperations,
			...didFields,
			...storageOperations,
			...storageFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				// Route to appropriate handler
				let result: any;

				switch (resource) {
					case 'transaction':
						result = await handleTransaction.call(this, i, operation);
						break;
					case 'escrow':
						result = await handleEscrow.call(this, i, operation);
						break;
					case 'registry':
						result = await handleRegistry.call(this, i, operation);
						break;
					case 'did':
						result = await handleDID.call(this, i, operation);
						break;
					case 'storage':
						result = await handleStorage.call(this, i, operation);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				returnData.push({
					json: result,
					pairedItem: { item: i },
				});
			} catch (error: any) {
				// Sanitize error to prevent private key exposure
				const sanitizedMessage = sanitizeError(error);

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: sanitizedMessage,
							resource,
							operation,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), sanitizedMessage, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

// ========== TRANSACTION HANDLERS ==========

async function handleTransaction(this: IExecuteFunctions, i: number, operation: string): Promise<any> {
	const client = await getActpClient.call(this, i);

	switch (operation) {
		case 'create': {
			const providerInput = this.getNodeParameter('provider', i) as string;
			const amount = this.getNodeParameter('amount', i) as number;
			const deadlineInput = this.getNodeParameter('deadline', i) as string;
			const disputeWindow = this.getNodeParameter('disputeWindow', i) as number;

			// Validate provider address
			const provider = validateEthereumAddress(providerInput, 'provider');

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

			return {
				transactionId: txId,
				requester,
				provider,
				amount: amount.toString(),
				deadline,
				disputeWindow,
				state: 'INITIATED',
				message: 'Transaction created successfully',
			};
		}

		case 'get': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			const tx = await client.kernel.getTransaction(transactionId);

			return {
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
			};
		}

		case 'transitionState': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			const targetState = this.getNodeParameter('targetState', i) as number;

			await client.kernel.transitionState(transactionId, targetState);

			return {
				transactionId,
				newState: formatState(targetState),
				stateValue: targetState,
				message: `Transaction transitioned to ${formatState(targetState)} successfully`,
			};
		}

		case 'raiseDispute': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			const disputeReason = this.getNodeParameter('disputeReason', i) as string;
			const evidence = this.getNodeParameter('evidence', i, '') as string;

			await client.kernel.raiseDispute(transactionId, disputeReason, evidence);

			return {
				transactionId,
				disputeReason,
				evidence,
				state: 'DISPUTED',
				message: 'Dispute raised successfully',
			};
		}

		case 'cancel': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);

			await client.kernel.transitionState(transactionId, State.CANCELLED);

			return {
				transactionId,
				state: 'CANCELLED',
				message: 'Transaction cancelled successfully',
			};
		}

		default:
			throw new Error(`Unknown transaction operation: ${operation}`);
	}
}

// ========== ESCROW HANDLERS ==========

async function handleEscrow(this: IExecuteFunctions, i: number, operation: string): Promise<any> {
	const client = await getActpClient.call(this, i);

	switch (operation) {
		case 'link': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			let escrowAmount = this.getNodeParameter('escrowAmount', i, 0) as number;
			let amountWei: bigint;

			// Auto-calculate escrow amount if not provided
			if (escrowAmount === 0) {
				const tx = await client.kernel.getTransaction(transactionId);
				// 1% fee = 100 basis points out of 10000, with ceiling division
				// Formula: ceil(amount * 100 / 10000) = (amount * 100 + 9999) / 10000
				const FEE_BPS = BigInt(100); // 1% = 100 basis points
				const BPS_DIVISOR = BigInt(10000);
				const fee = (tx.amount * FEE_BPS + BPS_DIVISOR - BigInt(1)) / BPS_DIVISOR;
				amountWei = tx.amount + fee;
				escrowAmount = Number(amountWei) / 1000000;
			} else {
				amountWei = parseUsdcAmount(escrowAmount);
			}

			const networkConfig = client.getNetworkConfig();

			// Step 1: Approve USDC to escrow vault
			await client.escrow.approveToken(networkConfig.contracts.usdc, amountWei);

			// Step 2: Generate unique escrow ID
			const { id } = await import('ethers');
			const escrowId = id(`escrow-${transactionId}-${Date.now()}`);

			// Step 3: Link escrow
			await client.kernel.linkEscrow(
				transactionId,
				networkConfig.contracts.escrowVault,
				escrowId,
			);

			return {
				transactionId,
				escrowId,
				escrowAmount: escrowAmount.toString(),
				autoCalculated: this.getNodeParameter('escrowAmount', i, 0) === 0,
				state: 'COMMITTED',
				message: 'Escrow linked successfully. Transaction moved to COMMITTED state.',
			};
		}

		case 'releaseWithVerification': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			const attestationUID = this.getNodeParameter('attestationUID', i) as string;

			await client.releaseEscrowWithVerification(transactionId, attestationUID);

			return {
				transactionId,
				attestationUID,
				verified: true,
				state: 'SETTLED',
				message: 'Attestation verified and escrow released successfully. Transaction settled.',
			};
		}

		case 'verifyAttestation': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);
			const attestationUID = this.getNodeParameter('attestationUID', i) as string;

			if (!client.eas) {
				throw new Error('EAS not configured for this network. Please check SDK configuration.');
			}

			const verified = await client.eas.verifyDeliveryAttestation(transactionId, attestationUID);

			return {
				transactionId,
				attestationUID,
				verified,
				message: verified ? 'Attestation verified successfully' : 'Attestation verification failed',
			};
		}

		case 'releaseLegacy': {
			const transactionId = parseTransactionId(this.getNodeParameter('transactionId', i) as string);

			await client.kernel.releaseEscrow(transactionId);

			return {
				transactionId,
				state: 'SETTLED',
				message: 'Escrow released successfully (legacy mode, no verification). Transaction settled.',
			};
		}

		default:
			throw new Error(`Unknown escrow operation: ${operation}`);
	}
}

// ========== REGISTRY HANDLERS (AIP-7) ==========

async function handleRegistry(this: IExecuteFunctions, i: number, operation: string): Promise<any> {
	const client = await getActpClient.call(this, i);

	// Registry module may not be available if contract not deployed or SDK not updated
	const registry = (client as any).registry;
	if (!registry) {
		throw new Error('Agent Registry not available. The AgentRegistry contract may not be deployed on this network yet, or the SDK needs to be updated to a version that includes AIP-7 support.');
	}

	switch (operation) {
		case 'registerAgent': {
			const endpoint = this.getNodeParameter('endpoint', i) as string;
			const serviceDescriptorsInput = this.getNodeParameter('serviceDescriptors', i) as {
				services?: Array<{
					serviceType: string;
					schemaURI?: string;
					minPrice: number;
					maxPrice: number;
					avgCompletionTime: number;
					metadataCID?: string;
				}>;
			};

			const services = serviceDescriptorsInput.services || [];

			if (services.length === 0) {
				throw new Error('At least one service descriptor is required');
			}

			// Build service descriptors with computed hashes
			const serviceDescriptors = services.map((s) => ({
				serviceTypeHash: registry.computeServiceTypeHash(s.serviceType),
				serviceType: s.serviceType,
				schemaURI: s.schemaURI || '',
				minPrice: parseUsdcAmount(s.minPrice),
				maxPrice: parseUsdcAmount(s.maxPrice),
				avgCompletionTime: s.avgCompletionTime,
				metadataCID: s.metadataCID || '',
			}));

			const txHash = await registry.registerAgent({
				endpoint,
				serviceDescriptors,
			});

			return {
				txHash,
				endpoint,
				servicesRegistered: services.length,
				message: 'Agent registered successfully',
			};
		}

		case 'getAgent': {
			const agentAddressInput = this.getNodeParameter('agentAddress', i) as string;
			// Validate agent address
			const agentAddress = validateEthereumAddress(agentAddressInput, 'agentAddress');
			const profile = await registry.getAgent(agentAddress);

			if (!profile) {
				return {
					agentAddress,
					found: false,
					message: 'Agent not registered',
				};
			}

			return {
				found: true,
				agentAddress: profile.agentAddress,
				did: profile.did,
				endpoint: profile.endpoint,
				serviceTypes: profile.serviceTypes,
				reputationScore: profile.reputationScore,
				totalTransactions: profile.totalTransactions,
				disputedTransactions: profile.disputedTransactions,
				totalVolumeUSDC: formatUsdcAmount(profile.totalVolumeUSDC),
				isActive: profile.isActive,
				registeredAt: profile.registeredAt,
				updatedAt: profile.updatedAt,
			};
		}

		case 'getAgentByDID': {
			const did = this.getNodeParameter('did', i) as string;
			const profile = await registry.getAgentByDID(did);

			if (!profile) {
				return {
					did,
					found: false,
					message: 'Agent not found for this DID',
				};
			}

			return {
				found: true,
				agentAddress: profile.agentAddress,
				did: profile.did,
				endpoint: profile.endpoint,
				serviceTypes: profile.serviceTypes,
				reputationScore: profile.reputationScore,
				totalTransactions: profile.totalTransactions,
				disputedTransactions: profile.disputedTransactions,
				totalVolumeUSDC: formatUsdcAmount(profile.totalVolumeUSDC),
				isActive: profile.isActive,
				registeredAt: profile.registeredAt,
				updatedAt: profile.updatedAt,
			};
		}

		case 'queryAgents': {
			const serviceType = this.getNodeParameter('serviceType', i) as string;
			const minReputation = this.getNodeParameter('minReputation', i, 0) as number;
			const limit = this.getNodeParameter('limit', i, 100) as number;
			const offset = this.getNodeParameter('offset', i, 0) as number;

			const serviceTypeHash = registry.computeServiceTypeHash(serviceType);

			const agents = await registry.queryAgentsByService({
				serviceTypeHash,
				minReputation,
				limit,
				offset,
			});

			return {
				serviceType,
				serviceTypeHash,
				minReputation,
				count: agents.length,
				agents,
				hasMore: agents.length === limit,
			};
		}

		case 'getServiceDescriptors': {
			const agentAddressInput = this.getNodeParameter('agentAddress', i) as string;
			// Validate agent address
			const agentAddress = validateEthereumAddress(agentAddressInput, 'agentAddress');
			const descriptors = await registry.getServiceDescriptors(agentAddress);

			return {
				agentAddress,
				count: descriptors.length,
				services: descriptors.map((d: any) => ({
					serviceType: d.serviceType,
					serviceTypeHash: d.serviceTypeHash,
					schemaURI: d.schemaURI,
					minPrice: formatUsdcAmount(d.minPrice),
					maxPrice: formatUsdcAmount(d.maxPrice),
					avgCompletionTime: d.avgCompletionTime,
					metadataCID: d.metadataCID,
				})),
			};
		}

		case 'updateEndpoint': {
			const endpoint = this.getNodeParameter('endpoint', i) as string;
			const txHash = await registry.updateEndpoint(endpoint);

			return {
				txHash,
				newEndpoint: endpoint,
				message: 'Endpoint updated successfully',
			};
		}

		case 'addServiceType': {
			const serviceType = this.getNodeParameter('serviceType', i) as string;
			const txHash = await registry.addServiceType(serviceType);
			const serviceTypeHash = registry.computeServiceTypeHash(serviceType);

			return {
				txHash,
				serviceType,
				serviceTypeHash,
				message: 'Service type added successfully',
			};
		}

		case 'removeServiceType': {
			const serviceTypeHash = this.getNodeParameter('serviceTypeHash', i) as string;
			const txHash = await registry.removeServiceType(serviceTypeHash);

			return {
				txHash,
				serviceTypeHash,
				message: 'Service type removed successfully',
			};
		}

		case 'setActiveStatus': {
			const isActive = this.getNodeParameter('isActive', i) as boolean;
			const txHash = await registry.setActiveStatus(isActive);

			return {
				txHash,
				isActive,
				message: isActive ? 'Agent is now active' : 'Agent is now inactive',
			};
		}

		case 'computeServiceTypeHash': {
			const serviceType = this.getNodeParameter('serviceType', i) as string;
			const hash = registry.computeServiceTypeHash(serviceType);

			return {
				serviceType,
				serviceTypeHash: hash,
			};
		}

		case 'buildDID': {
			const agentAddressInput = this.getNodeParameter('agentAddress', i) as string;
			// Validate agent address
			const agentAddress = validateEthereumAddress(agentAddressInput, 'agentAddress');
			const did = await registry.buildDID(agentAddress);

			return {
				address: agentAddress,
				did,
			};
		}

		default:
			throw new Error(`Unknown registry operation: ${operation}`);
	}
}

// ========== DID HANDLERS (AIP-7) ==========

async function handleDID(this: IExecuteFunctions, i: number, operation: string): Promise<any> {
	// Try to dynamically import DIDResolver
	let DIDResolver: any;
	try {
		const sdk = await import('@agirails/sdk');
		DIDResolver = (sdk as any).DIDResolver;
		if (!DIDResolver) {
			throw new Error('DIDResolver not found in SDK');
		}
	} catch (error) {
		throw new Error('DID operations require SDK version with AIP-7 support. Please update @agirails/sdk to the latest version.');
	}

	const credentials = await this.getCredentials('actpApi', i);
	const network = credentials.network as 'base-sepolia' | 'base-mainnet';

	// Create DID resolver
	const resolver = await DIDResolver.create({ network });

	switch (operation) {
		case 'resolve': {
			const did = this.getNodeParameter('did', i) as string;
			const result = await resolver.resolve(did);

			return {
				did,
				resolved: result.didDocument !== null,
				didDocument: result.didDocument,
				didResolutionMetadata: result.didResolutionMetadata,
				didDocumentMetadata: result.didDocumentMetadata,
			};
		}

		case 'verifySignature': {
			const did = this.getNodeParameter('did', i) as string;
			const message = this.getNodeParameter('message', i) as string;
			const signature = this.getNodeParameter('signature', i) as string;
			const useDomainSeparation = this.getNodeParameter('useDomainSeparation', i, true) as boolean;
			const timestamp = this.getNodeParameter('timestamp', i, 0) as number;

			const chainId = DIDResolver.extractChainId(did);

			const result = await resolver.verifySignature(did, message, signature, {
				chainId,
				useDomainSeparation,
				timestamp: timestamp > 0 ? timestamp : undefined,
			});

			return {
				did,
				valid: result.valid,
				signer: result.signer,
				isDelegate: result.isDelegate,
				delegateType: result.delegateType,
				error: result.error,
			};
		}

		case 'buildDID': {
			const addressInput = this.getNodeParameter('address', i) as string;
			const chainId = this.getNodeParameter('chainId', i) as number;

			// Validate address
			const address = validateEthereumAddress(addressInput, 'address');

			const did = DIDResolver.buildDID(address, chainId);

			return {
				address,
				chainId,
				did,
			};
		}

		case 'parseDID': {
			const did = this.getNodeParameter('did', i) as string;
			const parsed = DIDResolver.parseDID(did);

			return {
				did,
				method: parsed.method,
				chainId: parsed.chainId,
				address: parsed.address,
			};
		}

		case 'validateDID': {
			const did = this.getNodeParameter('did', i) as string;
			const isValid = DIDResolver.isValidDID(did);

			return {
				did,
				valid: isValid,
			};
		}

		case 'extractAddress': {
			const did = this.getNodeParameter('did', i) as string;
			const address = DIDResolver.extractAddress(did);

			return {
				did,
				address,
			};
		}

		case 'extractChainId': {
			const did = this.getNodeParameter('did', i) as string;
			const chainId = DIDResolver.extractChainId(did);

			return {
				did,
				chainId,
			};
		}

		default:
			throw new Error(`Unknown DID operation: ${operation}`);
	}
}

// ========== STORAGE HANDLERS (AIP-7) ==========

async function handleStorage(this: IExecuteFunctions, i: number, operation: string): Promise<any> {
	// Try to dynamically import FilebaseClient
	let FilebaseClient: any;
	try {
		const sdk = await import('@agirails/sdk');
		FilebaseClient = (sdk as any).FilebaseClient;
		if (!FilebaseClient) {
			throw new Error('FilebaseClient not found in SDK');
		}
	} catch (error) {
		throw new Error('Storage operations require SDK version with AIP-7 support. Please update @agirails/sdk to the latest version.');
	}

	const credentials = await this.getCredentials('actpStorage', i);

	const accessKeyId = credentials.accessKeyId as string;
	const secretAccessKey = credentials.secretAccessKey as string;
	const bucketName = credentials.bucketName as string | undefined;
	const maxUploadSize = credentials.maxUploadSize as number | undefined;

	if (!accessKeyId || !secretAccessKey) {
		throw new Error('Filebase credentials (accessKeyId and secretAccessKey) are required for storage operations');
	}

	const filebaseClient = new FilebaseClient({
		accessKeyId,
		secretAccessKey,
		bucketName: bucketName || undefined,
		maxUploadSize: maxUploadSize ? maxUploadSize * 1024 * 1024 : undefined,
	});

	switch (operation) {
		case 'uploadJSON': {
			const jsonDataString = this.getNodeParameter('jsonData', i) as string;
			const filename = this.getNodeParameter('filename', i, '') as string;

			// Parse JSON string to object
			let jsonData: any;
			try {
				jsonData = JSON.parse(jsonDataString);
			} catch (error) {
				throw new Error(`Invalid JSON data: ${error instanceof Error ? error.message : String(error)}`);
			}

			const result = await filebaseClient.uploadJSON(jsonData, filename || undefined);

			return {
				cid: result.cid,
				size: result.size,
				uploadedAt: result.uploadedAt,
				ipfsUrl: `https://ipfs.filebase.io/ipfs/${result.cid}`,
				message: 'JSON uploaded to IPFS successfully',
			};
		}

		case 'downloadJSON': {
			const cid = this.getNodeParameter('cid', i) as string;
			const data = await filebaseClient.downloadJSON(cid);

			return {
				cid,
				data,
				ipfsUrl: `https://ipfs.filebase.io/ipfs/${cid}`,
			};
		}

		case 'exists': {
			const cid = this.getNodeParameter('cid', i) as string;
			const exists = await filebaseClient.exists(cid);

			return {
				cid,
				exists,
				ipfsUrl: exists ? `https://ipfs.filebase.io/ipfs/${cid}` : null,
			};
		}

		case 'validateCID': {
			const cid = this.getNodeParameter('cid', i) as string;
			const result = filebaseClient.validateCID(cid);

			return {
				cid,
				valid: result.valid,
				version: result.version,
				error: result.error,
			};
		}

		default:
			throw new Error(`Unknown storage operation: ${operation}`);
	}
}
