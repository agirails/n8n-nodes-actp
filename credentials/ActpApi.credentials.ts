import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ActpApi implements ICredentialType {
	name = 'actpApi';
	displayName = 'ACTP API';
	documentationUrl = 'https://docs.agirails.io/sdk';
	properties: INodeProperties[] = [
		{
			displayName: 'Network',
			name: 'network',
			type: 'options',
			options: [
				{
					name: 'Base Sepolia (Testnet)',
					value: 'base-sepolia',
				},
				{
					name: 'Base Mainnet',
					value: 'base-mainnet',
				},
			],
			default: 'base-sepolia',
			description: 'Select the blockchain network to connect to',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Ethereum wallet private key (0x... format) for signing transactions',
			placeholder: '0x1234567890abcdef...',
		},
		{
			displayName: 'RPC URL',
			name: 'rpcUrl',
			type: 'string',
			default: '',
			placeholder: 'https://sepolia.base.org',
			description: 'Optional: Custom RPC endpoint URL. Leave empty to use default network RPC.',
		},
	];

	// Authenticate is not used for this credential type
	// Authentication happens via SDK initialization with privateKey
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.rpcUrl || "https://sepolia.base.org"}}',
			url: '',
			method: 'POST',
			body: {
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 1,
			},
			headers: {
				'Content-Type': 'application/json',
			},
		},
	};
}
