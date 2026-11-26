import type { MonetizationRuleSet } from './monetizationRules';
import type {
  MonetizationInput,
  RequirementKey,
  RequirementProgress,
  TierStatus,
} from './monetizationTypes';

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function progressItem(
  key: RequirementKey,
  label: string,
  current: number | null,
  target: number,
  estimated = false,
): RequirementProgress {
  if (current === null || !Number.isFinite(current) || current < 0) {
    return {
      key,
      label,
      current: null,
      target,
      remaining: target,
      percent: null,
      met: false,
      estimated,
      reason: 'Not connected yet.',
    };
  }

  const remaining = Math.max(0, target - current);
  const percent =
    target > 0 ? roundPercent(Math.min(100, (current / target) * 100)) : 100;

  return {
    key,
    label,
    current,
    target,
    remaining,
    percent,
    met: current >= target,
    estimated,
    reason: null,
  };
}

function pathPercent(items: readonly RequirementProgress[]): number | null {
  const values = items
    .map((item) => item.percent)
    .filter((value): value is number => value !== null);
  return values.length === 0 ? null : Math.max(...values);
}

export function buildTierStatus(
  rule: MonetizationRuleSet,
  input: MonetizationInput,
  watchHours: number | null,
  watchEstimated: boolean,
): TierStatus {
  const subscribers = progressItem(
    'subscribers',
    'Subscribers',
    input.subscribers,
    rule.subscribers,
  );
  const watch =
    rule.watchHours === null
      ? null
      : progressItem(
          'watchHours',
          'Watch hours (365d)',
          watchHours,
          rule.watchHours,
          watchEstimated,
        );
  const shorts =
    rule.shortsViews === null
      ? null
      : progressItem(
          'shortsViews',
          'Shorts views (90d)',
          input.shortsViews ?? null,
          rule.shortsViews,
        );
  const uploads =
    rule.publicUploads === null
      ? null
      : progressItem(
          'publicUploads',
          'Public uploads (90d)',
          input.publicUploads90d ?? null,
          rule.publicUploads,
        );

  const progress = [subscribers, watch, shorts, uploads].filter(
    (item): item is RequirementProgress => item !== null,
  );

  const pathItems = [watch, shorts].filter(
    (item): item is RequirementProgress => item !== null,
  );
  const path = pathPercent(pathItems);

  const uploadPercent = uploads === null ? 100 : uploads.percent;
  const percent =
    subscribers.percent !== null && uploadPercent !== null && path !== null
      ? roundPercent(Math.min(subscribers.percent, uploadPercent, path))
      : null;

  const uploadsMet = uploads === null || uploads.met;
  const pathMet = pathItems.some((item) => item.met);
  const eligible = subscribers.met && uploadsMet && pathMet;

  let reason: string | null = null;
  if (!eligible) {
    const missing: string[] = [];
    if (subscribers.current === null) missing.push(subscribers.label);
    if (uploads !== null && uploads.current === null) missing.push(uploads.label);
    if (!pathMet) {
      for (const item of pathItems) {
        if (item.current === null) missing.push(item.label);
      }
    }

    if (missing.length > 0) {
      reason = `Not enough data yet: ${missing.join(', ')}.`;
    } else {
      const parts: string[] = [];
      if (!subscribers.met) {
        parts.push(`${formatAmount(subscribers.remaining ?? 0)} more subscribers`);
      }
      if (!uploadsMet && uploads !== null) {
        parts.push(`${formatAmount(uploads.remaining ?? 0)} more public uploads`);
      }
      if (!pathMet) {
        const options = pathItems
          .filter((item) => !item.met)
          .map((item) => `${formatAmount(item.remaining ?? 0)} more ${item.label.toLowerCase()}`);
        if (options.length > 0) parts.push(options.join(' or '));
      }
      reason = parts.length > 0 ? `Need ${parts.join('; ')}.` : 'Requirements are not met yet.';
    }
  }

  return { rule, progress, percent, eligible, reason };
}
