import { describe, expect, it } from 'vitest';
import { blendedRpm, estimateRevenue } from './estimate';

describe('estimateRevenue', () => {
  it('returns zeros for zero views', () => {
    const result = estimateRevenue({ longViews: 0, shortViews: 0, countryMix: { US: 1 } });
    expect(result.low).toBe(0);
    expect(result.mid).toBe(0);
    expect(result.high).toBe(0);
    expect(result.breakdown).toEqual([]);
    expect(result.reason).toBeNull();
  });

  it('estimates long-form revenue from views / 1000 × RPM', () => {
    const result = estimateRevenue({ longViews: 1_000, shortViews: 0, countryMix: { US: 1 } });
    expect(result.low).toBeCloseTo(2);
    expect(result.mid).toBeCloseTo(4.5);
    expect(result.high).toBeCloseTo(9);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]?.tier).toBe('premium');
    expect(result.breakdown[0]?.format).toBe('long');
  });

  it('estimates Shorts revenue with the Shorts table', () => {
    const result = estimateRevenue({
      longViews: 0,
      shortViews: 100_000,
      countryMix: { US: 1 },
    });
    expect(result.low).toBeCloseTo(3);
    expect(result.mid).toBeCloseTo(7);
    expect(result.high).toBeCloseTo(15);
  });

  it('normalizes country weights to 100%', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 3, DE: 1 },
    });
    expect(result.countryMixNormalized).toBe(true);
    expect(result.mid).toBeCloseTo(4.125);
    expect(result.low).toBeCloseTo(1.8);
    expect(result.high).toBeCloseTo(8.25);
    expect(result.breakdown).toHaveLength(2);
  });

  it('keeps low <= mid <= high for mixed countries and formats', () => {
    const result = estimateRevenue({
      longViews: 12_345,
      shortViews: 678_900,
      countryMix: { US: 0.4, DE: 0.3, BR: 0.2, TR: 0.1 },
      calibration: { long: 1.4, short: 0.8 },
    });
    expect(result.low).toBeLessThanOrEqual(result.mid);
    expect(result.mid).toBeLessThanOrEqual(result.high);
    expect(result.breakdown.length).toBe(8);
  });

  it('uses the low tier for unknown countries', () => {
    const result = estimateRevenue({ longViews: 1_000, shortViews: 0, countryMix: { XX: 1 } });
    expect(result.low).toBeCloseTo(0.15);
    expect(result.mid).toBeCloseTo(0.5);
    expect(result.high).toBeCloseTo(1.2);
  });

  it('applies calibration factors per format', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 1 },
      calibration: { long: 2 },
    });
    expect(result.low).toBeCloseTo(4);
    expect(result.mid).toBeCloseTo(9);
    expect(result.high).toBeCloseTo(18);
    expect(result.calibration.long).toBe(2);
  });

  it('clamps calibration factors inside the estimate', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 1 },
      calibration: { long: 50 },
    });
    expect(result.mid).toBeCloseTo(22.5);
  });

  it('returns earned 0 and a separate potential range when not monetized', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 1 },
      monetized: false,
    });
    expect(result.low).toBe(0);
    expect(result.mid).toBe(0);
    expect(result.high).toBe(0);
    expect(result.potential).toEqual({ low: 2, mid: 4.5, high: 9 });
    expect(result.reason).toContain('Not monetized');
  });

  it('explains an empty country mix instead of inventing a tier', () => {
    const result = estimateRevenue({ longViews: 1_000, shortViews: 0, countryMix: {} });
    expect(result.mid).toBe(0);
    expect(result.reason).toContain('Country mix is empty');
  });

  it('accepts a per-format RPM override', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 1 },
      overrides: { long: { low: 1, mid: 2, high: 3 } },
    });
    expect(result.low).toBeCloseTo(1);
    expect(result.mid).toBeCloseTo(2);
    expect(result.high).toBeCloseTo(3);
  });

  it('ignores invalid override ranges and uses defaults', () => {
    const result = estimateRevenue({
      longViews: 1_000,
      shortViews: 0,
      countryMix: { US: 1 },
      overrides: { long: { low: 9, mid: 1, high: 2 } },
    });
    expect(result.mid).toBeCloseTo(4.5);
  });
});

describe('blendedRpm', () => {
  it('weights RPM by normalized country mix', () => {
    const result = blendedRpm('long', { US: 1, DE: 1 });
    expect(result?.low).toBeCloseTo(1.6);
    expect(result?.mid).toBeCloseTo(3.75);
    expect(result?.high).toBeCloseTo(7.5);
  });

  it('returns null for an empty mix', () => {
    expect(blendedRpm('short', {})).toBeNull();
  });
});
