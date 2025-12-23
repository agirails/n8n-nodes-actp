import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * ACTP API Credentials
 *
 * Supports three environments:
 * - Mock: Local testing, no wallet needed
 * - Testnet: Base Sepolia (free test tokens)
 * - Mainnet: Base Mainnet (real USDC)
 */
export class ActpApi implements ICredentialType {
	name = 'actpApi';
	displayName = 'ACTP API';
	documentationUrl = 'https://docs.agirails.io/n8n';

	properties: INodeProperties[] = [
		// Environment selector
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Mock (Testing - No Wallet Needed)',
					value: 'mock',
					description: 'Local simulation for testing workflows. No blockchain, no costs.',
				},
				{
					name: 'Testnet (Base Sepolia)',
					value: 'testnet',
					description: 'Test with real blockchain using free test tokens.',
				},
				{
					name: 'Mainnet (Base - Real Money)',
					value: 'mainnet',
					description: 'Production environment with real USDC payments.',
				},
			],
			default: 'mock',
			description: 'Choose your environment. Start with Mock for testing.',
		},

		// Mock mode: Auto-generated address
		{
			displayName: 'Mock Address',
			name: 'mockAddress',
			type: 'string',
			default: '0x1111111111111111111111111111111111111111',
			placeholder: '0x1111111111111111111111111111111111111111',
			description: 'Your simulated wallet address (auto-generated, can be customized)',
			displayOptions: {
				show: {
					environment: ['mock'],
				},
			},
		},

		// Testnet/Mainnet: Private Key
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: '0x...',
			required: true,
			description: 'Your wallet private key (encrypted by n8n). Never share this!',
			hint: 'Export from MetaMask: Account Details → Export Private Key',
			displayOptions: {
				show: {
					environment: ['testnet', 'mainnet'],
				},
			},
		},

		// Testnet/Mainnet: RPC URL (optional)
		{
			displayName: 'RPC URL (Optional)',
			name: 'rpcUrl',
			type: 'string',
			default: '',
			placeholder: 'https://sepolia.base.org',
			description: 'Custom RPC endpoint. Leave empty to use default.',
			displayOptions: {
				show: {
					environment: ['testnet', 'mainnet'],
				},
			},
		},

		// Mock mode: State directory (advanced)
		{
			displayName: 'State Directory (Advanced)',
			name: 'stateDirectory',
			type: 'string',
			default: '',
			placeholder: '/path/to/project',
			description: 'Directory for mock state file. Leave empty for default.',
			displayOptions: {
				show: {
					environment: ['mock'],
				},
			},
		},
	];

	// Test the credential by checking RPC connectivity (testnet/mainnet only)
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.rpcUrl || ($credentials.environment === "testnet" ? "https://sepolia.base.org" : "https://mainnet.base.org")}}',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 1,
			}),
		},
	};
}
