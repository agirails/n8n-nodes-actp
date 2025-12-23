/**
 * ACTP Node Field Descriptions
 *
 * Exports all field definitions for the n8n UI.
 */

export { modeField } from './common.fields';
export { simpleFields, simpleOperationField } from './simple.description';
export { advancedFields, advancedOperationField } from './advanced.description';

// Re-export individual field groups for flexibility
export * from './common.fields';
export * from './simple.description';
export * from './advanced.description';
