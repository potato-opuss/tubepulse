import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HORIZON_DAYS,
  MAX_FORECAST_POINTS,
  MIN_FORECAST_POINTS,
  forecast,
  isForecastAvailable,
} from './forecast';

function number(value: number | null): number {
  expect(value).not.toBeNull();
  return value ?? Number.NaN;
}

describe('forecast', () => {
  it('returns null values and a reason with fewer than 7 points', () => {
    const result = forecast([10, 20, 30, 40, 50, 60]);
    expect(result.mid).toBeNull();
    expect(result.low).toBeNull();
    expect(result.high).toBeNull();
    expect(result.points).toBe(6);
    expect(result.reason).toContain(`at least ${MIN_FORECAST_POINTS}`);
  });

  it('projects a clean linear trend', () => {
    const result = forecast([10, 20, 30, 40, 50, 60, 70], { horizonDays: 7 });
    expect(number(result.mid)).toBeCloseTo(140);
    expect(number(result.slope)).toBeCloseTo(10);
    expect(number(result.low)).toBeCloseTo(140);
    expect(number(result.high)).toBeCloseTo(140);
    expect(result.horizonDays).toBe(7);
  });

  it('clamps a negative projection at 0', () => {
    const result = forecast([70, 60, 50, 40, 30, 20, 10]);
    expect(number(result.mid)).toBe(0);
    expect(number(result.low)).toBe(0);
    expect(number(result.high)).toBeGreaterThanOrEqual(0);
  });

  it('keeps low <= mid <= high with noisy data', () => {
    const result = forecast([10, 40, 20, 50, 30, 60, 45, 70, 55]);
    expect(number(result.low)).toBeLessThanOrEqual(number(result.mid));
    expect(number(result.mid)).toBeLessThanOrEqual(number(result.high));
    expect(number(result.residualStd)).toBeGreaterThan(0);
  });

  it('uses at most the last 28 daily points', () => {
    const values = Array.from({ length: 40 }, (_, index) => index * 10);
    const result = forecast(values);
    expect(result.points).toBe(MAX_FORECAST_POINTS);
  });

  it('defaults to a 7-day horizon', () => {
    expect(forecast([1, 2, 3, 4, 5, 6, 7]).horizonDays).toBe(DEFAULT_HORIZON_DAYS);
  });

  it('treats negative or non-finite values as 0', () => {
    const result = forecast([-5, 0, 5, 10, 15, 20, 25, Number.NaN]);
    expect(number(result.mid)).toBeGreaterThanOrEqual(0);
    expect(number(result.low)).toBeGreaterThanOrEqual(0);
  });

  it('reports availability only when the range is complete', () => {
    expect(isForecastAvailable(forecast([1, 2, 3, 4, 5, 6, 7]))).toBe(true);
    expect(isForecastAvailable(forecast([1, 2, 3]))).toBe(false);
  });
});
