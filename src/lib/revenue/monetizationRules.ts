/**
 * Monetization thresholds are dated rules, not magic numbers in the UI.
 * The early tier unlocks fan funding and shopping only — never ad revenue.
 */

export const SWITCH_AT = Date.UTC(2027, 1, 1); // 2027-02-01T00:00:00Z
export const SWITCH_DATE_ISO = '2027-02-01';

export type RuleSetId = 'standard-current' | 'standard-new' | 'early-access';

export type MonetizationRuleSet = {
  id: RuleSetId;
  label: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  subscribers: number;
  watchHours: number | null;
  shortsViews: number | null;
  publicUploads: number | null;
  unlocksAdRevenue: boolean;
  unlocks: readonly string[];
};

export const CURRENT_RULE_SET: MonetizationRuleSet = {
  id: 'standard-current',
  label: 'Standard monetization before 1 Feb 2027',
  effectiveFrom: null,
  effectiveUntil: '2027-01-31',
  subscribers: 1_000,
  watchHours: 4_000,
  shortsViews: 10_000_000,
  publicUploads: null,
  unlocksAdRevenue: true,
  unlocks: ['ad revenue'],
};

export const NEW_RULE_SET: MonetizationRuleSet = {
  id: 'standard-new',
  label: 'Standard monetization for new applicants from 1 Feb 2027',
  effectiveFrom: SWITCH_DATE_ISO,
  effectiveUntil: null,
  subscribers: 1_000,
  watchHours: 8_000,
  shortsViews: 20_000_000,
  publicUploads: null,
  unlocksAdRevenue: true,
  unlocks: ['ad revenue'],
};

export const EARLY_RULE_SET: MonetizationRuleSet = {
  id: 'early-access',
  label: 'Early access tier',
  effectiveFrom: null,
  effectiveUntil: null,
  subscribers: 500,
  watchHours: 3_000,
  shortsViews: 3_000_000,
  publicUploads: 3,
  unlocksAdRevenue: false,
  unlocks: ['fan funding', 'shopping'],
};

export function activeRuleSet(
  now: number = Date.now(),
  isNewApplicant: boolean = true,
): MonetizationRuleSet {
  const ts = Number.isFinite(now) ? now : 0;
  if (ts < SWITCH_AT) return CURRENT_RULE_SET;
  return isNewApplicant ? NEW_RULE_SET : CURRENT_RULE_SET;
}

export function nextRuleSet(now: number = Date.now()): MonetizationRuleSet | null {
  return (Number.isFinite(now) ? now : 0) < SWITCH_AT ? NEW_RULE_SET : null;
}

/** long-form views × average view duration / 3600, labelled as an estimate. */
export function estimateWatchHours(
  longViews: number | null,
  avgViewDurationSeconds: number | null,
): number | null {
  if (
    longViews === null ||
    avgViewDurationSeconds === null ||
    !Number.isFinite(longViews) ||
    !Number.isFinite(avgViewDurationSeconds) ||
    longViews < 0 ||
    avgViewDurationSeconds <= 0
  ) {
    return null;
  }
  return (longViews * avgViewDurationSeconds) / 3_600;
}
