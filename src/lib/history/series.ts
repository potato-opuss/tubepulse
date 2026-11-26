import {
  RANGE_MS,
  type HistoryBucket,
  type HistoryMetric,
  type HistoryRange,
  type HistorySnapshot,
  type SeriesBucket,
  type SeriesResult,
} from './types';
import {
  alignBucket,
  bucketLengthMs,
  coverageToleranceMs,
  metricAppliesToSnapshots,
  pointAtOrBefore,
  toPoints,
} from './values';

const MAX_BUCKETS = 400;

/**
 * Buckets observed snapshots for a metric over a range.
 *
 * Missing buckets stay null (never 0). When a bucket has no sample but a
 * recent earlier point exists, the value is carried forward and flagged as
 * interpolated. Counter drops are kept as observed values — a public view
 * count can fall after YouTube removes spam views.
 */
export function getSeries(
  metric: HistoryMetric,
  range: HistoryRange,
  bucket: HistoryBucket,
  snapshots: readonly HistorySnapshot[],
  now: number = Date.now(),
): SeriesResult {
  const base: SeriesResult = { metric, range, bucket, points: [], reason: null };

  if (!Number.isFinite(now)) {
    return { ...base, reason: 'The clock is not available.' };
  }

  if (snapshots.length > 0 && !metricAppliesToSnapshots(metric, snapshots)) {
    return { ...base, reason: `This data has no ${metric} values.` };
  }

  const points = toPoints(snapshots, metric);
  if (points.length === 0) {
    return {
      ...base,
      reason: 'No snapshots yet. Keep the app open while connected to collect data.',
    };
  }

  const bucketMs = bucketLengthMs(bucket);
  const from = now - RANGE_MS[range];
  const firstStart = alignBucket(from, bucket);
  const bucketCount = Math.ceil((now - firstStart) / bucketMs);

  if (bucketCount > MAX_BUCKETS) {
    return {
      ...base,
      reason: `That range needs ${bucketCount} ${bucket} buckets. Pick a larger bucket.`,
    };
  }

  const tolerance = coverageToleranceMs(bucket);
  const buckets: SeriesBucket[] = [];

  for (let index = 0; index < bucketCount; index += 1) {
    const start = firstStart + index * bucketMs;
    const end = start + bucketMs;
    const samples = points.filter((point) => point.ts >= start && point.ts < end);

    if (samples.length > 0) {
      const last = samples[samples.length - 1];
      if (last) {
        buckets.push({
          start,
          end,
          value: last.value,
          interpolated: false,
          samples: samples.length,
        });
        continue;
      }
    }

    const previous = pointAtOrBefore(points, start);
    const carry = previous && start - previous.ts <= tolerance ? previous.value : null;
    buckets.push({
      start,
      end,
      value: carry,
      interpolated: carry !== null,
      samples: 0,
    });
  }

  const hasValue = buckets.some((item) => item.value !== null);
  return {
    ...base,
    points: buckets,
    reason: hasValue ? null : 'No snapshot is close enough to cover this range yet.',
  };
}
