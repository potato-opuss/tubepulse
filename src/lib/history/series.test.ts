import { describe, expect, it } from 'vitest';
import { getSeries } from './series';
import type { ChannelSnapshot, VideoSnapshot } from './types';

const DAY = 86_400_000;
const HOUR = 3_600_000;

function channel(ts: number, subs: number, views = subs * 10, videoCount = 20): ChannelSnapshot {
  return { ts, subs, views, videoCount, subsRounded: subs >= 1000 };
}

function video(ts: number, views: number): VideoSnapshot {
  return { videoId: 'vid1', ts, views, likes: 1, comments: 0 };
}

describe('getSeries', () => {
  it('buckets observed daily values and marks the carried tail as interpolated', () => {
    const now = Date.UTC(2026, 0, 8, 12);
    const points = Array.from({ length: 7 }, (_, index) =>
      channel(Date.UTC(2026, 0, 1 + index, 12), 100 + index * 10),
    );

    const series = getSeries('subs', '7d', 'day', points, now);

    expect(series.reason).toBeNull();
    expect(series.points).toHaveLength(8);
    expect(series.points[0]?.value).toBe(100);
    expect(series.points[0]?.interpolated).toBe(false);
    expect(series.points[6]?.value).toBe(160);
    expect(series.points[7]?.value).toBe(160);
    expect(series.points[7]?.interpolated).toBe(true);
  });

  it('returns null gaps instead of 0 when coverage is missing', () => {
    const now = Date.UTC(2026, 0, 8, 0);
    const points = [
      channel(Date.UTC(2026, 0, 1, 0), 100),
      channel(Date.UTC(2026, 0, 5, 0), 140),
    ];

    const series = getSeries('subs', '7d', 'day', points, now);

    expect(series.points[0]?.value).toBe(100);
    expect(series.points[1]?.interpolated).toBe(true);
    expect(series.points[3]?.value).toBeNull();
    expect(series.points[3]?.interpolated).toBe(false);
    expect(series.points[4]?.value).toBe(140);
  });

  it('keeps a counter drop as an observed value without crashing', () => {
    const now = Date.UTC(2026, 0, 4, 0);
    const points = [
      channel(Date.UTC(2026, 0, 1, 0), 100),
      channel(Date.UTC(2026, 0, 2, 0), 90),
      channel(Date.UTC(2026, 0, 3, 0), 95),
    ];

    const series = getSeries('subs', '7d', 'day', points, now);

    const values = series.points.map((point) => point.value).filter((value) => value !== null);
    expect(values).toEqual([100, 90, 95]);
    expect(values.every((value) => Number.isFinite(value))).toBe(true);
  });

  it('explains when there are no snapshots at all', () => {
    const series = getSeries('views', '24h', 'hour', [], Date.UTC(2026, 0, 2));

    expect(series.reason).toContain('No snapshots yet');
    expect(series.points).toHaveLength(0);
  });

  it('rejects a metric the snapshot kind does not have', () => {
    const series = getSeries('likes', '7d', 'day', [channel(Date.now(), 10)], Date.now());

    expect(series.reason).toContain('no likes values');
  });

  it('refuses a bucket count above the cap', () => {
    const series = getSeries('views', '90d', 'hour', [video(Date.now(), 10)], Date.now());

    expect(series.points).toHaveLength(0);
    expect(series.reason).toContain('Pick a larger bucket');
  });

  it('aligns weekly buckets to Monday', () => {
    const monday = Date.UTC(2026, 0, 5);
    const points = [video(monday + 2 * HOUR, 50)];
    const series = getSeries('views', '30d', 'week', points, monday + 3 * DAY);

    const observed = series.points.find((point) => point.samples > 0);
    expect(observed?.start).toBe(monday);
  });
});
