import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBIGUOUS_CHARS,
  generatePassword,
  randomInt
} from '../../src/domain/generator.ts';
import { MAX_GENERATED_LENGTH } from '../../src/domain/types.ts';
import type { GeneratorOptions, RandomSource } from '../../src/domain/types.ts';

function defaultOptions(overrides?: Partial<GeneratorOptions>): GeneratorOptions {
  return {
    length: 20,
    includeLowercase: true,
    includeUppercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
    ...overrides
  };
}

function makeSequenceRng(values: readonly number[]): RandomSource {
  let idx = 0;
  return {
    getRandomValues(array: Uint32Array): Uint32Array {
      for (let i = 0; i < array.length; i++) {
        const next = values[idx % values.length];
        array[i] = next ?? 0;
        idx++;
      }
      return array;
    }
  };
}

test('randomInt fails closed when CSPRNG is missing or invalid', () => {
  assert.throws(
    () => randomInt(10, undefined as unknown as RandomSource),
    /unavailable/i
  );
  assert.throws(
    () => randomInt(10, {} as unknown as RandomSource),
    /unavailable/i
  );
});

test('randomInt validates maxExclusive bounds strictly', () => {
  const rng = makeSequenceRng([0]);
  assert.throws(() => randomInt(0, rng), RangeError);
  assert.throws(() => randomInt(-5, rng), RangeError);
  assert.throws(() => randomInt(3.5, rng), RangeError);
  assert.throws(() => randomInt(0x1_0000_0001, rng), RangeError);
});

test('randomInt rejects values >= limit to prevent modulo bias', () => {
  let calls = 0;
  const rng: RandomSource = {
    getRandomValues(array: Uint32Array): Uint32Array {
      const seq = [4294967290, 4294967295, 17];
      array[0] = seq[calls++] ?? 0;
      return array;
    }
  };

  const out = randomInt(10, rng);
  assert.equal(out, 7);
  assert.equal(calls, 3);
});

test('generatePassword validates charset selection and length boundaries', () => {
  const rng = makeSequenceRng([1, 2, 3, 4, 5, 6, 7]);

  assert.throws(
    () =>
      generatePassword(
        defaultOptions({
          includeLowercase: false,
          includeUppercase: false,
          includeNumbers: false,
          includeSymbols: false
        }),
        rng
      ),
    /at least one character set/i
  );

  assert.throws(
    () => generatePassword(defaultOptions({ length: 3 }), rng),
    /at least 4/i
  );

  assert.throws(
    () => generatePassword(defaultOptions({ length: MAX_GENERATED_LENGTH + 1 }), rng),
    /cannot exceed 128/i
  );

  assert.throws(
    () => generatePassword(defaultOptions({ length: 12.5 }), rng),
    /whole number/i
  );

  assert.throws(
    () => generatePassword(defaultOptions({ length: Number.NaN }), rng),
    /whole number/i
  );
});

test('generatePassword handles single-charset, exact minimum length, and max length 128', () => {
  const singleSet = generatePassword(
    defaultOptions({
      length: 10,
      includeLowercase: false,
      includeUppercase: false,
      includeNumbers: true,
      includeSymbols: false
    })
  );
  assert.equal(singleSet.password.length, 10);
  assert.match(singleSet.password, /^[0-9]{10}$/);

  const minLen = generatePassword(defaultOptions({ length: 4 }));
  assert.equal(minLen.password.length, 4);
  assert.match(minLen.password, /[a-z]/);
  assert.match(minLen.password, /[A-Z]/);
  assert.match(minLen.password, /[0-9]/);
  assert.match(minLen.password, /[^a-zA-Z0-9]/);

  const maxLen = generatePassword(defaultOptions({ length: MAX_GENERATED_LENGTH }));
  assert.equal(maxLen.password.length, MAX_GENERATED_LENGTH);
});

test('generatePassword excludes ambiguous characters and guarantees enabled classes', () => {
  const result = generatePassword(
    defaultOptions({ length: 32, excludeAmbiguous: true })
  );

  assert.equal(result.password.length, 32);
  for (const ch of result.password) {
    assert.equal(AMBIGUOUS_CHARS.has(ch), false, `Unexpected ambiguous char: ${ch}`);
  }
  assert.match(result.password, /[a-z]/);
  assert.match(result.password, /[A-Z]/);
  assert.match(result.password, /[0-9]/);
  assert.match(result.password, /[^a-zA-Z0-9]/);
});
