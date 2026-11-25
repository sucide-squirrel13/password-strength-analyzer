import {
  COMMON_PASSWORDS,
  applyLeetMap,
  normalizeVisibleNFKC,
  stripInvisibleFromCodePoints
} from './commonPasswords.ts';
import type { CharacterMetrics, PatternFinding } from './types.ts';

const KEYBOARD_LINES: readonly string[] = [
  '1234567890-=',
  '!@#$%^&*()_+',
  'qwertyuiop[]',
  'asdfghjkl;\'',
  'zxcvbnm,./',
  '1qaz',
  '2wsx',
  '3edc',
  '4rfv',
  '5tgb',
  '6yhn',
  '7ujm',
  '8ik,',
  '9ol.',
  '0p;/',
  'qaz',
  'wsx',
  'edc',
  'rfv',
  'tgb',
  'yhn',
  'ujm'
];

function buildKeyboardWalkSet(): ReadonlySet<string> {
  const walks = new Set<string>();
  for (const line of KEYBOARD_LINES) {
    const rev = Array.from(line).reverse().join('');
    for (const seq of [line, rev]) {
      const minLen = seq.length === 3 ? 3 : 4;
      for (let i = 0; i <= seq.length - minLen; i++) {
        walks.add(seq.slice(i, i + minLen));
      }
    }
  }
  return walks;
}

const KEYBOARD_WALK_SET: ReadonlySet<string> = buildKeyboardWalkSet();

function extractVisibleCodePoints(codePoints: readonly string[]): string[] {
  const stripped = stripInvisibleFromCodePoints(codePoints);
  return Array.from(stripped);
}

function isAsciiAlphaNum(cp: number): boolean {
  return (
    (cp >= 0x30 && cp <= 0x39) ||
    (cp >= 0x41 && cp <= 0x5a) ||
    (cp >= 0x61 && cp <= 0x7a)
  );
}

function stripOuterSymbolsAndDigits(text: string): string {
  const chars = Array.from(text);
  let start = 0;
  let end = chars.length;
  while (start < end) {
    const cp = chars[start]?.codePointAt(0) ?? 0;
    if (cp >= 0x61 && cp <= 0x7a) break;
    start++;
  }
  while (end > start) {
    const cp = chars[end - 1]?.codePointAt(0) ?? 0;
    if (cp >= 0x61 && cp <= 0x7a) break;
    end--;
  }
  return chars.slice(start, end).join('');
}

function longestEmbeddedCommonTokenLength(normalized: string, minTokenLen: number): number {
  if (normalized.length < minTokenLen) return 0;
  const maxWindow = Math.min(24, normalized.length);
  let longest = 0;
  for (let start = 0; start <= normalized.length - minTokenLen; start++) {
    for (let len = minTokenLen; len <= maxWindow && start + len <= normalized.length; len++) {
      if (len > longest && COMMON_PASSWORDS.has(normalized.slice(start, start + len))) {
        longest = len;
      }
    }
  }
  return longest;
}

function hasKeyboardWalk(lowerVisible: string): boolean {
  if (lowerVisible.length < 3) return false;
  for (let len = 3; len <= 4; len++) {
    for (let i = 0; i <= lowerVisible.length - len; i++) {
      if (KEYBOARD_WALK_SET.has(lowerVisible.slice(i, i + len))) {
        return true;
      }
    }
  }
  return false;
}

function hasSequentialRun(lowerVisible: readonly string[]): boolean {
  if (lowerVisible.length < 4) return false;
  let ascRun = 1;
  let descRun = 1;

  for (let i = 1; i < lowerVisible.length; i++) {
    const prev = lowerVisible[i - 1]?.codePointAt(0);
    const curr = lowerVisible[i]?.codePointAt(0);
    if (
      prev === undefined ||
      curr === undefined ||
      !isAsciiAlphaNum(prev) ||
      !isAsciiAlphaNum(curr)
    ) {
      ascRun = 1;
      descRun = 1;
      continue;
    }

    const sameKind =
      (prev >= 0x30 && prev <= 0x39 && curr >= 0x30 && curr <= 0x39) ||
      (prev >= 0x61 && prev <= 0x7a && curr >= 0x61 && curr <= 0x7a);

    if (!sameKind) {
      ascRun = 1;
      descRun = 1;
      continue;
    }

    if (curr - prev === 1) {
      ascRun++;
      descRun = 1;
    } else if (prev - curr === 1) {
      descRun++;
      ascRun = 1;
    } else {
      ascRun = 1;
      descRun = 1;
    }

    if (ascRun >= 4 || descRun >= 4) {
      return true;
    }
  }

  return false;
}

