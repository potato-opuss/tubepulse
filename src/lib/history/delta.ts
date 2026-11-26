import {
  DAY_MS,
  type DeltaResult,
  type HistoryMetric,
  type HistorySnapshot,
  type MetricPoint,
  type MomentumLabel,
  type WindowComparison,
} from './types';
import { pointAtOrBefore, toPoints } from './values';

/** Two days tolerates one missed daily collection without inventing data. */
export const DEFAULT_COVERAGE_MS = 2 * DAY_MS;

export const MOMENTUM_THRESHOLD_PERCENT = 10;

export type DeltaOptions = {
  toleranceMs?: number;
};

export type MomentumResult = {
  label: MomentumLabel;
  changePercent: number | null;
  reason: string | null;
};

/**
 * Nearest observed point at or before a boundary. Returns null when the
 * nearest point is older than the tolerance, so callers can say "not enough
 * data" instead of showing a stale value as if it were current.
 */
export function valueAtOrBefore(
  snapshots: readonly HistorySnapshot[],
  metric: HistoryMetric,
  boundary: number,
  toleranceMs: number = DEFAULT_COVERAGE_MS,
): MetricPoint | null {
  const points = toPoints(snapshots, metric);
  const point = pointAtOrBefore(points, boundary);
  if (!point) return null;
  if (boundary - point.ts > toleranceMs) return null;
  return point;
}

/** Change between two boundaries, using the nearest snapshot at/before each. */
export function delta(
  metric: HistoryMetric,
  from: number,
  to: number,
  snapshots: readonly HistorySnapshot[],
  options: DeltaOptions = {},
): DeltaResult {
  const empty: DeltaResult = {
    from: null,
    to: null,
    absolute: null,
    percent: null,
    perDay: null,
    reason: null,
  };

  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return { ...empty, reason: 'The end of the period must be after the start.' };
  }

  const tolerance = options.toleranceMs ?? DEFAULT_COVERAGE_MS;
  const fromPoint = valueAtOrBefore(snapshots, metric, from, tolerance);
  const toPoint = valueAtOrBefore(snapshots, metric, to, tolerance);

  if (!fromPoint || !toPoint) {
    return {
      ...empty,
      from: fromPoint,
      to: toPoint,
      reason: `Not enough ${metric} data near the start or end of this period.`,
    };
  }

  const absolute = toPoint.value - fromPoint.value;
  const percent = fromPoint.value > 0 ? (absolute / fromPoint.value) * 100 : null;
  const perDay = perDayRate(absolute, from, to);

  return {
    from: fromPoint,
    to: toPoint,
    absolute,
    percent,
    perDay,
    reason:
      percent === null
        ? 'The starting value is 0, so a percentage change is undefined.'
        : null,
  };
}

/** Absolute change divided by the number of days in the period. */
export function perDayRate(absolute: number, from: number, to: number): number | null {
  const days = (to - from) / DAY_MS;
  if (!Number.isFinite(absolute) || !Number.isFinite(days) || days <= 0) return null;
  return absolute / days;
}

/**
 * Last `days` growth vs the `days` before it. Growth is the change in the
 * metric, so a counter drop yields a negative growth (not a crash) and a
 * non-positive previous period yields null percent + reason.
 */
export function compareWindows(
  metric: HistoryMetric,
  snapshots: readonly HistorySnapshot[],
  now: number = Date.now(),
  days: number = 7,
  options: DeltaOptions = {},
): WindowComparison {
  const empty: WindowComparison = {
    currentGrowth: null,
    previousGrowth: null,
    currentPerDay: null,
    previousPerDay: null,
    changePercent: null,
    reason: null,
  };

  if (!Number.isFinite(now) || !Number.isFinite(days) || days <= 0) {
    return { ...empty, reason: 'The comparison window is not valid.' };
  }

  const span = days * DAY_MS;
  const current = delta(metric, now - span, now, snapshots, options);
  const previous = delta(metric, now - 2 * span, now - span, snapshots, options);

  if (current.absolute === null || previous.absolute === null) {
    return {
      ...empty,
      currentGrowth: current.absolute,
      previousGrowth: previous.absolute,
      reason:
        current.absolute === null
          ? `Not enough data for the last ${days} days.`
          : `Not enough data for the ${days} days before that.`,
    };
  }

  const changePercent =
    previous.absolute > 0
      ? ((current.absolute - previous.absolute) / previous.absolute) * 100
      : null;

  return {
    currentGrowth: current.absolute,
    previousGrowth: previous.absolute,
    currentPerDay: current.perDay,
    previousPerDay: previous.perDay,
    changePercent,
    reason:
      changePercent === null
        ? 'The previous period had no growth, so a percentage change is undefined.'
        : null,
  };
}

/** Accelerating / Steady / Slowing, or "Not enough data" with a reason. */
export function momentum(
  metric: HistoryMetric,
  snapshots: readonly HistorySnapshot[],
  now: number = Date.now(),
  options: DeltaOptions & { days?: number; thresholdPercent?: number } = {},
): MomentumResult {
  const comparison = compareWindows(metric, snapshots, now, options.days ?? 7, {
    ...(options.toleranceMs === undefined ? {} : { toleranceMs: options.toleranceMs }),
  });

  if (comparison.changePercent === null) {
    return {
      label: 'Not enough data',
      changePercent: null,
      reason: comparison.reason ?? 'Not enough data to measure momentum.',
    };
  }

  const threshold = options.thresholdPercent ?? MOMENTUM_THRESHOLD_PERCENT;
  const label: MomentumLabel =
    comparison.changePercent > threshold
      ? 'Accelerating'
      : comparison.changePercent < -threshold
        ? 'Slowing'
        : 'Steady';

  return { label, changePercent: comparison.changePercent, reason: null };
}
