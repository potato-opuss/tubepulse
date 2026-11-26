/**
 * History types. Snapshots are the only source of truth for growth: the app
 * never invents a value for a period it did not observe.
 */

export type ChannelSnapshot = {
  /** Epoch milliseconds. One channel point per timestamp. */
  ts: number;
  subs: number | null;
  views: number | null;
  videoCount: number | null;
  /** YouTube publicly rounds subscriber counts at 1,000+. */
  subsRounded: boolean;
};

export type VideoSnapshot = {
  videoId: string;
  ts: number;
  views: number | null;
  likes: number | null;
  comments: number | null;
};

export type HistorySnapshot = ChannelSnapshot | VideoSnapshot;

export type HistoryMetric = 'subs' | 'views' | 'videoCount' | 'likes' | 'comments';

export type HistoryRange = '24h' | '7d' | '30d' | '90d';

export type HistoryBucket = 'hour' | 'day' | 'week';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

export const RANGE_MS: Record<HistoryRange, number> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
};

export const BUCKET_MS: Record<HistoryBucket, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
  week: WEEK_MS,
};

export type SeriesBucket = {
  start: number;
  end: number;
  /** null when the bucket has no coverage — never 0 as a stand-in. */
  value: number | null;
  /** True when the value is carried forward, not observed in this bucket. */
  interpolated: boolean;
  /** Number of observed snapshots inside the bucket. */
  samples: number;
};

export type SeriesResult = {
  metric: HistoryMetric;
  range: HistoryRange;
  bucket: HistoryBucket;
  points: SeriesBucket[];
  reason: string | null;
};

export type MetricPoint = {
  ts: number;
  value: number;
};

export type DeltaResult = {
  from: MetricPoint | null;
  to: MetricPoint | null;
  absolute: number | null;
  percent: number | null;
  perDay: number | null;
  reason: string | null;
};

export type WindowComparison = {
  currentGrowth: number | null;
  previousGrowth: number | null;
  currentPerDay: number | null;
  previousPerDay: number | null;
  changePercent: number | null;
  reason: string | null;
};

export type MomentumLabel = 'Accelerating' | 'Steady' | 'Slowing' | 'Not enough data';
