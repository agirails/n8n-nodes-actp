/**
 * ERC-8004 Field Descriptions
 *
 * Agent identity resolution and reputation reporting.
 * Simple mode: lookupAgent (quick identity check)
 * Advanced mode: resolveAgent, verifyAgent, reportReputation, getReputation
 */

import type { INodeProperties } from 'n8n-workflow';

/**
 * Reusable Agent ID field (base definition, displayOptions overridden per operation)
 */
const agentIdBase: INodeProperties = {
	displayName: 'Agent ID',
	name: 'agentId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '12345',
	description: 'ERC-8004 agent ID (numeric)',
};

/**
 * Lookup Agent fields (Simple mode)
 */
export const lookupAgentFields: INodeProperties[] = [
	{
		...agentIdBase,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['lookupAgent'],
			},
		},
	},
];

/**
 * Resolve Agent fields (Advanced mode)
 */
export const resolveAgentFields: INodeProperties[] = [
	{
		...agentIdBase,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['resolveAgent'],
			},
		},
	},
];

/**
 * Verify Agent fields (Advanced mode)
 */
export const verifyAgentFields: INodeProperties[] = [
	{
		...agentIdBase,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['verifyAgent'],
			},
		},
	},
];

/**
 * Report Reputation fields (Advanced mode)
 */
export const reportReputationFields: INodeProperties[] = [
	{
		...agentIdBase,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
			},
		},
	},
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '0x...',
		description: 'ACTP transaction ID (used for replay protection)',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
			},
		},
	},
	{
		displayName: 'Report Type',
		name: 'reportType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Settlement (Positive)',
				value: 'settlement',
				description: 'Report successful settlement',
			},
			{
				name: 'Dispute',
				value: 'dispute',
				description: 'Report dispute outcome',
			},
		],
		default: 'settlement',
		description: 'Type of reputation report',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
			},
		},
	},
	{
		displayName: 'Capability',
		name: 'capability',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'code_review',
		description: 'Service capability tag (e.g., code_review, translation)',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
			},
		},
	},
	{
		displayName: 'Agent Won Dispute',
		name: 'agentWon',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the agent won the dispute',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
				reportType: ['dispute'],
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'Describe the dispute outcome...',
		description: 'Dispute details or feedback',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['reportReputation'],
				reportType: ['dispute'],
			},
		},
	},
];

/**
 * Get Reputation fields (Advanced mode)
 */
export const getReputationFields: INodeProperties[] = [
	{
		...agentIdBase,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['getReputation'],
			},
		},
	},
	{
		displayName: 'Capability Filter',
		name: 'capability',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'code_review',
		description: 'Filter by capability tag (optional)',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['getReputation'],
			},
		},
	},
];
