import { MAX_GENERATED_LENGTH } from './types.ts';
import type {
  GeneratedPasswordResult,
  GeneratorOptions,
  RandomSource
} from './types.ts';

export const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
export const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NUMBER_CHARS = '0123456789';
export const SYMBOL_CHARS = '!@#$%^&*()-_=+[]{}|;:,.<>?/~';
export const AMBIGUOUS_CHARS: ReadonlySet<string> = new Set([
  '0',
  'O',
  'o',
  '1',
  'l',
  'I',
  '|'
]);

const UINT32_RANGE = 0x1_0000_0000;

function assertRandomSource(rng: RandomSource | undefined): RandomSource {
  if (rng === undefined || rng === null || typeof rng.getRandomValues !== 'function') {
    throw new Error('Cryptographically secure random generator (crypto.getRandomValues) is unavailable.');
  }
  return rng;
}

/**
 * Generates an unbiased integer in [0, maxExclusive) using rejection sampling
 * over 32-bit unsigned integers without bitwise narrowing.
 */
export function randomInt(maxExclusive: number, rng: RandomSource): number {
  const source = assertRandomSource(rng);
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError('maxExclusive must be an integer between 1 and 2^32.');
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buf = new Uint32Array(1);

  for (;;) {
    source.getRandomValues(buf);
    const value = buf[0];
    if (value === undefined) {
      throw new Error('CSPRNG returned empty random buffer.');
    }
    if (value >= limit) {
      continue;
    }
    return value % maxExclusive;
  }
}

function dedupeCharset(raw: string, excludeAmbiguous: boolean): readonly string[] {
  const seen = new Set<string>();
  const chars: string[] = [];
  for (const ch of raw) {
    if (excludeAmbiguous && AMBIGUOUS_CHARS.has(ch)) {
      continue;
    }
    if (!seen.has(ch)) {
      seen.add(ch);
      chars.push(ch);
    }
  }
  return chars;
}

export function buildEnabledCharsets(
  options: GeneratorOptions
): readonly (readonly string[])[] {
  const sets: (readonly string[])[] = [];
  if (options.includeLowercase) {
    sets.push(dedupeCharset(LOWERCASE_CHARS, options.excludeAmbiguous));
  }
  if (options.includeUppercase) {
    sets.push(dedupeCharset(UPPERCASE_CHARS, options.excludeAmbiguous));
  }
  if (options.includeNumbers) {
    sets.push(dedupeCharset(NUMBER_CHARS, options.excludeAmbiguous));
  }
  if (options.includeSymbols) {
    sets.push(dedupeCharset(SYMBOL_CHARS, options.excludeAmbiguous));
  }
  return sets.filter((set) => set.length > 0);
}

export function validateGeneratorOptions(options: GeneratorOptions): {
  enabledCharsets: readonly (readonly string[])[];
  combinedPool: readonly string[];
} {
  const enabledCharsets = buildEnabledCharsets(options);
  if (enabledCharsets.length === 0) {
    throw new Error('Enable at least one character set before generating a password.');
  }

  if (!Number.isInteger(options.length)) {
    throw new RangeError('Password length must be a whole number.');
  }

  if (options.length < enabledCharsets.length) {
    throw new RangeError(
      `Password length must be at least ${enabledCharsets.length} to include every selected character set.`
    );
  }

  if (options.length > MAX_GENERATED_LENGTH) {
    throw new RangeError(`Password length cannot exceed ${MAX_GENERATED_LENGTH} characters.`);
  }

  const poolSeen = new Set<string>();
  const combinedPool: string[] = [];
  for (const charset of enabledCharsets) {
    for (const ch of charset) {
      if (!poolSeen.has(ch)) {
        poolSeen.add(ch);
        combinedPool.push(ch);
      }
    }
  }

  return { enabledCharsets, combinedPool };
}

export function generatePassword(
  options: GeneratorOptions,
  rng?: RandomSource
): GeneratedPasswordResult {
  const source = assertRandomSource(
    rng ?? (typeof globalThis.crypto !== 'undefined' ? (globalThis.crypto as RandomSource) : undefined)
  );
  const { enabledCharsets, combinedPool } = validateGeneratorOptions(options);

  const chars: string[] = [];

  for (const charset of enabledCharsets) {
    const pick = charset[randomInt(charset.length, source)];
    if (pick === undefined) {
      throw new Error('Unexpected empty charset entry.');
    }
    chars.push(pick);
  }

  while (chars.length < options.length) {
    const pick = combinedPool[randomInt(combinedPool.length, source)];
    if (pick === undefined) {
      throw new Error('Unexpected empty combined pool entry.');
    }
    chars.push(pick);
  }

  // Unbiased Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, source);
    const current = chars[i];
    const swap = chars[j];
    if (current === undefined || swap === undefined) {
      throw new Error('Shuffle index out of bounds.');
    }
    chars[i] = swap;
    chars[j] = current;
  }

  return {
    password: chars.join(''),
    charsetPoolSize: combinedPool.length,
    optionsUsed: { ...options }
  };
}
