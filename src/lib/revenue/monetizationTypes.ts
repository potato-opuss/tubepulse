import type { MonetizationRuleSet } from './monetizationRules';

export type RequirementKey = 'subscribers' | 'watchHours' | 'shortsViews' | 'publicUploads';

export type RequirementProgress = {
  key: RequirementKey;
  label: string;
  current: number | null;
  target: number;
  remaining: number | null;
  /** 0–100, null when the value is not connected yet. */
  percent: number | null;
  met: boolean;
  /** True when watch hours were estimated from views × average view duration. */
  estimated: boolean;
  reason: string | null;
};

export type TierStatus = {
  rule: MonetizationRuleSet;
  progress: RequirementProgress[];
  percent: number | null;
  eligible: boolean;
  reason: string | null;
};

export type MonetizationInput = {
  subscribers: number | null;
  /** Qualified watch hours in the last 365 days, manual or API. */
  watchHours?: number | null;
  /** Qualified Shorts views in the last 90 days. */
  shortsViews?: number | null;
  publicUploads90d?: number | null;
  /** Used only to estimate watch hours when they are not connected. */
  longViews?: number | null;
  avgViewDurationSeconds?: number | null;
  now?: number;
  /** From 1 Feb 2027 the larger thresholds apply to new applicants. */
  isNewApplicant?: boolean;
};

export type WatchHoursSource = 'manual' | 'estimated' | 'missing';

export type MonetizationStatus = {
  active: TierStatus;
  early: TierStatus;
  activeRule: MonetizationRuleSet;
  nextRule: MonetizationRuleSet | null;
  switchDate: string;
  hint: string | null;
  watchHoursSource: WatchHoursSource;
  watchHoursEstimated: boolean;
  adRevenueUnlocked: boolean;
  earlyBenefitsUnlocked: boolean;
  reason: string | null;
};
