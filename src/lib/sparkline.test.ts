import { describe, expect, it } from 'vitest';
import { sparklinePoints } from './sparkline';

describe('sparklinePoints', () => {
  it('maps the series between the padded edges', () => {
    expect(sparklinePoints([0, 5, 10], 100, 20, 2)).toBe('2.0,18.0 50.0,10.0 98.0,2.0');
  });

  it('does not divide by zero for a flat series', () => {
    const points = sparklinePoints([4, 4, 4], 100, 20);
    expect(points.split(' ')).toHaveLength(3);
    expect(points).not.toContain('NaN');
  });

  it('returns an empty string when there is not enough data', () => {
    expect(sparklinePoints([1], 100, 20)).toBe('');
    expect(sparklinePoints([], 100, 20)).toBe('');
    expect(sparklinePoints([1, 2], 0, 20)).toBe('');
  });
});
