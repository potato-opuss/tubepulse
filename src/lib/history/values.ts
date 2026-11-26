import {
  BUCKET_MS,
  DAY_MS,
  HOUR_MS,
  WEEK_MS,
  type HistoryBucket,
  type HistoryMetric,
  type HistorySnapshot,
  type MetricPoint,
  type VideoSnapshot,
} from './types';

export function isVideoSnapshot(snapshot: HistorySnapshot): snapshot is VideoSnapshot {
  return 'videoId' in snapshot;
}

/** null means the metric does not exist on this snapshot kind. */
export function readMetric(metric: HistoryMetric, snapshot: HistorySnapshot): number | null {
  if (isVideoSnapshot(snapshot)) {
    switch (metric) {
      case 'views':
        return snapshot.views;
      case 'likes':
        return snapshot.likes;
      case 'comments':
        return snapshot.comments;
      case 'subs':
      case 'videoCount':
        return null;
    }
  }

  switch (metric) {
    case 'subs':
      return snapshot.subs;
    case 'views':
      return snapshot.views;
    case 'videoCount':
      return snapshot.videoCount;
    case 'likes':
    case 'comments':
      return null;
  }
}

export function metricAppliesToSnapshots(
  metric: HistoryMetric,
  snapshots: readonly HistorySnapshot[],
): boolean {
  return snapshots.some((snapshot) => readMetric(metric, snapshot) !== null);
}

function isValidValue(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

/** Sorted, de-duplicated observed points. Missing values are skipped. */
export function toPoints(
  snapshots: readonly HistorySnapshot[],
  metric: HistoryMetric,
): MetricPoint[] {
  const byTs = new Map<number, MetricPoint>();

  for (const snapshot of snapshots) {
    if (!Number.isFinite(snapshot.ts) || snapshot.ts <= 0) continue;
    const value = readMetric(metric, snapshot);
    if (!isValidValue(value)) continue;
    byTs.set(snapshot.ts, { ts: snapshot.ts, value });
  }

  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

/** Nearest observed point at or before the boundary, or null. */
export function pointAtOrBefore(
  points: readonly MetricPoint[],
  boundary: number,
): MetricPoint | null {
  let low = 0;
  let high = points.length - 1;
  let found: MetricPoint | null = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const point = points[middle];
    if (!point) break;
    if (point.ts <= boundary) {
      found = point;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/** Aligns a timestamp down to the start of its UTC hour/day/week (Monday). */
export function alignBucket(ts: number, bucket: HistoryBucket): number {
  if (bucket === 'hour') return Math.floor(ts / HOUR_MS) * HOUR_MS;

  const dayStart = Math.floor(ts / DAY_MS) * DAY_MS;
  if (bucket === 'day') return dayStart;

  const dayOfWeek = (new Date(dayStart).getUTCDay() + 6) % 7;
  return dayStart - dayOfWeek * DAY_MS;
}

/**
 * How stale a carried-forward point may be before the bucket becomes a gap.
 * Two bucket widths, capped so a weekly view still tolerates a missed run.
 */
export function coverageToleranceMs(bucket: HistoryBucket): number {
  if (bucket === 'hour') return 2 * HOUR_MS;
  if (bucket === 'day') return 2 * DAY_MS;
  return 14 * DAY_MS;
}

export function bucketLengthMs(bucket: HistoryBucket): number {
  return BUCKET_MS[bucket];
}

export { WEEK_MS };
