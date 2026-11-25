export const MAX_INPUT_CODE_UNITS = 4096;
export const MAX_PATTERN_SCAN_CHARS = 1024;
export const MAX_GENERATED_LENGTH = 128;

export type StrengthTier =
  | 'empty'
  | 'very-weak'
  | 'weak'
  | 'fair'
  | 'strong'
  | 'very-strong';

export type PatternCategory =
  | 'common-password'
  | 'leet-substitution'
  | 'sequence'
  | 'keyboard-walk'
  | 'repetition'
  | 'date-year'
  | 'unicode-invisible';

export type FindingSeverity = 'info' | 'warning' | 'critical';

export type CriterionId =
  | 'length-min'
  | 'length-recommended'
  | 'lowercase'
  | 'uppercase'
  | 'digits'
  | 'symbols'
  | 'no-predictable-patterns';

export interface CharacterMetrics {
  codePoints: number;
  effectiveLength: number;
  utf16Length: number;
  lowercaseCount: number;
  uppercaseCount: number;
  digitCount: number;
  symbolCount: number;
  unicodeLetterOrOtherCount: number;
  whitespaceCount: number;
  invisibleOrControlCount: number;
  hasInvisibleOrControl: boolean;
  uniqueVisibleCount: number;
  charsetPoolSize: number;
}

export interface PatternFinding {
  id: string;
  category: PatternCategory;
  severity: FindingSeverity;
  message: string;
}

export interface CriterionCheck {
  id: CriterionId;
  label: string;
  met: boolean;
}

export interface ScoringResult {
  score: number;
  tier: StrengthTier;
  tierLabel: string;
  estimatedEntropyBits: number;
  crackTimeHint: string;
}

export interface PasswordAnalysis {
  isEmpty: boolean;
  wasTruncatedForInputCap: boolean;
  wasInputTruncatedForPatterns: boolean;
  metrics: CharacterMetrics;
  scoring: ScoringResult;
  criteria: readonly CriterionCheck[];
  findings: readonly PatternFinding[];
  suggestions: readonly string[];
}

export interface GeneratorOptions {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export interface RandomSource {
  getRandomValues(array: Uint32Array): Uint32Array;
}

export interface GeneratedPasswordResult {
  password: string;
  charsetPoolSize: number;
  optionsUsed: GeneratorOptions;
}
