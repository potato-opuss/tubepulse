/**
 * Weighted linear regression over the most recent daily points. Fewer than
 * 7 points is not a forecast — it returns null values plus a reason.
 */

export const MIN_FORECAST_POINTS = 7;
export const MAX_FORECAST_POINTS = 28;
export const DEFAULT_HORIZON_DAYS = 7;
/** ~95% interval from the residual spread. */
export const FORECAST_Z = 1.96;

export type ForecastOptions = {
  /** Days past the last observed point. Defaults to 7. */
  horizonDays?: number;
  /** How many recent points to use, clamped to 7–28. Defaults to 28. */
  maxPoints?: number;
};

export type ForecastResult = {
  low: number | null;
  mid: number | null;
  high: number | null;
  /** Weighted daily slope, useful for payout ETA. */
  slope: number | null;
  residualStd: number | null;
  points: number;
  horizonDays: number;
  method: 'weighted-linear-regression';
  reason: string | null;
};

function clampHorizon(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return DEFAULT_HORIZON_DAYS;
  }
  return Math.floor(value);
}

function clampWindow(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return MAX_FORECAST_POINTS;
  return Math.min(MAX_FORECAST_POINTS, Math.max(MIN_FORECAST_POINTS, Math.floor(value)));
}

export function forecast(
  values: readonly number[],
  options: ForecastOptions = {},
): ForecastResult {
  const horizonDays = clampHorizon(options.horizonDays);
  const maxPoints = clampWindow(options.maxPoints);
  const base: ForecastResult = {
    low: null,
    mid: null,
    high: null,
    slope: null,
    residualStd: null,
    points: 0,
    horizonDays,
    method: 'weighted-linear-regression',
    reason: null,
  };

  const clean = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const window = clean.slice(-maxPoints);

  if (window.length < MIN_FORECAST_POINTS) {
    return {
      ...base,
      points: window.length,
      reason: `Need at least ${MIN_FORECAST_POINTS} daily points; got ${window.length}.`,
    };
  }

  const n = window.length;
  let sumWeight = 0;
  let sumWeightedX = 0;
  let sumWeightedY = 0;

  for (let index = 0; index < n; index += 1) {
    const weight = index + 1;
    sumWeight += weight;
    sumWeightedX += weight * index;
    sumWeightedY += weight * (window[index] ?? 0);
  }

  const xBar = sumWeightedX / sumWeight;
  const yBar = sumWeightedY / sumWeight;
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < n; index += 1) {
    const weight = index + 1;
    const dx = index - xBar;
    numerator += weight * dx * ((window[index] ?? 0) - yBar);
    denominator += weight * dx * dx;
  }

  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = yBar - slope * xBar;
  const targetX = n - 1 + horizonDays;
  const mid = Math.max(0, intercept + slope * targetX);

  let residualSum = 0;
  for (let index = 0; index < n; index += 1) {
    const weight = index + 1;
    const fitted = intercept + slope * index;
    const residual = (window[index] ?? 0) - fitted;
    residualSum += weight * residual * residual;
  }
  const residualStd = Math.sqrt(residualSum / sumWeight);
  const low = Math.max(0, mid - FORECAST_Z * residualStd);
  const high = Math.max(0, mid + FORECAST_Z * residualStd);

  return {
    low,
    mid,
    high,
    slope,
    residualStd,
    points: n,
    horizonDays,
    method: 'weighted-linear-regression',
    reason: null,
  };
}

export function isForecastAvailable(
  result: ForecastResult,
): result is ForecastResult & { low: number; mid: number; high: number; slope: number } {
  return (
    result.low !== null &&
    result.mid !== null &&
    result.high !== null &&
    result.slope !== null
  );
}
