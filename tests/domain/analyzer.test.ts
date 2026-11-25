import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePassword, sliceSafeUtf16 } from '../../src/domain/analyzer.ts';
import {
  MAX_INPUT_CODE_UNITS,
  MAX_PATTERN_SCAN_CHARS
} from '../../src/domain/types.ts';

test('analyzePassword handles empty input cleanly', () => {
  const res = analyzePassword('');
  assert.equal(res.isEmpty, true);
  assert.equal(res.scoring.tier, 'empty');
  assert.equal(res.scoring.score, 0);
  assert.equal(res.wasTruncatedForInputCap, false);
  assert.equal(res.wasInputTruncatedForPatterns, false);
  assert.equal(res.criteria.every((c) => !c.met), true);
});

test('analyzePassword counts astral Unicode code points accurately', () => {
  const res = analyzePassword('Ab1!🔐🔑🔥🚀');
  assert.equal(res.metrics.codePoints, 8);
  assert.equal(res.metrics.utf16Length, 12);
  assert.equal(res.metrics.unicodeLetterOrOtherCount, 4);
});

test('analyzePassword excludes invisible/BiDi/control chars from symbol criterion', () => {
  const res = analyzePassword('Abcdefg1\u200B\u202E\u0007');
  const sym = res.criteria.find((c) => c.id === 'symbols');
  assert.ok(sym);
  assert.equal(sym.met, false);
  assert.equal(res.metrics.hasInvisibleOrControl, true);
  assert.equal(res.metrics.effectiveLength, 8);
});

test('sliceSafeUtf16 preserves surrogate pair boundary at MAX_INPUT_CODE_UNITS', () => {
  // 4095 ASCII chars + 1 surrogate pair (2 code units) = 4097 code units
  const input = 'a'.repeat(MAX_INPUT_CODE_UNITS - 1) + '🔐';
  const sliced = sliceSafeUtf16(input, MAX_INPUT_CODE_UNITS);
  assert.equal(sliced.wasTruncated, true);
  assert.equal(sliced.value.length, MAX_INPUT_CODE_UNITS - 1);
  // Ensure no lone high surrogate remains
  const last = sliced.value.charCodeAt(sliced.value.length - 1);
  assert.equal(last >= 0xd800 && last <= 0xdbff, false);
});

test('analyzePassword sets truncation flags cleanly and handles 1MB+ paste in bounded time', () => {
  const overPatterns = analyzePassword('X9!k'.repeat(300)); // 1200 chars
  assert.equal(overPatterns.wasTruncatedForInputCap, false);
  assert.equal(overPatterns.wasInputTruncatedForPatterns, true);

  const huge = 'a'.repeat(1_200_000);
  const start = performance.now();
  const hugeRes = analyzePassword(huge);
  const elapsedMs = performance.now() - start;

  assert.equal(hugeRes.wasTruncatedForInputCap, true);
  assert.equal(hugeRes.wasInputTruncatedForPatterns, true);
  assert.equal(hugeRes.metrics.codePoints, MAX_INPUT_CODE_UNITS);
  assert.ok(elapsedMs < 200, `Expected fast bounded analysis, took ${elapsedMs}ms`);
  assert.equal(MAX_PATTERN_SCAN_CHARS, 1024);
});

test('analyzePassword evaluates all criteria met for strong password without predictable patterns', () => {
  const res = analyzePassword('vK9!mP2$xR7#nQ4@wL8%');
  assert.equal(res.criteria.every((c) => c.met), true);
  assert.equal(res.findings.length, 0);
});
