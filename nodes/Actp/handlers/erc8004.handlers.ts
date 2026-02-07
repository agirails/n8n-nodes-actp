/**
 * ERC-8004 Handlers
 *
 * Agent identity resolution and reputation reporting.
 * Requires testnet or mainnet (not available in mock mode).
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ACTPClient } from '@agirails/sdk';
import { ERC8004Bridge, ReputationReporter } from '@agirails/sdk';
import { Wallet as EthersWallet, JsonRpcProvider } from 'ethers';
import {
	formatSuccess,
	sanitizeError,
	executeSDKOperation,
} from '../utils';

/**
 * Map ACTPClient mode to ERC-8004 network identifier
 */
function getERC8004Network(mode: string): 'base-sepolia' | 'base' {
	if (mode === 'testnet') return 'base-sepolia';
	if (mode === 'mainnet') return 'base';
	throw new Error(
		'ERC-8004 operations require testnet or mainnet. Switch your ACTP credentials to testnet to test.',
	);
}

/**
 * Bridge cache (keyed by network:rpcUrl)
 */
const bridgeCache = new Map<string, ERC8004Bridge>();

/**
 * Get or create a cached ERC8004Bridge
 */
async function getOrCreateBridge(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<ERC8004Bridge> {
	const network = getERC8004Network(client.info.mode);
	const credentials = await context.getCredentials('actpApi', itemIndex);
	const rpcUrl = (credentials.rpcUrl as string) || undefined;
	const cacheKey = `${network}:${rpcUrl || 'default'}`;

	if (bridgeCache.has(cacheKey)) {
		return bridgeCache.get(cacheKey)!;
	}

	const bridge = new ERC8004Bridge({ network, rpcUrl });
	bridgeCache.set(cacheKey, bridge);
	return bridge;
}

/**
 * Create a ReputationReporter (requires signer for write operations)
 */
async function createReporter(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<ReputationReporter> {
	const network = getERC8004Network(client.info.mode);
	const credentials = await context.getCredentials('actpApi', itemIndex);
	const privateKey = credentials.privateKey as string;

	if (!privateKey) {
		throw new Error('Reputation operations require a private key (testnet/mainnet)');
	}

	const rpcUrl = (credentials.rpcUrl as string) || undefined;
	const defaultRpc =
		network === 'base-sepolia' ? 'https://sepolia.base.org' : 'https://mainnet.base.org';
	const provider = new JsonRpcProvider(rpcUrl || defaultRpc);
	const signer = new EthersWallet(privateKey, provider);

	// Cast signer to avoid cross-dependency ethers type mismatch (npm link)
	return new ReputationReporter({ network, signer: signer as any });
}

/**
 * Lookup Agent (Simple mode)
 *
 * Quick agent identity check. Returns wallet address, owner, and metadata.
 */
export async function handleLookupAgent(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const agentId = context.getNodeParameter('agentId', itemIndex) as string;
		const bridge = await getOrCreateBridge(context, client, itemIndex);

		const agent = await executeSDKOperation(
			() => bridge.resolveAgent(agentId),
			'lookupAgent',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('lookupAgent', {
					agentId: agent.agentId,
					owner: agent.owner,
					wallet: agent.wallet,
					agentURI: agent.agentURI,
					metadata: (agent.metadata as IDataObject) || undefined,
					network: agent.network,
					message: `Agent ${agentId} found. Payment wallet: ${agent.wallet}`,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}

/**
 * Resolve Agent (Advanced mode)
 *
 * Full agent identity resolution with all metadata.
 */
export async function handleResolveAgent(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const agentId = context.getNodeParameter('agentId', itemIndex) as string;
		const bridge = await getOrCreateBridge(context, client, itemIndex);

		const agent = await executeSDKOperation(
			() => bridge.resolveAgent(agentId),
			'resolveAgent',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('resolveAgent', {
					agentId: agent.agentId,
					owner: agent.owner,
					wallet: agent.wallet,
					agentURI: agent.agentURI,
					metadata: (agent.metadata as IDataObject) || undefined,
					network: agent.network,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}

/**
 * Verify Agent (Advanced mode)
 *
 * Check if an agent exists on-chain. Returns boolean + wallet if found.
 */
export async function handleVerifyAgent(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const agentId = context.getNodeParameter('agentId', itemIndex) as string;
		const bridge = await getOrCreateBridge(context, client, itemIndex);

		const exists = await executeSDKOperation(
			() => bridge.verifyAgent(agentId),
			'verifyAgent',
			context,
			itemIndex,
		);

		let wallet: string | undefined;
		if (exists) {
			try {
				wallet = await bridge.getAgentWallet(agentId);
			} catch {
				// Agent exists but wallet lookup failed — not critical
			}
		}

		return [
			{
				json: formatSuccess('verifyAgent', {
					agentId,
					exists,
					wallet: wallet || undefined,
					message: exists
						? `Agent ${agentId} verified on-chain.`
						: `Agent ${agentId} not found.`,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}

/**
 * Report Reputation (Advanced mode)
 *
 * Report settlement or dispute outcome to the ERC-8004 reputation registry.
 * Pays gas. Never blocks settlement flow — failures return submitted: false.
 */
export async function handleReportReputation(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const agentId = context.getNodeParameter('agentId', itemIndex) as string;
		const txId = context.getNodeParameter('transactionId', itemIndex) as string;
		const reportType = context.getNodeParameter('reportType', itemIndex) as string;
		const capability = context.getNodeParameter('capability', itemIndex, '') as string;

		const reporter = await createReporter(context, client, itemIndex);

		let result;
		if (reportType === 'settlement') {
			result = await executeSDKOperation(
				() =>
					reporter.reportSettlement({
						agentId,
						txId,
						capability: capability || undefined,
					}),
				'reportReputation',
				context,
				itemIndex,
			);
		} else {
			const agentWon = context.getNodeParameter('agentWon', itemIndex) as boolean;
			const reason = context.getNodeParameter('reason', itemIndex, '') as string;

			result = await executeSDKOperation(
				() =>
					reporter.reportDispute({
						agentId,
						txId,
						agentWon,
						capability: capability || undefined,
						reason: reason || undefined,
					}),
				'reportReputation',
				context,
				itemIndex,
			);
		}

		return [
			{
				json: formatSuccess('reportReputation', {
					agentId,
					transactionId: txId,
					reportType,
					txHash: result?.txHash || undefined,
					blockNumber: result?.blockNumber || undefined,
					gasUsed: result?.gasUsed?.toString() || undefined,
					submitted: result !== null,
					message: result
						? `Reputation ${reportType} reported. TX: ${result.txHash}`
						: 'Reputation report failed (non-critical).',
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}

/**
 * Get Reputation (Advanced mode)
 *
 * Query an agent's reputation score from the ERC-8004 registry.
 * Read-only (no gas cost), but still requires signer for SDK instantiation.
 */
export async function handleGetReputation(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		const agentId = context.getNodeParameter('agentId', itemIndex) as string;
		const capability = context.getNodeParameter('capability', itemIndex, '') as string;

		const reporter = await createReporter(context, client, itemIndex);

		const reputation = await executeSDKOperation(
			() => reporter.getAgentReputation(agentId, capability || undefined),
			'getReputation',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('getReputation', {
					agentId,
					capability: capability || 'all',
					count: reputation?.count ?? 0,
					score: reputation?.score ?? 0,
					message: reputation
						? `Agent ${agentId}: ${reputation.count} reports, score ${reputation.score}`
						: `No reputation data for agent ${agentId}.`,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}
