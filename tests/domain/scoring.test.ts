import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCodePoints } from '../../src/domain/analyzer.ts';
import { detectPatterns } from '../../src/domain/patterns.ts';
import { scorePassword } from '../../src/domain/scoring.ts';

function evaluate(password: string) {
  const cps = Array.from(password);
  const metrics = classifyCodePoints(cps);
  const findings = detectPatterns(cps, metrics);
  return { metrics, findings, scoring: scorePassword(metrics, findings) };
}

test('empty password returns empty tier and score 0', () => {
  const { scoring } = evaluate('');
  assert.equal(scoring.tier, 'empty');
  assert.equal(scoring.score, 0);
  assert.equal(scoring.estimatedEntropyBits, 0);
});

test('common password is capped at very-weak', () => {
  const { scoring } = evaluate('password123');
  assert.equal(scoring.tier, 'very-weak');
  assert.ok(scoring.score <= 15);
});

test('leet-substituted common password is capped at weak or below', () => {
  const { scoring } = evaluate('w3lc0m3');
  assert.ok(scoring.tier === 'very-weak' || scoring.tier === 'weak');
  assert.ok(scoring.score <= 35);
});

test('padded common password cannot reach fair or strong', () => {
  const padded = evaluate('P@ssw0rd1!');
  assert.ok(padded.scoring.tier === 'very-weak' || padded.scoring.tier === 'weak');
  assert.ok(padded.scoring.score <= 35);

  const padded12 = evaluate('P@ssw0rd1!Xy');
  assert.ok(padded12.scoring.tier === 'very-weak' || padded12.scoring.tier === 'weak');
  assert.ok(padded12.scoring.score <= 35);
});

test('short passwords under 8 chars are capped at weak', () => {
  const { scoring } = evaluate('X9!kM2$');
  assert.ok(scoring.tier === 'very-weak' || scoring.tier === 'weak');
  assert.ok(scoring.score <= 34);
});

test('passwords between 8 and 11 chars are capped at fair', () => {
  const { scoring } = evaluate('Ab9!mK2$pQ');
  assert.ok(['very-weak', 'weak', 'fair'].includes(scoring.tier));
  assert.ok(scoring.score <= 74);
});

test('low-uniqueness repeated character passwords are capped at very-weak', () => {
  const { scoring } = evaluate('aaaaaaaaaaaaaaaaaaaa');
  assert.equal(scoring.tier, 'very-weak');
  assert.ok(scoring.score <= 15);
});

test('invisible characters do not inflate score or count as visible diversity', () => {
  const onlyInvisible = evaluate('\u200B\u200C\u200D\uFEFF\u202E\u2066\u0007\u001B');
  assert.equal(onlyInvisible.metrics.effectiveLength, 0);
  assert.equal(onlyInvisible.metrics.symbolCount, 0);
  assert.equal(onlyInvisible.metrics.hasInvisibleOrControl, true);
  assert.equal(onlyInvisible.scoring.tier, 'very-weak');
});

test('strong high-diversity 20-char password reaches strong or very-strong', () => {
  const { scoring } = evaluate('vK9!mP2$xR7#nQ4@wL8%');
  assert.ok(scoring.tier === 'strong' || scoring.tier === 'very-strong');
  assert.ok(scoring.score >= 85);
});
