# Development Guide

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Project
```bash
npm run build
```

### 3. Development Mode (Watch)
```bash
npm run dev
```

## Project Structure

```
n8n-nodes-actp/
├── credentials/
│   └── ActpApi.credentials.ts      # ACTP credentials definition
├── nodes/
│   └── Actp/
│       ├── Actp.node.ts             # Main node logic
│       ├── GenericFunctions.ts      # Helper functions
│       └── actp.svg                 # Node icon
├── dist/                            # Build output (auto-generated)
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript config
└── gulpfile.js                      # Build scripts
```

## Development Workflow

### 1. Make Changes
Edit files in `credentials/` or `nodes/` directories.

### 2. Build
```bash
npm run build
```

### 3. Link to n8n
```bash
# In n8n-nodes-actp directory
npm link

# In n8n installation directory or custom nodes directory
npm link n8n-nodes-actp

# Restart n8n
n8n start
```

### 4. Test
See [TESTING.md](./TESTING.md) for comprehensive testing procedures.

## Code Style

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

### Pre-Publish Check
```bash
npm run lintfix
```

## Adding New Operations

### 1. Add Operation to Node Description

Edit `nodes/Actp/Actp.node.ts`:

```typescript
{
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	options: [
		// ... existing operations
		{
			name: 'My New Operation',
			value: 'myNewOperation',
			description: 'Description of what it does',
			action: 'Perform my new operation',
		},
	],
}
```

### 2. Add Operation Parameters

```typescript
{
	displayName: 'Parameter Name',
	name: 'parameterName',
	type: 'string',
	displayOptions: {
		show: {
			operation: ['myNewOperation'],
		},
	},
	default: '',
	required: true,
	description: 'Parameter description',
},
```

### 3. Implement Operation Logic

```typescript
if (operation === 'myNewOperation') {
	const param = this.getNodeParameter('parameterName', i) as string;

	const result = await client.kernel.myMethod(param);

	returnData.push({
		json: {
			result,
			message: 'Operation completed successfully',
		},
		pairedItem: { item: i },
	});
}
```

### 4. Add Helper Function (if needed)

Edit `nodes/Actp/GenericFunctions.ts`:

```typescript
export function myHelper(input: string): string {
	// ... processing
	return result;
}
```

### 5. Update Documentation

- Add to [README.md](./README.md) operations list
- Add example workflow
- Update [CHANGELOG.md](./CHANGELOG.md)

## SDK Updates

When `@agirails/sdk` is updated:

### 1. Update Dependency
```bash
npm update @agirails/sdk
```

### 2. Check Breaking Changes
Review SDK changelog and adjust node logic if needed.

### 3. Test All Operations
Run full test suite (see [TESTING.md](./TESTING.md)).

### 4. Update Version
```bash
npm version patch  # or minor/major
```

## Common Issues

### "Cannot find module 'n8n-workflow'"
**Solution**: Install n8n-workflow as peer dependency:
```bash
npm install n8n-workflow@latest
```

### "Module build failed"
**Solution**: Clean and rebuild:
```bash
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

### "Node not showing in n8n"
**Solution**:
1. Check `package.json` n8n section
2. Verify `dist/` contains compiled files
3. Restart n8n completely
4. Clear browser cache

### TypeScript Errors
**Solution**: Check TypeScript version compatibility:
```bash
npm install typescript@latest --save-dev
```

## Debugging

### Enable Debug Logging in n8n
```bash
export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console
n8n start
```

### Debug Node Execution
Add console.log statements:
```typescript
console.log('Debug:', JSON.stringify(data, null, 2));
```

### Check Node Output
In n8n GUI:
1. Execute workflow
2. Click on node
3. View "OUTPUT" tab
4. Check error messages in "ERROR" tab

## Publishing

### Pre-Publish Checklist
- [ ] All tests passing
- [ ] Linting clean
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Version bumped

### Publish to npm
```bash
# 1. Build
npm run build

# 2. Run tests (if available)
npm test

# 3. Version bump
npm version patch  # 1.0.0 → 1.0.1
# or
npm version minor  # 1.0.0 → 1.1.0
# or
npm version major  # 1.0.0 → 2.0.0

# 4. Publish
npm publish --access public

# 5. Push tags
git push --follow-tags
```

### Submit to n8n Community
1. Fork [n8n-io/n8n-nodes-registry](https://github.com/n8n-io/n8n-nodes-registry)
2. Add node to `nodes.json`
3. Create PR with screenshots
4. Wait for review

## Resources

- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [AGIRAILS SDK](https://github.com/agirails/sdk-js)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
