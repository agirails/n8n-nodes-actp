/**
 * x402 Payment Field Descriptions
 *
 * Atomic HTTP payments via the x402 protocol.
 * Simple mode: paidHttpRequest (URL + amount)
 * Advanced mode: x402Pay (full control with method, headers, body)
 */

import type { INodeProperties } from 'n8n-workflow';
import { amountField } from './common.fields';

/**
 * Paid HTTP Request fields (Simple mode)
 */
export const paidHttpRequestFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://api.example.com/service',
		description:
			'HTTPS endpoint that supports x402 payments. The SDK handles the 402 handshake automatically.',
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['paidHttpRequest'],
			},
		},
	},
	{
		...amountField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['paidHttpRequest'],
			},
		},
	},
];

/**
 * x402 Pay fields (Advanced mode)
 */
export const x402PayFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://api.example.com/service',
		description: 'HTTPS endpoint that supports x402 payment protocol',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['x402Pay'],
			},
		},
	},
	{
		...amountField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['x402Pay'],
			},
		},
	},
	{
		displayName: 'HTTP Method',
		name: 'httpMethod',
		type: 'options',
		required: false,
		options: [
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'PATCH', value: 'PATCH' },
		],
		default: 'GET',
		description: 'HTTP method for the request',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['x402Pay'],
			},
		},
	},
	{
		displayName: 'Headers (JSON)',
		name: 'headers',
		type: 'string',
		required: false,
		default: '',
		placeholder: '{"Authorization": "Bearer token"}',
		description: 'Request headers as JSON object',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['x402Pay'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: false,
		default: '',
		placeholder: '{"key": "value"}',
		description: 'Request body (for POST/PUT/PATCH)',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['x402Pay'],
			},
		},
	},
];
