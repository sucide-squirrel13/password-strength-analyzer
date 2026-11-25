import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCodePoints } from '../../src/domain/analyzer.ts';
import { detectPatterns } from '../../src/domain/patterns.ts';

function scan(password: string) {
  const codePoints = Array.from(password);
  const metrics = classifyCodePoints(codePoints);
  return detectPatterns(codePoints, metrics);
}

test('detectPatterns flags exact common passwords', () => {
  const findings = scan('password');
  assert.ok(findings.some((f) => f.category === 'common-password' && f.severity === 'critical'));
});

test('detectPatterns catches NFKC fullwidth and invisible-obfuscated common passwords', () => {
  const fullwidth = scan('ｐａｓｓｗｏｒｄ');
  assert.ok(fullwidth.some((f) => f.category === 'common-password'));

  const withZeroWidth = scan('pass\u200Bword');
  assert.ok(withZeroWidth.some((f) => f.category === 'common-password'));
  assert.ok(withZeroWidth.some((f) => f.category === 'unicode-invisible'));
});

test('detectPatterns exercises leet-substitution branch for non-dictionary leet variants', () => {
  const findings = scan('w3lc0m3');
  assert.ok(findings.some((f) => f.category === 'leet-substitution' && f.severity === 'critical'));
});

test('detectPatterns flags padded common passwords with critical severity', () => {
  const padded = scan('P@ssw0rd1!');
  assert.ok(padded.some((f) => f.id === 'common-password-padded' && f.severity === 'critical'));
});

test('detectPatterns flags embedded common tokens', () => {
  const findings = scan('Xy9!welcome#Zq2');
  assert.ok(findings.some((f) => f.category === 'common-password'));
});

test('detectPatterns flags keyboard walks', () => {
  const rowWalk = scan('x9!qwerty#7m');
  assert.ok(rowWalk.some((f) => f.category === 'keyboard-walk'));

  const diagWalk = scan('mK8!1qaz$pL2');
  assert.ok(diagWalk.some((f) => f.category === 'keyboard-walk'));
});

test('detectPatterns flags ascending and descending sequential runs', () => {
  const asc = scan('Zz!abcd#92');
  assert.ok(asc.some((f) => f.category === 'sequence'));

  const desc = scan('Zz!9876#Km');
  assert.ok(desc.some((f) => f.category === 'sequence'));
});

test('detectPatterns flags repeated characters and repeated chunks', () => {
  const chars = scan('Xy9!aaaa#Lm2');
  assert.ok(chars.some((f) => f.category === 'repetition'));

  const chunks = scan('Xy!abcabc#92');
  assert.ok(chunks.some((f) => f.category === 'repetition'));
});

test('detectPatterns flags years, YYYYMM, YYMMDD, separator dates, and ignores non-year 4-digit numbers', () => {
  assert.ok(scan('K9!River2024#').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!202405#Lm').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!980519#Lm').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!20249999#L').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!2024-05-19#').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!19/05/2024#').some((f) => f.category === 'date-year'));
  assert.ok(scan('K9!19052024#').some((f) => f.category === 'date-year'));

  assert.equal(scan('K9!River1899#').some((f) => f.category === 'date-year'), false);
  assert.equal(scan('K9!River2100#').some((f) => f.category === 'date-year'), false);
});

test('detectPatterns avoids double penalty for standalone years in common list', () => {
  const findings = scan('K9!River2024#');
  assert.equal(findings.filter((f) => f.category === 'common-password').length, 0);
  assert.equal(findings.filter((f) => f.category === 'date-year').length, 1);
});

test('detectPatterns never leaks secret substrings in finding messages', () => {
  const secret = 'SuperSecretAdmin2025!qwerty';
  const findings = scan(secret);
  assert.ok(findings.length > 0);
  for (const finding of findings) {
    assert.equal(finding.message.toLowerCase().includes('supersecret'), false);
    assert.equal(finding.message.toLowerCase().includes('admin'), false);
    assert.equal(finding.message.toLowerCase().includes('qwerty'), false);
    assert.equal(finding.message.includes('2025'), false);
  }
});

test('detectPatterns returns zero findings for strong random-like input', () => {
  const findings = scan('vK9!mP2$xR7#nQ4@wL8');
  assert.equal(findings.length, 0);
});
