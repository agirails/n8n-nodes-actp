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
		'n8n-nodes-base/node-param-operation-option-action-miscased': 'warn',
		'n8n-nodes-base/node-param-display-name-miscased': 'warn',
		'n8n-nodes-base/node-param-description-boolean-without-whether': 'warn',
	},
};
