import { describe, expect, it } from 'vitest';
import { compareWindows, delta, momentum, valueAtOrBefore } from './delta';
import type { ChannelSnapshot } from './types';

const DAY = 86_400_000;
const BASE = Date.UTC(2026, 0, 1);

function channel(ts: number, subs: number): ChannelSnapshot {
  return { ts, subs, views: subs * 10, videoCount: 10, subsRounded: false };
}

function daily(values: readonly number[]): ChannelSnapshot[] {
  return values.map((value, index) => channel(BASE + index * DAY, value));
}

describe('valueAtOrBefore', () => {
  it('uses the nearest snapshot at or before the boundary', () => {
    const points = daily([100, 110, 120]);
    const point = valueAtOrBefore(points, 'subs', BASE + 2 * DAY + 5_000, DAY);

    expect(point).toEqual({ ts: BASE + 2 * DAY, value: 120 });
  });

  it('returns null when the nearest point is older than the tolerance', () => {
    const points = daily([100]);
    expect(valueAtOrBefore(points, 'subs', BASE + 3 * DAY, 2 * DAY)).toBeNull();
  });
});

describe('delta', () => {
  it('computes absolute, percent and per-day change', () => {
    const points = daily([100, 120, 150, 200, 300]);
    const result = delta('subs', BASE, BASE + 4 * DAY, points);

    expect(result.absolute).toBe(200);
    expect(result.percent).toBe(200);
    expect(result.perDay).toBeCloseTo(50);
    expect(result.reason).toBeNull();
  });

  it('returns null + reason when the start has no coverage', () => {
    const points = daily([100, 110]);
    const result = delta('subs', BASE - 2 * DAY, BASE + DAY, points);

    expect(result.absolute).toBeNull();
    expect(result.percent).toBeNull();
    expect(result.reason).toContain('Not enough subs data');
  });

  it('handles a counter drop without crashing or dividing by zero', () => {
    const points = daily([100, 90]);
    const result = delta('subs', BASE, BASE + DAY, points);

    expect(result.absolute).toBe(-10);
    expect(result.percent).toBe(-10);
    expect(result.perDay).toBe(-10);
  });

  it('explains an undefined percent when the start is 0', () => {
    const points = daily([0, 50]);
    const result = delta('subs', BASE, BASE + DAY, points);

    expect(result.absolute).toBe(50);
    expect(result.percent).toBeNull();
    expect(result.reason).toContain('starting value is 0');
  });

  it('rejects an end before the start', () => {
    const result = delta('subs', BASE + DAY, BASE, daily([1, 2]));
    expect(result.absolute).toBeNull();
    expect(result.reason).toContain('after the start');
  });
});

describe('compareWindows', () => {
  const now = BASE + 20 * DAY;

  it('compares last 7 days with the previous 7 days', () => {
    const points = daily(Array.from({ length: 21 }, (_, index) => index * 10));
    const result = compareWindows('subs', points, now);

    expect(result.currentGrowth).toBe(70);
    expect(result.previousGrowth).toBe(70);
    expect(result.changePercent).toBe(0);
    expect(result.currentPerDay).toBeCloseTo(10);
  });

  it('reports not enough data when a window has no coverage', () => {
    const result = compareWindows('subs', daily([100, 110]), now);

    expect(result.currentGrowth).toBeNull();
    expect(result.reason).toContain('Not enough data');
  });

  it('avoids a percent when the previous period did not grow', () => {
    const points = daily(Array.from({ length: 21 }, () => 100));
    const result = compareWindows('subs', points, now);

    expect(result.currentGrowth).toBe(0);
    expect(result.previousGrowth).toBe(0);
    expect(result.changePercent).toBeNull();
    expect(result.reason).toContain('no growth');
  });
});

describe('momentum', () => {
  const now = BASE + 20 * DAY;

  it('labels accelerating growth', () => {
    const points = daily(Array.from({ length: 21 }, (_, index) => index * index * 10));
    const result = momentum('subs', points, now);

    expect(result.label).toBe('Accelerating');
    expect(result.changePercent).toBeGreaterThan(10);
  });

  it('labels slowing growth', () => {
    const points = daily(
      Array.from({ length: 21 }, (_, index) => Math.round(1000 * Math.sqrt(index))),
    );
    const result = momentum('subs', points, now);

    expect(result.label).toBe('Slowing');
  });

  it('labels flat growth as steady', () => {
    const points = daily(Array.from({ length: 21 }, (_, index) => index * 10));
    expect(momentum('subs', points, now).label).toBe('Steady');
  });

  it('returns not enough data with a reason', () => {
    const result = momentum('subs', daily([100]), now);

    expect(result.label).toBe('Not enough data');
    expect(result.reason).not.toBeNull();
  });
});
