/**
 * Advanced Mode Field Descriptions
 *
 * Full protocol control for power users.
 */

import type { INodeProperties } from 'n8n-workflow';
import {
	transactionIdField,
	amountField,
	deadlineField,
	disputeWindowField,
	escrowIdField,
} from './common.fields';

/**
 * Advanced mode operation selector
 */
export const advancedOperationField: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			mode: ['advanced'],
		},
	},
	options: [
		// === Transaction Lifecycle ===
		{
			name: 'Create Transaction',
			value: 'createTransaction',
			description: 'Create a transaction (INITIATED state, no escrow)',
			action: 'Create a transaction',
		},
		{
			name: 'Link Escrow',
			value: 'linkEscrow',
			description: 'Fund transaction with escrow (auto-transitions to COMMITTED)',
			action: 'Link escrow to transaction',
		},
		{
			name: 'Transition State',
			value: 'transitionState',
			description: 'Manually transition transaction state',
			action: 'Transition transaction state',
		},
		// === Escrow Operations ===
		{
			name: 'Release Escrow',
			value: 'releaseEscrow',
			description: 'Release escrow funds to provider',
			action: 'Release escrow',
		},
		{
			name: 'Get Escrow Balance',
			value: 'getEscrowBalance',
			description: 'Check escrow balance',
			action: 'Get escrow balance',
		},
		// === Query Operations ===
		{
			name: 'Get Transaction',
			value: 'getTransaction',
			description: 'Get full transaction details',
			action: 'Get transaction details',
		},
		// === Cancel ===
		{
			name: 'Cancel',
			value: 'cancelAdvanced',
			description: 'Cancel transaction (before DELIVERED)',
			action: 'Cancel transaction',
		},
	],
	default: 'createTransaction',
};

/**
 * Create Transaction fields
 */
export const createTransactionFields: INodeProperties[] = [
	{
		displayName: 'Provider Address',
		name: 'provider',
		type: 'string',
		required: true,
		default: '',
		placeholder: '0x...',
		description: 'Service provider wallet address',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['createTransaction'],
			},
		},
	},
	{
		...amountField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['createTransaction'],
			},
		},
	},
	{
		...deadlineField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['createTransaction'],
			},
		},
	},
	{
		...disputeWindowField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['createTransaction'],
			},
		},
	},
	{
		displayName: 'Service Description',
		name: 'serviceDescription',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'Describe the service...',
		description: 'Optional description of the service being purchased',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['createTransaction'],
			},
		},
	},
];

/**
 * Link Escrow fields
 */
export const linkEscrowFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['linkEscrow'],
			},
		},
	},
];

/**
 * Transition State fields
 */
export const transitionStateFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['transitionState'],
			},
		},
	},
	{
		displayName: 'New State',
		name: 'newState',
		type: 'options',
		required: true,
		options: [
			{
				name: 'QUOTED',
				value: 'QUOTED',
				description: 'Provider submitted price quote',
			},
			{
				name: 'COMMITTED',
				value: 'COMMITTED',
				description: 'Escrow linked, work can begin',
			},
			{
				name: 'IN_PROGRESS',
				value: 'IN_PROGRESS',
				description: 'Provider is working on service',
			},
			{
				name: 'DELIVERED',
				value: 'DELIVERED',
				description: 'Work completed and delivered',
			},
			{
				name: 'DISPUTED',
				value: 'DISPUTED',
				description: 'Dispute raised',
			},
			{
				name: 'CANCELLED',
				value: 'CANCELLED',
				description: 'Transaction cancelled',
			},
		],
		default: 'DELIVERED',
		description: 'Target state for the transition',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['transitionState'],
			},
		},
	},
];

/**
 * Release Escrow fields
 */
export const releaseEscrowFields: INodeProperties[] = [
	{
		...escrowIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['releaseEscrow'],
			},
		},
	},
	{
		displayName: 'Attestation UID',
		name: 'attestationUID',
		type: 'string',
		required: false,
		default: '',
		placeholder: '0x...',
		description:
			'EAS attestation UID for delivery proof (required on testnet/mainnet, optional for mock)',
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['releaseEscrow'],
			},
		},
	},
];

/**
 * Get Escrow Balance fields
 */
export const getEscrowBalanceFields: INodeProperties[] = [
	{
		...escrowIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['getEscrowBalance'],
			},
		},
	},
];

/**
 * Get Transaction fields
 */
export const getTransactionFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['getTransaction'],
			},
		},
	},
];

/**
 * Cancel fields (Advanced mode)
 */
export const cancelAdvancedFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['advanced'],
				operation: ['cancelAdvanced'],
			},
		},
	},
];

/**
 * All Advanced mode fields combined
 */
export const advancedFields: INodeProperties[] = [
	advancedOperationField,
	...createTransactionFields,
	...linkEscrowFields,
	...transitionStateFields,
	...releaseEscrowFields,
	...getEscrowBalanceFields,
	...getTransactionFields,
	...cancelAdvancedFields,
];
