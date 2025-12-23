/**
 * Simple Mode Field Descriptions
 *
 * User-friendly operations for common payment flows.
 */

import type { INodeProperties } from 'n8n-workflow';
import {
	transactionIdField,
	amountField,
	deadlineField,
	disputeWindowField,
} from './common.fields';

/**
 * Simple mode operation selector
 */
export const simpleOperationField: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			mode: ['simple'],
		},
	},
	options: [
		// === Requester Operations ===
		{
			name: 'Send Payment',
			value: 'sendPayment',
			description: 'Create a payment and fund escrow in one step',
			action: 'Send a payment',
		},
		{
			name: 'Check Status',
			value: 'checkStatus',
			description: 'Get transaction status and available actions',
			action: 'Check transaction status',
		},
		{
			name: 'Release Payment',
			value: 'releasePayment',
			description: 'Release escrowed funds to the provider',
			action: 'Release payment to provider',
		},
		{
			name: 'Raise Dispute',
			value: 'raiseDispute',
			description: 'Dispute a delivered transaction',
			action: 'Raise a dispute',
		},
		{
			name: 'Cancel',
			value: 'cancel',
			description: 'Cancel transaction before delivery',
			action: 'Cancel transaction',
		},
		// === Provider Operations ===
		{
			name: 'Start Work',
			value: 'startWork',
			description: 'Provider: Mark that you have started working',
			action: 'Start work on transaction',
		},
		{
			name: 'Mark Delivered',
			value: 'markDelivered',
			description: 'Provider: Mark work as complete/delivered',
			action: 'Mark as delivered',
		},
	],
	default: 'sendPayment',
};

/**
 * Send Payment fields
 */
export const sendPaymentFields: INodeProperties[] = [
	{
		displayName: 'Recipient Address',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: '0x...',
		description: 'Provider wallet address to receive payment',
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['sendPayment'],
			},
		},
	},
	{
		...amountField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['sendPayment'],
			},
		},
	},
	{
		...deadlineField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['sendPayment'],
			},
		},
	},
	{
		...disputeWindowField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['sendPayment'],
			},
		},
	},
];

/**
 * Check Status fields
 */
export const checkStatusFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['checkStatus'],
			},
		},
	},
];

/**
 * Start Work fields
 */
export const startWorkFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['startWork'],
			},
		},
	},
];

/**
 * Mark Delivered fields
 */
export const markDeliveredFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['markDelivered'],
			},
		},
	},
];

/**
 * Release Payment fields
 */
export const releasePaymentFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['releasePayment'],
			},
		},
	},
];

/**
 * Raise Dispute fields
 */
export const raiseDisputeFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['raiseDispute'],
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'Describe the issue...',
		description: 'Optional reason for the dispute',
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['raiseDispute'],
			},
		},
	},
];

/**
 * Cancel fields (Simple mode)
 */
export const cancelSimpleFields: INodeProperties[] = [
	{
		...transactionIdField,
		displayOptions: {
			show: {
				mode: ['simple'],
				operation: ['cancel'],
			},
		},
	},
];

/**
 * All Simple mode fields combined
 */
export const simpleFields: INodeProperties[] = [
	simpleOperationField,
	...sendPaymentFields,
	...checkStatusFields,
	...startWorkFields,
	...markDeliveredFields,
	...releasePaymentFields,
	...raiseDisputeFields,
	...cancelSimpleFields,
];
