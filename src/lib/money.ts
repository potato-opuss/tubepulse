import type { Currency } from './settings';

/**
 * Money rule: all values are computed in USD. TRY is a display-only
 * conversion using the rate stored in Settings — never a hard-coded rate.
 */
export function toDisplayAmount(
  usdAmount: number,
  currency: Currency,
  usdTryRate: number | null,
): number | null {
  if (!Number.isFinite(usdAmount)) return null;
  if (currency === 'USD') return usdAmount;
  if (usdTryRate === null || !Number.isFinite(usdTryRate) || usdTryRate <= 0) return null;
  return usdAmount * usdTryRate;
}

export function formatMoney(
  amount: number,
  currency: Currency,
  options: { compact?: boolean; maximumFractionDigits?: number } = {},
): string {
  const { compact = false, maximumFractionDigits = 2 } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Converts a USD amount and formats it. Returns null when the display
 * currency has no stored rate, so callers can ask for one instead of
 * showing a misleading 0.
 */
export function formatDisplayMoney(
  usdAmount: number,
  currency: Currency,
  usdTryRate: number | null,
  options?: { compact?: boolean; maximumFractionDigits?: number },
): string | null {
  const amount = toDisplayAmount(usdAmount, currency, usdTryRate);
  if (amount === null) return null;
  return formatMoney(amount, currency, options);
}

/** An estimate is always a range with a mid value. */
export type Estimate = {
  lowUsd: number;
  midUsd: number;
  highUsd: number;
};

export function makeEstimate(lowUsd: number, highUsd: number): Estimate | null {
  if (!Number.isFinite(lowUsd) || !Number.isFinite(highUsd)) return null;
  if (lowUsd < 0 || highUsd < lowUsd) return null;
  return { lowUsd, highUsd, midUsd: (lowUsd + highUsd) / 2 };
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}
