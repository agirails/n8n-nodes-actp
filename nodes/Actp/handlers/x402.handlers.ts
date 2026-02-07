/**
 * x402 Payment Handlers
 *
 * Atomic HTTP payments via the x402 protocol.
 * Requires testnet or mainnet (not available in mock mode).
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ACTPClient } from '@agirails/sdk';
import {
	formatSuccess,
	sanitizeError,
	executeSDKOperation,
} from '../utils';

/**
 * Validate that the client is not in mock mode (x402 requires real blockchain)
 */
function requireBlockchainMode(client: ACTPClient): void {
	if (client.info.mode === 'mock') {
		throw new Error(
			'x402 payments require testnet or mainnet. Switch your ACTP credentials to testnet to test with free tokens.',
		);
	}
}

/**
 * Validate HTTPS URL for x402
 */
function validateX402Url(url: string): void {
	if (!url.startsWith('https://')) {
		throw new Error('URL must use HTTPS for x402 payments');
	}
}

/**
 * Paid HTTP Request (Simple mode)
 *
 * Makes an HTTP request to a paid endpoint using x402 protocol.
 * The SDK automatically handles the 402 handshake:
 *   1. Request → 402 Payment Required
 *   2. Parse payment headers → USDC transfer
 *   3. Retry with payment proof → Get response
 */
export async function handlePaidHttpRequest(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		requireBlockchainMode(client);

		const url = context.getNodeParameter('url', itemIndex) as string;
		const amount = context.getNodeParameter('amount', itemIndex) as string | number;

		validateX402Url(url);

		const result = await executeSDKOperation(
			() =>
				client.basic.pay({
					to: url,
					amount,
				}),
			'paidHttpRequest',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('paidHttpRequest', {
					url,
					state: result.state,
					amount: result.amount,
					txHash: (result as any).txHash || undefined,
					response: (result as any).data || undefined,
					message: `Payment sent. Response received from ${url}.`,
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
 * x402 Pay (Advanced mode)
 *
 * Full x402 payment with HTTP method, headers, and body control.
 */
export async function handleX402Pay(
	context: IExecuteFunctions,
	client: ACTPClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		requireBlockchainMode(client);

		const url = context.getNodeParameter('url', itemIndex) as string;
		const amount = context.getNodeParameter('amount', itemIndex) as string | number;
		const httpMethod = context.getNodeParameter('httpMethod', itemIndex, 'GET') as string;
		const headersInput = context.getNodeParameter('headers', itemIndex, '') as string;
		const bodyInput = context.getNodeParameter('body', itemIndex, '') as string;

		validateX402Url(url);

		// Parse headers JSON
		let headers: Record<string, string> | undefined;
		if (headersInput) {
			try {
				headers = JSON.parse(headersInput);
			} catch {
				throw new Error('Headers must be a valid JSON object');
			}
		}

		// Parse body (try JSON, fall back to raw string)
		let body: string | Record<string, unknown> | undefined;
		if (bodyInput) {
			try {
				body = JSON.parse(bodyInput);
			} catch {
				body = bodyInput;
			}
		}

		// Pass x402-specific fields through to the adapter
		const payParams: any = {
			to: url,
			amount,
			method: httpMethod,
			headers,
			body,
		};

		const result = await executeSDKOperation(
			() => client.basic.pay(payParams),
			'x402Pay',
			context,
			itemIndex,
		);

		return [
			{
				json: formatSuccess('x402Pay', {
					url,
					method: httpMethod,
					state: result.state,
					amount: result.amount,
					txHash: (result as any).txHash || undefined,
					response: (result as any).data || undefined,
					message: `x402 ${httpMethod} ${url} completed.`,
				} as IDataObject),
			},
		];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), sanitizeError(error as Error), {
			itemIndex,
		});
	}
}
