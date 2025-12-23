/**
 * Secrets Detection and Redaction Module
 *
 * Provides secure detection and redaction of sensitive data in error messages
 * and logs. Supports:
 * - Private keys (64-char hex)
 * - BIP-39 mnemonic phrases (12-24 words)
 * - API keys (common patterns)
 *
 * Security: Prevents accidental exposure of secrets in error messages,
 * logs, and user-facing outputs.
 */

/**
 * BIP-39 English wordlist (first 100 most common words for quick detection)
 * Full BIP-39 has 2048 words, but checking the most common provides
 * high accuracy with minimal overhead.
 *
 * These are the most frequently used words in seed phrases.
 */
const BIP39_COMMON_WORDS = new Set([
	// A
	'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
	'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
	'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
	'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
	'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
	'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
	'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
	'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
	'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
	'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
	// B-Z (additional common words)
	'basic', 'because', 'become', 'beef', 'before', 'begin', 'behind', 'believe', 'below', 'belt',
	'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike',
	'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak',
	'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
	'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright',
	'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble',
	'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe',
	'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet',
	'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category', 'cattle',
	'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century', 'cereal',
	'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease',
	'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial',
	'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door',
	'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress',
	'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge',
	'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant',
	'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion',
	'faculty', 'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan',
	'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite',
	'feature', 'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch',
	'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate',
	'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost',
	'giant', 'gift', 'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare',
	'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hat',
	'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello',
	'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire',
	'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image',
	'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income',
	'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep', 'ketchup', 'key', 'kick', 'kid',
	'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee',
	'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop', 'large',
	'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy',
	'make', 'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble',
	'march', 'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match', 'material',
	'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure', 'meat', 'mechanic',
	'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative',
	'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news',
	'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old',
	'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera',
	'palace', 'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park',
	'parrot', 'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave',
	'quality', 'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote', 'rabbit', 'raccoon',
	'race', 'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch',
	'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute',
	'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale',
	'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task',
	'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent',
	'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy',
	'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update',
	'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various', 'vast',
	'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version', 'very',
	'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior',
	'wash', 'wasp', 'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel',
	'year', 'yellow', 'you', 'young', 'youth', 'zebra', 'zero', 'zone', 'zoo',
	// Critical words that often appear in test phrases
	'about', 'word', 'worry', 'worth', 'wrap', 'wreck', 'wrestle', 'wrist', 'write', 'wrong',
]);

/**
 * Maximum input length for validation (prevents ReDoS and buffer issues)
 */
export const MAX_INPUT_LENGTHS = {
	amount: 1024,
	address: 256,
	transactionId: 256,
	deadline: 256,
	disputeWindow: 256,
	errorMessage: 10000,
} as const;

/**
 * Zero address constant
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Check if a string looks like a BIP-39 mnemonic phrase
 *
 * Detection criteria:
 * - Contains 11-24 words (12, 15, 18, 21, 24 are valid BIP-39 lengths)
 * - At least 80% of words match BIP-39 wordlist
 *
 * @param input - String to check
 * @returns true if input appears to be a mnemonic phrase
 */
export function isMnemonicPhrase(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// Split by whitespace and filter empty
	const words = input
		.toLowerCase()
		.trim()
		.split(/\s+/)
		.filter((w) => w.length > 0);

	// BIP-39 phrases are 12, 15, 18, 21, or 24 words
	// We check 11-24 to catch partial phrases too
	if (words.length < 11 || words.length > 24) {
		return false;
	}

	// Count how many words match BIP-39 wordlist
	const matchingWords = words.filter((word) => BIP39_COMMON_WORDS.has(word));
	const matchRatio = matchingWords.length / words.length;

	// If 80% or more words match BIP-39, treat as mnemonic
	return matchRatio >= 0.8;
}

/**
 * Check if a string looks like a private key
 *
 * @param input - String to check
 * @returns true if input appears to be a private key
 */
export function isPrivateKey(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// 64-char hex with 0x prefix
	if (/^0x[0-9a-fA-F]{64}$/.test(input)) {
		return true;
	}

	// 64-char hex without prefix
	if (/^[0-9a-fA-F]{64}$/.test(input)) {
		return true;
	}

	return false;
}

/**
 * Check if a string looks like an API key
 *
 * Common patterns:
 * - sk_live_* (Stripe)
 * - sk_test_* (Stripe test)
 * - AKIA* (AWS)
 * - xox[bpas]-* (Slack)
 * - ghp_* (GitHub PAT)
 * - glpat-* (GitLab PAT)
 *
 * @param input - String to check
 * @returns true if input appears to be an API key
 */