function hasRepeatedCharsOrChunks(visible: readonly string[]): boolean {
  if (visible.length < 3) return false;

  // Single repeated character run >= 3
  let run = 1;
  for (let i = 1; i < visible.length; i++) {
    if (visible[i] === visible[i - 1]) {
      run++;
      if (run >= 3) return true;
    } else {
      run = 1;
    }
  }

  // Adjacent repeated multi-character chunk (chunk size 2..16)
  const maxChunk = Math.min(16, Math.floor(visible.length / 2));
  for (let chunkLen = 2; chunkLen <= maxChunk; chunkLen++) {
    for (let i = 0; i <= visible.length - chunkLen * 2; i++) {
      const chunk = visible.slice(i, i + chunkLen).join('');
      const next = visible.slice(i + chunkLen, i + chunkLen * 2).join('');
      if (chunk.length > 0 && chunk === next) {
        return true;
      }
    }
  }

  return false;
}

function isYearNumber(n: number): boolean {
  return n >= 1900 && n <= 2099;
}

function isPlausibleMonthDay(a: number, b: number): boolean {
  const md = a >= 1 && a <= 12 && b >= 1 && b <= 31;
  const dm = b >= 1 && b <= 12 && a >= 1 && a <= 31;
  return md || dm;
}

function readDigitRunEnd(visible: readonly string[], start: number): number {
  let end = start;
  while (end < visible.length) {
    const d = visible[end]?.codePointAt(0) ?? 0;
    if (d < 0x30 || d > 0x39) break;
    end++;
  }
  return end;
}

function hasFourDigitYear(digitRun: string): boolean {
  for (let k = 0; k <= digitRun.length - 4; k++) {
    const y = Number.parseInt(digitRun.slice(k, k + 4), 10);
    if (isYearNumber(y)) {
      return true;
    }
  }
  return false;
}

function hasDateOrYearPattern(visible: readonly string[]): boolean {
  const len = visible.length;
  let i = 0;

  while (i < len) {
    const cp = visible[i]?.codePointAt(0) ?? 0;
    if (cp < 0x30 || cp > 0x39) {
      i++;
      continue;
    }

    const j = readDigitRunEnd(visible, i);
    const digitRun = visible.slice(i, j).join('');

    if (digitRun.length === 8) {
      const first4 = Number.parseInt(digitRun.slice(0, 4), 10);
      const last4 = Number.parseInt(digitRun.slice(4, 8), 10);
      const m1 = Number.parseInt(digitRun.slice(4, 6), 10);
      const d1 = Number.parseInt(digitRun.slice(6, 8), 10);
      const a0 = Number.parseInt(digitRun.slice(0, 2), 10);
      const b0 = Number.parseInt(digitRun.slice(2, 4), 10);
      if (
        (isYearNumber(first4) && isPlausibleMonthDay(m1, d1)) ||
        (isYearNumber(last4) && isPlausibleMonthDay(a0, b0))
      ) {
        return true;
      }
    } else if (digitRun.length === 6) {
      const a = Number.parseInt(digitRun.slice(0, 2), 10);
      const b = Number.parseInt(digitRun.slice(2, 4), 10);
      const c = Number.parseInt(digitRun.slice(4, 6), 10);
      if (isPlausibleMonthDay(a, b) || isPlausibleMonthDay(b, c)) {
        return true;
      }
    }

    if (digitRun.length >= 4 && hasFourDigitYear(digitRun)) {
      return true;
    }

    // Check separator-delimited date (e.g. 2024-01-15 or 15/01/2024)
    if (j < len) {
      const sep = visible[j];
      if (sep === '-' || sep === '/' || sep === '.') {
        const p2End = readDigitRunEnd(visible, j + 1);
        if (p2End > j + 1 && p2End < len && visible[p2End] === sep) {
          const p3End = readDigitRunEnd(visible, p2End + 1);
          if (p3End > p2End + 1) {
            const p1 = Number.parseInt(digitRun, 10);
            const p2 = Number.parseInt(visible.slice(j + 1, p2End).join(''), 10);
            const p3 = Number.parseInt(visible.slice(p2End + 1, p3End).join(''), 10);
            if (
              (isYearNumber(p1) && isPlausibleMonthDay(p2, p3)) ||
              (isYearNumber(p3) && isPlausibleMonthDay(p1, p2))
            ) {
              return true;
            }
          }
        }
      }
    }

    i = j;
  }

  return false;
}

