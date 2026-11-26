import type { ForecastResult } from './forecast';

/**
 * Payout progress against a configurable threshold, with an ETA only when the
 * forecast slope is positive. No positive trend means no promised date.
 */

export const DEFAULT_PAYOUT_THRESHOLD_USD = 100;
export const DAY_MS = 86_400_000;

export type PayoutInput = {
  balanceUsd: number;
  thresholdUsd?: number;
  /** Explicit daily earnings rate. Takes precedence over forecast.slope. */
  dailyEarningsUsd?: number | null;
  forecast?: Pick<ForecastResult, 'slope' | 'mid' | 'reason'> | null;
  now?: number;
};

export type PayoutStatus = {
  balanceUsd: number;
  thresholdUsd: number;
  remainingUsd: number;
  /** 0–100. */
  percent: number;
  reached: boolean;
  dailyEarningsUsd: number | null;
  etaDays: number | null;
  etaDate: string | null;
  reason: string | null;
};

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function isoDate(ts: number): string {
  return new Date(Number.isFinite(ts) ? ts : 0).toISOString().slice(0, 10);
}

function cleanNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function payoutStatus(input: PayoutInput): PayoutStatus {
  const now = input.now ?? Date.now();
  const balance = cleanNonNegative(input.balanceUsd);
  const threshold =
    input.thresholdUsd !== undefined &&
    Number.isFinite(input.thresholdUsd) &&
    input.thresholdUsd > 0
      ? input.thresholdUsd
      : DEFAULT_PAYOUT_THRESHOLD_USD;

  const remaining = Math.max(0, threshold - balance);
  const reached = balance >= threshold;
  const percent = roundPercent(Math.min(100, (balance / threshold) * 100));

  const explicitDaily = input.dailyEarningsUsd;
  const candidate =
    explicitDaily !== undefined && explicitDaily !== null
      ? explicitDaily
      : input.forecast?.slope ?? null;
  const daily =
    candidate !== null && Number.isFinite(candidate) && candidate > 0
      ? candidate
      : null;

  if (reached) {
    return {
      balanceUsd: balance,
      thresholdUsd: threshold,
      remainingUsd: 0,
      percent: 100,
      reached: true,
      dailyEarningsUsd: daily,
      etaDays: 0,
      etaDate: isoDate(now),
      reason: null,
    };
  }

  if (daily === null) {
    return {
      balanceUsd: balance,
      thresholdUsd: threshold,
      remainingUsd: remaining,
      percent,
      reached: false,
      dailyEarningsUsd: null,
      etaDays: null,
      etaDate: null,
      reason:
        'No positive daily earnings trend yet, so a payout date cannot be estimated.',
    };
  }

  const etaDays = Math.ceil(remaining / daily);
  return {
    balanceUsd: balance,
    thresholdUsd: threshold,
    remainingUsd: remaining,
    percent,
    reached: false,
    dailyEarningsUsd: daily,
    etaDays,
    etaDate: isoDate(now + etaDays * DAY_MS),
    reason: null,
  };
}
