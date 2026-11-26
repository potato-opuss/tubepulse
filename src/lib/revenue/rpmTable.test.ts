import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LONG_RPM,
  DEFAULT_SHORT_RPM,
  countryTier,
  isKnownCountry,
  isValidRpmRange,
  normalizeCountryCode,
  rpmFor,
} from './rpmTable';

describe('RPM table', () => {
  it('uses the specified long-form ranges', () => {
    expect(DEFAULT_LONG_RPM.premium).toMatchObject({ low: 2, mid: 4.5, high: 9 });
    expect(DEFAULT_LONG_RPM.high).toMatchObject({ low: 1.2, mid: 3, high: 6 });
    expect(DEFAULT_LONG_RPM.mid).toMatchObject({ low: 0.5, mid: 1.2, high: 2.5 });
    expect(DEFAULT_LONG_RPM.low).toMatchObject({ low: 0.15, mid: 0.5, high: 1.2 });
  });

  it('uses the specified Shorts ranges', () => {
    expect(DEFAULT_SHORT_RPM.premium).toMatchObject({ low: 0.03, mid: 0.07, high: 0.15 });
    expect(DEFAULT_SHORT_RPM.high).toMatchObject({ low: 0.02, mid: 0.05, high: 0.1 });
    expect(DEFAULT_SHORT_RPM.mid).toMatchObject({ low: 0.01, mid: 0.03, high: 0.06 });
    expect(DEFAULT_SHORT_RPM.low).toMatchObject({ low: 0.003, mid: 0.01, high: 0.03 });
  });

  it('classifies known countries into the right tiers', () => {
    expect(countryTier('US')).toBe('premium');
    expect(countryTier('DE')).toBe('high');
    expect(countryTier('BR')).toBe('mid');
    expect(countryTier('TR')).toBe('low');
    expect(countryTier('IN')).toBe('low');
  });

  it('falls back to the low tier for unknown or empty countries', () => {
    expect(countryTier('XX')).toBe('low');
    expect(countryTier('')).toBe('low');
    expect(isKnownCountry('XX')).toBe(false);
  });

  it('normalizes lowercase and whitespace', () => {
    expect(normalizeCountryCode(' us ')).toBe('US');
    expect(countryTier('de')).toBe('high');
    expect(rpmFor('long', 'gb')).toEqual(DEFAULT_LONG_RPM.premium);
  });

  it('validates RPM ranges', () => {
    expect(isValidRpmRange({ low: 1, mid: 2, high: 3 })).toBe(true);
    expect(isValidRpmRange({ low: 2, mid: 1, high: 3 })).toBe(false);
    expect(isValidRpmRange({ low: -1, mid: 2, high: 3 })).toBe(false);
    expect(isValidRpmRange(null)).toBe(false);
  });
});
