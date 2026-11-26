import { describe, expect, it } from 'vitest';
import {
  CURRENT_RULE_SET,
  EARLY_RULE_SET,
  NEW_RULE_SET,
  activeRuleSet,
  estimateWatchHours,
  monetizationStatus,
  nextRuleSet,
} from './monetization';

const JAN_31 = Date.UTC(2027, 0, 31, 23, 59, 59);
const FEB_1 = Date.UTC(2027, 1, 1, 0, 0, 0);

function requirement(
  status: ReturnType<typeof monetizationStatus>,
  key: 'subscribers' | 'watchHours' | 'shortsViews' | 'publicUploads',
) {
  return status.active.progress.find((item) => item.key === key);
}

describe('monetization date switch', () => {
  it('uses the current rule set through 31 Jan 2027', () => {
    expect(activeRuleSet(JAN_31, true).id).toBe(CURRENT_RULE_SET.id);
    expect(activeRuleSet(JAN_31, true).watchHours).toBe(4_000);
  });

  it('uses the larger thresholds for new applicants from 1 Feb 2027', () => {
    expect(activeRuleSet(FEB_1, true).id).toBe(NEW_RULE_SET.id);
    expect(activeRuleSet(FEB_1, true).watchHours).toBe(8_000);
    expect(activeRuleSet(FEB_1, true).shortsViews).toBe(20_000_000);
  });

  it('keeps an existing applicant on the old rule set after the switch', () => {
    expect(activeRuleSet(FEB_1, false).id).toBe(CURRENT_RULE_SET.id);
  });

  it('exposes the next rule set only before the switch', () => {
    expect(nextRuleSet(JAN_31)?.id).toBe(NEW_RULE_SET.id);
    expect(nextRuleSet(FEB_1)).toBeNull();
  });
});

describe('monetization progress', () => {
  it('marks the standard tier eligible with 1,000 subs and 4,000 hours', () => {
    const status = monetizationStatus({
      subscribers: 1_000,
      watchHours: 4_000,
      shortsViews: 0,
      now: JAN_31,
    });
    expect(status.active.eligible).toBe(true);
    expect(status.active.percent).toBe(100);
    expect(status.adRevenueUnlocked).toBe(true);
    expect(status.active.reason).toBeNull();
  });

  it('accepts the 10M Shorts views path', () => {
    const status = monetizationStatus({
      subscribers: 1_000,
      watchHours: 0,
      shortsViews: 10_000_000,
      now: JAN_31,
    });
    expect(status.active.eligible).toBe(true);
  });

  it('reports remaining subscribers and watch hours', () => {
    const status = monetizationStatus({
      subscribers: 750,
      watchHours: 1_000,
      shortsViews: 0,
      now: JAN_31,
    });
    expect(status.active.percent).toBe(25);
    expect(requirement(status, 'subscribers')?.remaining).toBe(250);
    expect(requirement(status, 'watchHours')?.remaining).toBe(3_000);
    expect(status.reason).toContain('250 more subscribers');
    expect(status.reason).toContain('3,000 more watch hours');
  });

  it('requires the new 8,000 hours after the switch', () => {
    const status = monetizationStatus({
      subscribers: 1_000,
      watchHours: 4_000,
      shortsViews: 0,
      now: FEB_1,
    });
    expect(status.active.eligible).toBe(false);
    expect(status.reason).toContain('4,000 more watch hours');
  });

  it('shows not enough data when hours and Shorts views are missing', () => {
    const status = monetizationStatus({ subscribers: 1_000, now: JAN_31 });
    expect(status.active.percent).toBeNull();
    expect(status.reason).toContain('Not enough data yet');
  });

  it('returns a pre-switch application hint', () => {
    const status = monetizationStatus({ subscribers: 100, now: JAN_31 });
    expect(status.hint).toContain('before 1 Feb 2027');
    expect(status.hint).toContain('4,000');
  });

  it('drops the hint after the switch', () => {
    expect(monetizationStatus({ subscribers: 100, now: FEB_1 }).hint).toBeNull();
  });
});

describe('early access tier', () => {
  it('unlocks fan funding and shopping, not ad revenue', () => {
    const status = monetizationStatus({
      subscribers: 500,
      publicUploads90d: 3,
      watchHours: 3_000,
      shortsViews: 0,
      now: JAN_31,
    });
    expect(status.early.eligible).toBe(true);
    expect(status.earlyBenefitsUnlocked).toBe(true);
    expect(status.adRevenueUnlocked).toBe(false);
    expect(EARLY_RULE_SET.unlocks).toContain('fan funding');
    expect(EARLY_RULE_SET.unlocksAdRevenue).toBe(false);
  });

  it('requires three public uploads', () => {
    const status = monetizationStatus({
      subscribers: 500,
      publicUploads90d: 2,
      watchHours: 3_000,
      now: JAN_31,
    });
    expect(status.early.eligible).toBe(false);
    expect(status.early.reason).toContain('1 more public uploads');
  });
});

describe('watch hours', () => {
  it('estimates hours from long-form views × average view duration', () => {
    expect(estimateWatchHours(1_000_000, 14.4)).toBeCloseTo(4_000);
    expect(estimateWatchHours(0, 10)).toBe(0);
    expect(estimateWatchHours(null, 10)).toBeNull();
    expect(estimateWatchHours(100, 0)).toBeNull();
  });

  it('labels estimated watch hours and uses them for progress', () => {
    const status = monetizationStatus({
      subscribers: 1_000,
      longViews: 1_000_000,
      avgViewDurationSeconds: 14.4,
      now: JAN_31,
    });
    expect(status.watchHoursSource).toBe('estimated');
    expect(status.watchHoursEstimated).toBe(true);
    expect(status.active.eligible).toBe(true);
    expect(requirement(status, 'watchHours')?.estimated).toBe(true);
  });

  it('prefers manual or API watch hours over the estimate', () => {
    const status = monetizationStatus({
      subscribers: 1_000,
      watchHours: 100,
      longViews: 10_000_000,
      avgViewDurationSeconds: 20,
      now: JAN_31,
    });
    expect(status.watchHoursSource).toBe('manual');
    expect(requirement(status, 'watchHours')?.current).toBe(100);
  });
});
