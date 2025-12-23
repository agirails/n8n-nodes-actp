/**
 * Common Field Definitions
 *
 * Shared fields used across multiple operations.
 */

import type { INodeProperties } from 'n8n-workflow';

/**
 * Mode selector (Simple vs Advanced)
 */
export const modeField: INodeProperties = {
	displayName: 'Mode',
	name: 'mode',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Simple',
			value: 'simple',
			description: 'Easy-to-use operations for common payment flows',
		},
		{
			name: 'Advanced',
			value: 'advanced',
			description: 'Full control over ACTP protocol operations',
		},
	],
	default: 'simple',
	description: 'Choose Simple for ease-of-use or Advanced for full protocol control',
};

/**
 * Transaction ID field (reusable)
 */
export const transactionIdField: INodeProperties = {
	displayName: 'Transaction ID',
	name: 'transactionId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '0x...',
	description: 'The 66-character transaction ID (0x + 64 hex characters)',
};

/**
 * Amount field (user-friendly parsing)
 */
export const amountField: INodeProperties = {
	displayName: 'Amount (USDC)',
	name: 'amount',
	type: 'string',
	required: true,
	default: '',
	placeholder: '100',
	description: 'Amount in USDC. Supports formats: "100", "100.50", "$100"',
};

/**
 * Deadline field (flexible parsing)
 */
export const deadlineField: INodeProperties = {
	displayName: 'Deadline',
	name: 'deadline',
	type: 'string',
	required: false,
	default: '24',
	placeholder: '24 (hours) or +24h or +7d',
	description:
		'When the transaction expires. Accepts hours (24), relative time (+24h, +7d), ISO date, or Unix timestamp. Default: 24 hours',
};

/**
 * Dispute window field
 */
export const disputeWindowField: INodeProperties = {
	displayName: 'Dispute Window',
	name: 'disputeWindow',
	type: 'string',
	required: false,
	default: '2d',
	placeholder: '2d or 48h or 172800',
	description:
		'Time after delivery when disputes can be raised. Accepts: "2d", "48h", or seconds (172800). Default: 2 days',
};

/**
 * Escrow ID field
 */
export const escrowIdField: INodeProperties = {
	displayName: 'Escrow ID',
	name: 'escrowId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '0x...',
	description: 'The escrow identifier (usually same as transaction ID)',
};