/**
 * Runs deterministic, O(n)/bounded pattern detection on scanned code points.
 * Never embeds password substrings, positions, or masked hints in finding messages.
 */
export function detectPatterns(
  codePoints: readonly string[],
  metrics: CharacterMetrics
): readonly PatternFinding[] {
  const findings: PatternFinding[] = [];
  const visible = extractVisibleCodePoints(codePoints);
  if (visible.length === 0 && !metrics.hasInvisibleOrControl) {
    return findings;
  }

  const asciiLower = visible.join('').toLowerCase();
  const nfkcLower = normalizeVisibleNFKC(codePoints);
  const leetNormalized = applyLeetMap(nfkcLower);

  const isExactCommon =
    COMMON_PASSWORDS.has(asciiLower) || COMMON_PASSWORDS.has(nfkcLower);
  const isLeetCommon = !isExactCommon && COMMON_PASSWORDS.has(leetNormalized);

  if (isExactCommon) {
    findings.push({
      id: 'common-password',
      category: 'common-password',
      severity: 'critical',
      message: 'Matches a commonly used password from the offline reference list.'
    });
  } else if (isLeetCommon) {
    findings.push({
      id: 'leet-substitution',
      category: 'leet-substitution',
      severity: 'critical',
      message: 'Matches a common password using predictable character substitutions.'
    });
  } else {
    const core = stripOuterSymbolsAndDigits(nfkcLower);
    const leetCore = stripOuterSymbolsAndDigits(leetNormalized);
    const coreMatchLen =
      core.length >= 4 && COMMON_PASSWORDS.has(core)
        ? core.length
        : leetCore.length >= 4 && COMMON_PASSWORDS.has(leetCore)
          ? leetCore.length
          : 0;
    const embeddedNfkcLen = longestEmbeddedCommonTokenLength(nfkcLower, 4);
    const embeddedLeetLen = longestEmbeddedCommonTokenLength(leetNormalized, 5);
    const bestMatchLen = Math.max(coreMatchLen, embeddedNfkcLen, embeddedLeetLen);
    const matchRatio = bestMatchLen / Math.max(1, nfkcLower.length);

    if (bestMatchLen > 0 && matchRatio >= 0.55) {
      findings.push({
        id: 'common-password-padded',
        category: 'common-password',
        severity: 'critical',
        message: 'Built around a common password with minor prefix/suffix padding.'
      });
    } else if (bestMatchLen > 0) {
      findings.push({
        id: 'common-password-embedded',
        category: 'common-password',
        severity: 'warning',
        message: 'Contains a predictable common word or password fragment.'
      });
    }
  }

  if (hasKeyboardWalk(nfkcLower)) {
    findings.push({
      id: 'keyboard-walk',
      category: 'keyboard-walk',
      severity: 'warning',
      message: 'Contains a predictable adjacent-key keyboard walk pattern.'
    });
  }

  const lowerVisibleChars = Array.from(nfkcLower);
  if (hasSequentialRun(lowerVisibleChars)) {
    findings.push({
      id: 'sequential-run',
      category: 'sequence',
      severity: 'warning',
      message: 'Contains a sequential alphabetical or numeric run.'
    });
  }

  if (hasRepeatedCharsOrChunks(visible)) {
    findings.push({
      id: 'repeated-pattern',
      category: 'repetition',
      severity: 'warning',
      message: 'Contains repeated characters or repeating character sequences.'
    });
  }

  if (hasDateOrYearPattern(visible)) {
    findings.push({
      id: 'date-year',
      category: 'date-year',
      severity: 'warning',
      message: 'Contains a calendar year or date-like numeric pattern.'
    });
  }

  if (metrics.hasInvisibleOrControl) {
    findings.push({
      id: 'unicode-invisible',
      category: 'unicode-invisible',
      severity: 'warning',
      message:
        'Contains invisible formatting or control characters, which are excluded from symbol diversity.'
    });
  }

  return findings;
}
