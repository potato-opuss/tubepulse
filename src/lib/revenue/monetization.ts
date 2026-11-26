import {
  EARLY_RULE_SET,
  activeRuleSet,
  estimateWatchHours,
  nextRuleSet,
  SWITCH_AT,
  SWITCH_DATE_ISO,
} from './monetizationRules';
import { buildTierStatus } from './monetizationProgress';
import type { MonetizationInput, MonetizationStatus, WatchHoursSource } from './monetizationTypes';

export {
  CURRENT_RULE_SET,
  EARLY_RULE_SET,
  NEW_RULE_SET,
  SWITCH_AT,
  SWITCH_DATE_ISO,
  activeRuleSet,
  estimateWatchHours,
  nextRuleSet,
} from './monetizationRules';
export type { MonetizationRuleSet, RuleSetId } from './monetizationRules';
export type {
  MonetizationInput,
  MonetizationStatus,
  RequirementKey,
  RequirementProgress,
  TierStatus,
  WatchHoursSource,
} from './monetizationTypes';

/**
 * Active rule set, early-access status, progress and remaining amounts.
 * Watch hours can be manual/API or estimated from long-form views.
 */
export function monetizationStatus(input: MonetizationInput): MonetizationStatus {
  const now = input.now ?? Date.now();
  const isNewApplicant = input.isNewApplicant ?? true;

  const manualHours =
    input.watchHours !== undefined &&
    input.watchHours !== null &&
    Number.isFinite(input.watchHours) &&
    input.watchHours >= 0
      ? input.watchHours
      : null;
  const estimatedHours = estimateWatchHours(
    input.longViews ?? null,
    input.avgViewDurationSeconds ?? null,
  );
  const watchHours = manualHours ?? estimatedHours;
  const watchEstimated = manualHours === null && estimatedHours !== null;
  const watchHoursSource: WatchHoursSource =
    manualHours !== null ? 'manual' : estimatedHours !== null ? 'estimated' : 'missing';

  const active = buildTierStatus(
    activeRuleSet(now, isNewApplicant),
    input,
    watchHours,
    watchEstimated,
  );
  const early = buildTierStatus(EARLY_RULE_SET, input, watchHours, watchEstimated);
  const hint =
    (Number.isFinite(now) ? now : 0) < SWITCH_AT && !active.eligible
      ? 'You can still apply before 1 Feb 2027 under the current 4,000 watch hours / 10M Shorts views thresholds.'
      : null;

  return {
    active,
    early,
    activeRule: active.rule,
    nextRule: nextRuleSet(now),
    switchDate: SWITCH_DATE_ISO,
    hint,
    watchHoursSource,
    watchHoursEstimated: watchEstimated,
    adRevenueUnlocked: active.eligible && active.rule.unlocksAdRevenue,
    earlyBenefitsUnlocked: early.eligible && early.rule.unlocks.length > 0,
    reason: active.reason,
  };
}
