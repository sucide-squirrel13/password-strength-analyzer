import type {
  CharacterMetrics,
  PatternFinding,
  ScoringResult,
  StrengthTier
} from './types.ts';

const TIER_LABELS: Readonly<Record<StrengthTier, string>> = {
  empty: 'No Input',
  'very-weak': 'Very Weak',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  'very-strong': 'Very Strong'
};

const TIER_ORDER: readonly StrengthTier[] = [
  'empty',
  'very-weak',
  'weak',
  'fair',
  'strong',
  'very-strong'
];

function capTier(current: StrengthTier, maxAllowed: StrengthTier): StrengthTier {
  return TIER_ORDER.indexOf(current) > TIER_ORDER.indexOf(maxAllowed)
    ? maxAllowed
    : current;
}

function tierToCrackHint(tier: StrengthTier, entropyBits: number): string {
  switch (tier) {
    case 'empty':
      return 'Enter a password to evaluate';
    case 'very-weak':
      return 'Seconds to minutes (offline brute-force / dictionary)';
    case 'weak':
      return 'Minutes to hours against targeted offline cracking';
    case 'fair':
      return entropyBits >= 48
        ? 'Days to months under fast offline hashing'
        : 'Hours to days under fast offline hashing';
    case 'strong':
      return 'Years to decades against typical offline attacks';
    case 'very-strong':
      return 'Centuries+ under modern password hashing (heuristic estimate)';
  }
}

export function scorePassword(
  metrics: CharacterMetrics,
  findings: readonly PatternFinding[]
): ScoringResult {
  if (metrics.codePoints === 0) {
    return {
      score: 0,
      tier: 'empty',
      tierLabel: TIER_LABELS.empty,
      estimatedEntropyBits: 0,
      crackTimeHint: tierToCrackHint('empty', 0)
    };
  }

  const len = metrics.effectiveLength;

  // Base length score (0..52)
  let lengthScore = 0;
  if (len <= 7) {
    lengthScore = len * 3;
  } else if (len <= 11) {
    lengthScore = 21 + (len - 7) * 4;
  } else if (len <= 15) {
    lengthScore = 37 + (len - 11) * 2.5;
  } else {
    lengthScore = 47 + Math.min(5, len - 15);
  }

  // Character class variety (0..36) — excludes invisible/control chars
  const hasLower = metrics.lowercaseCount > 0;
  const hasUpper = metrics.uppercaseCount > 0;
  const hasDigit = metrics.digitCount > 0;
  const hasSymbol = metrics.symbolCount > 0;
  const hasOtherUnicode = metrics.unicodeLetterOrOtherCount > 0;

  let varietyScore = 0;
  if (hasLower) varietyScore += 8;
  if (hasUpper) varietyScore += 8;
  if (hasDigit) varietyScore += 8;
  if (hasSymbol) {
    varietyScore += 12;
  } else if (hasOtherUnicode) {
    varietyScore += 8;
  }

  // Balance & uniqueness bonus (0..12)
  const standardClasses =
    (hasLower ? 1 : 0) +
    (hasUpper ? 1 : 0) +
    (hasDigit ? 1 : 0) +
    (hasSymbol ? 1 : 0);

  let bonusScore = 0;
  if (standardClasses >= 3) bonusScore += 4;
  if (standardClasses === 4) bonusScore += 4;
  if (len >= 8 && metrics.uniqueVisibleCount / len >= 0.7) {
    bonusScore += 4;
  }

  let rawScore = Math.round(lengthScore + varietyScore + bonusScore);

  // Finding penalties
  let hasExactCommon = false;
  let hasLeetCommon = false;
  let hasPaddedCommon = false;
  for (const finding of findings) {
    if (finding.id === 'common-password') {
      hasExactCommon = true;
      rawScore -= 60;
    } else if (finding.id === 'leet-substitution') {
      hasLeetCommon = true;
      rawScore -= 45;
    } else if (finding.id === 'common-password-padded') {
      hasPaddedCommon = true;
      rawScore -= 40;
    } else if (finding.severity === 'critical') {
      rawScore -= 35;
    } else if (finding.severity === 'warning') {
      rawScore -= 12;
    } else {
      rawScore -= 4;
    }
  }

  // Hard caps prevent inflated scores for weak patterns or low uniqueness
  if (hasExactCommon) {
    rawScore = Math.min(rawScore, 15);
  }
  if (hasLeetCommon || hasPaddedCommon) {
    rawScore = Math.min(rawScore, 35);
  }
  if (len < 8) {
    rawScore = Math.min(rawScore, 34);
  } else if (len < 12) {
    rawScore = Math.min(rawScore, 74);
  }
  if (metrics.uniqueVisibleCount <= 2) {
    rawScore = Math.min(rawScore, 15);
  }

  const score = Math.max(0, Math.min(100, rawScore));

  let tier: StrengthTier;
  if (score < 25) {
    tier = 'very-weak';
  } else if (score < 50) {
    tier = 'weak';
  } else if (score < 70) {
    tier = 'fair';
  } else if (score < 85) {
    tier = 'strong';
  } else {
    tier = 'very-strong';
  }

  if (hasExactCommon) tier = capTier(tier, 'very-weak');
  if (hasLeetCommon || hasPaddedCommon) tier = capTier(tier, 'weak');
  if (len < 8) tier = capTier(tier, 'weak');
  if (len < 12) tier = capTier(tier, 'fair');
  if (metrics.uniqueVisibleCount <= 2) tier = capTier(tier, 'very-weak');

  const rawBits =
    len > 0 && metrics.charsetPoolSize > 1
      ? len * Math.log2(metrics.charsetPoolSize)
      : 0;
  const penaltyBits = findings.reduce(
    (acc, f) => acc + (f.severity === 'critical' ? 28 : f.severity === 'warning' ? 10 : 0),
    0
  );
  const estimatedEntropyBits = hasExactCommon
    ? Math.min(12, Math.max(0, Math.round(rawBits - penaltyBits)))
    : Math.max(0, Math.round(rawBits - penaltyBits));

  return {
    score,
    tier,
    tierLabel: TIER_LABELS[tier],
    estimatedEntropyBits,
    crackTimeHint: tierToCrackHint(tier, estimatedEntropyBits)
  };
}
