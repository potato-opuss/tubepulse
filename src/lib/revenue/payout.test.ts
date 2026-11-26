import { describe, expect, it } from 'vitest';
import { DEFAULT_PAYOUT_THRESHOLD_USD, payoutStatus } from './payout';

const NOW = Date.UTC(2026, 0, 1);

describe('payoutStatus', () => {
  it('uses the default $100 threshold and reports progress', () => {
    const result = payoutStatus({ balanceUsd: 25, now: NOW });
    expect(result.thresholdUsd).toBe(DEFAULT_PAYOUT_THRESHOLD_USD);
    expect(result.remainingUsd).toBe(75);
    expect(result.percent).toBe(25);
    expect(result.reached).toBe(false);
  });

  it('marks a reached threshold without an ETA delay', () => {
    const result = payoutStatus({ balanceUsd: 120, now: NOW });
    expect(result.reached).toBe(true);
    expect(result.remainingUsd).toBe(0);
    expect(result.percent).toBe(100);
    expect(result.etaDays).toBe(0);
    expect(result.etaDate).toBe('2026-01-01');
  });

  it('computes an ETA from explicit daily earnings', () => {
    const result = payoutStatus({ balanceUsd: 25, dailyEarningsUsd: 5, now: NOW });
    expect(result.etaDays).toBe(15);
    expect(result.etaDate).toBe('2026-01-16');
  });

  it('accepts a configurable threshold', () => {
    const result = payoutStatus({ balanceUsd: 25, thresholdUsd: 50, now: NOW });
    expect(result.thresholdUsd).toBe(50);
    expect(result.remainingUsd).toBe(25);
    expect(result.percent).toBe(50);
  });

  it('uses the forecast slope for the ETA', () => {
    const result = payoutStatus({
      balanceUsd: 50,
      forecast: { slope: 2.5, mid: 200, reason: null },
      now: NOW,
    });
    expect(result.dailyEarningsUsd).toBe(2.5);
    expect(result.etaDays).toBe(20);
  });

  it('refuses an ETA without a positive trend', () => {
    const result = payoutStatus({ balanceUsd: 25, dailyEarningsUsd: 0, now: NOW });
    expect(result.etaDays).toBeNull();
    expect(result.etaDate).toBeNull();
    expect(result.reason).toContain('No positive daily earnings trend');
  });

  it('ignores a negative forecast slope', () => {
    const result = payoutStatus({
      balanceUsd: 25,
      forecast: { slope: -1, mid: 10, reason: null },
      now: NOW,
    });
    expect(result.dailyEarningsUsd).toBeNull();
    expect(result.etaDays).toBeNull();
  });
});
