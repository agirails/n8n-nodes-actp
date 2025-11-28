module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint'],
	extends: ['plugin:n8n-nodes-base/community'],
	rules: {
		// Stricter rules for publishing
		'n8n-nodes-base/node-param-operation-option-action-miscased': 'error',
		'n8n-nodes-base/node-param-display-name-miscased': 'error',
		'n8n-nodes-base/node-param-description-boolean-without-whether': 'error',
		'n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options': 'error',
		'n8n-nodes-base/node-param-description-missing-final-period': 'error',
	},
};