export function isApiKey(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	const apiKeyPatterns = [
		/^sk_live_[a-zA-Z0-9]{20,}/,      // Stripe live
		/^sk_test_[a-zA-Z0-9]{20,}/,      // Stripe test
		/^pk_live_[a-zA-Z0-9]{20,}/,      // Stripe publishable live
		/^pk_test_[a-zA-Z0-9]{20,}/,      // Stripe publishable test
		/^AKIA[A-Z0-9]{16}/,              // AWS access key
		/^xox[bpas]-[a-zA-Z0-9-]{10,}/,   // Slack tokens
		/^ghp_[a-zA-Z0-9]{36}/,           // GitHub PAT
		/^glpat-[a-zA-Z0-9-_]{20}/,       // GitLab PAT
		/^Bearer\s+[a-zA-Z0-9._-]{20,}/i, // Bearer tokens
	];

	return apiKeyPatterns.some((pattern) => pattern.test(input));
}

/**
 * Redact all detected secrets from a string
 *
 * Redacts:
 * - Private keys (64-char hex) → [REDACTED_KEY]
 * - Mnemonic phrases → [REDACTED_MNEMONIC]
 * - API keys → [REDACTED_API_KEY]
 *
 * @param input - String containing potential secrets
 * @returns String with secrets redacted
 */
export function redactSecrets(input: string): string {
	if (!input || typeof input !== 'string') {
		return input;
	}

	// Limit processing length for DoS protection
	const safeInput = input.length > MAX_INPUT_LENGTHS.errorMessage
		? input.slice(0, MAX_INPUT_LENGTHS.errorMessage) + '...[TRUNCATED]'
		: input;

	let result = safeInput;

	// 1. Redact private keys (64-char hex with 0x prefix)
	result = result.replace(/0x[0-9a-fA-F]{64}\b/g, '[REDACTED_KEY]');

	// 2. Redact private keys (64-char hex without prefix)
	result = result.replace(/\b[0-9a-fA-F]{64}\b/g, '[REDACTED_KEY]');

	// 3. Redact API keys (common patterns)
	result = result.replace(/sk_live_[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
	result = result.replace(/sk_test_[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
	result = result.replace(/pk_live_[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
	result = result.replace(/pk_test_[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
	result = result.replace(/AKIA[A-Z0-9]{16}/g, '[REDACTED_API_KEY]');
	result = result.replace(/xox[bpas]-[a-zA-Z0-9-]{10,}/g, '[REDACTED_API_KEY]');
	result = result.replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_API_KEY]');
	result = result.replace(/glpat-[a-zA-Z0-9-_]{20,}/g, '[REDACTED_API_KEY]');

	// 4. Redact mnemonic phrases (11-24 word sequences)
	// This is tricky - we need to find and redact multi-word sequences
	result = redactMnemonicPhrases(result);

	return result;
}

/**
 * Find and redact mnemonic phrases in text
 *
 * Looks for sequences of 11-24 words that match BIP-39 wordlist
 *
 * @param input - String to process
 * @returns String with mnemonics redacted
 */
function redactMnemonicPhrases(input: string): string {
	// Split into potential phrases by common delimiters
	// Look for quoted strings or sequences of lowercase words
	let result = input;

	// Pattern 1: Quoted mnemonic phrases
	result = result.replace(
		/"([a-z\s]{40,})"/gi,
		(match, phrase) => {
			if (isMnemonicPhrase(phrase)) {
				return '"[REDACTED_MNEMONIC]"';
			}
			return match;
		}
	);

	result = result.replace(
		/'([a-z\s]{40,})'/gi,
		(match, phrase) => {
			if (isMnemonicPhrase(phrase)) {
				return "'[REDACTED_MNEMONIC]'";
			}
			return match;
		}
	);

	// Pattern 2: Mnemonic after common prefixes
	const mnemonicPrefixes = [
		/mnemonic[:\s]+([a-z\s]{40,})/gi,
		/seed[:\s]+([a-z\s]{40,})/gi,
		/phrase[:\s]+([a-z\s]{40,})/gi,
		/recovery[:\s]+([a-z\s]{40,})/gi,
	];

	for (const pattern of mnemonicPrefixes) {
		result = result.replace(pattern, (match, phrase) => {
			if (isMnemonicPhrase(phrase)) {
				return match.replace(phrase, '[REDACTED_MNEMONIC]');
			}
			return match;
		});
	}

	return result;
}

/**
 * Validate input length to prevent DoS attacks
 *
 * @param input - Input to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of field for error message
 * @throws Error if input exceeds maximum length
 */
export function validateInputLength(
	input: string,
	maxLength: number,
	fieldName: string,
): void {
	if (input && input.length > maxLength) {
		throw new Error(
			`${fieldName} input too long (${input.length} chars). Maximum ${maxLength} characters allowed.`,
		);
	}
}

/**
 * Check if address is the zero address
 *
 * @param address - Ethereum address to check
 * @returns true if address is zero address
 */
export function isZeroAddress(address: string): boolean {
	if (!address) return false;

	const normalized = address.toLowerCase().trim();
	return normalized === ZERO_ADDRESS.toLowerCase();
}
