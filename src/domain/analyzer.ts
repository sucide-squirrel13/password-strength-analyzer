import { isInvisibleOrControlCodePoint } from './commonPasswords.ts';
import { detectPatterns } from './patterns.ts';
import { scorePassword } from './scoring.ts';
import {
  MAX_INPUT_CODE_UNITS,
  MAX_PATTERN_SCAN_CHARS
} from './types.ts';
import type {
  CharacterMetrics,
  CriterionCheck,
  PasswordAnalysis,
  PatternFinding
} from './types.ts';

/**
 * Checks input.length (UTF-16 code units) BEFORE Array.from() to prevent
 * unbounded memory allocation on large pastes, preserving surrogate pairs.
 */
export function sliceSafeUtf16(
  input: string,
  maxCodeUnits: number = MAX_INPUT_CODE_UNITS
): { value: string; wasTruncated: boolean } {
  if (input.length <= maxCodeUnits) {
    return { value: input, wasTruncated: false };
  }

  let end = maxCodeUnits;
  if (end > 0) {
    const lastCodeUnit = input.charCodeAt(end - 1);
    if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) {
      end -= 1;
    }
  }
  return { value: input.slice(0, end), wasTruncated: true };
}

export function classifyCodePoints(codePoints: readonly string[]): CharacterMetrics {
  let lowercaseCount = 0;
  let uppercaseCount = 0;
  let digitCount = 0;
  let symbolCount = 0;
  let unicodeLetterOrOtherCount = 0;
  let whitespaceCount = 0;
  let invisibleOrControlCount = 0;
  let utf16Length = 0;
  const uniqueVisible = new Set<string>();

  for (const ch of codePoints) {
    utf16Length += ch.length;
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;

    if (isInvisibleOrControlCodePoint(cp)) {
      invisibleOrControlCount++;
      continue;
    }

    if (cp === 0x20 || ch.trim().length === 0) {
      whitespaceCount++;
      uniqueVisible.add(ch);
      continue;
    }

    uniqueVisible.add(ch);

    if (cp >= 0x61 && cp <= 0x7a) {
      lowercaseCount++;
    } else if (cp >= 0x41 && cp <= 0x5a) {
      uppercaseCount++;
    } else if (cp >= 0x30 && cp <= 0x39) {
      digitCount++;
    } else if (cp >= 0x21 && cp <= 0x7e) {
      symbolCount++;
    } else {
      unicodeLetterOrOtherCount++;
    }
  }

  let charsetPoolSize = 0;
  if (lowercaseCount > 0) charsetPoolSize += 26;
  if (uppercaseCount > 0) charsetPoolSize += 26;
  if (digitCount > 0) charsetPoolSize += 10;
  if (symbolCount > 0) charsetPoolSize += 33;
  if (whitespaceCount > 0) charsetPoolSize += 1;
  if (unicodeLetterOrOtherCount > 0) charsetPoolSize += 64;

  const effectiveLength = codePoints.length - invisibleOrControlCount;

  return {
    codePoints: codePoints.length,
    effectiveLength,
    utf16Length,
    lowercaseCount,
    uppercaseCount,
    digitCount,
    symbolCount,
    unicodeLetterOrOtherCount,
    whitespaceCount,
    invisibleOrControlCount,
    hasInvisibleOrControl: invisibleOrControlCount > 0,
    uniqueVisibleCount: uniqueVisible.size,
    charsetPoolSize
  };
}

function buildCriteria(
  metrics: CharacterMetrics,
  findings: readonly PatternFinding[]
): readonly CriterionCheck[] {
  const hasPredictablePattern = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'warning'
  );
  const nonEmpty = metrics.effectiveLength > 0;

  return [
    {
      id: 'length-min',
      label: 'At least 8 visible characters',
      met: metrics.effectiveLength >= 8
    },
    {
      id: 'length-recommended',
      label: 'Recommended 12+ visible characters',
      met: metrics.effectiveLength >= 12
    },
    {
      id: 'lowercase',
      label: 'Lowercase letter (a–z)',
      met: metrics.lowercaseCount > 0
    },
    {
      id: 'uppercase',
      label: 'Uppercase letter (A–Z)',
      met: metrics.uppercaseCount > 0
    },
    {
      id: 'digits',
      label: 'Numeric digit (0–9)',
      met: metrics.digitCount > 0
    },
    {
      id: 'symbols',
      label: 'Visible special symbol (!@#…)',
      met: metrics.symbolCount > 0
    },
    {
      id: 'no-predictable-patterns',
      label: 'No detected predictable patterns',
      met: nonEmpty && !hasPredictablePattern
    }
  ];
}

function buildSuggestions(
  metrics: CharacterMetrics,
  findings: readonly PatternFinding[]
): readonly string[] {
  if (metrics.codePoints === 0) {
    return ['Enter a password or generate one with the Web Crypto generator.'];
  }

  const tips: string[] = [];

  if (metrics.effectiveLength < 12) {
    tips.push('Increase length to at least 12–16 visible characters (or use a 4+ word passphrase).');
  }
  if (metrics.uppercaseCount === 0) {
    tips.push('Add uppercase letters to expand character variety.');
  }
  if (metrics.lowercaseCount === 0) {
    tips.push('Add lowercase letters to expand character variety.');
  }
  if (metrics.digitCount === 0) {
    tips.push('Include numeric digits placed unpredictably (not at the end).');
  }
  if (metrics.symbolCount === 0) {
    tips.push('Include visible punctuation or special symbols.');
  }

  for (const finding of findings) {
    if (finding.category === 'common-password' || finding.category === 'leet-substitution') {
      tips.push('Avoid common passwords and simple character substitutions (like @ for a or 0 for o).');
    } else if (finding.category === 'keyboard-walk') {
      tips.push('Replace adjacent-key keyboard sequences with unrelated characters.');
    } else if (finding.category === 'sequence') {
      tips.push('Avoid alphabetical or numerical runs such as sequential digits or letters.');
    } else if (finding.category === 'repetition') {
      tips.push('Break up repeated characters or repeated word/digit blocks.');
    } else if (finding.category === 'date-year') {
      tips.push('Remove calendar dates or years from your password.');
    } else if (finding.category === 'unicode-invisible') {
      tips.push('Remove invisible formatting or control characters; rely on visible diversity instead.');
    }
  }

  if (tips.length === 0) {
    tips.push('Use a unique password per service and store it in a trusted password manager.');
  }

  return Array.from(new Set(tips));
}

export function analyzePassword(rawPassword: string): PasswordAnalysis {
  const safeSlice = sliceSafeUtf16(rawPassword, MAX_INPUT_CODE_UNITS);
  const codePoints = Array.from(safeSlice.value);
  const metrics = classifyCodePoints(codePoints);

  const wasInputTruncatedForPatterns = codePoints.length > MAX_PATTERN_SCAN_CHARS;
  const patternSlice = wasInputTruncatedForPatterns
    ? codePoints.slice(0, MAX_PATTERN_SCAN_CHARS)
    : codePoints;

  const findings = detectPatterns(patternSlice, metrics);
  const scoring = scorePassword(metrics, findings);
  const criteria = buildCriteria(metrics, findings);
  const suggestions = buildSuggestions(metrics, findings);

  return {
    isEmpty: metrics.codePoints === 0,
    wasTruncatedForInputCap: safeSlice.wasTruncated,
    wasInputTruncatedForPatterns,
    metrics,
    scoring,
    criteria,
    findings,
    suggestions
  };
}
