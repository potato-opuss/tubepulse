import { describe, expect, it } from 'vitest';
import {
  formatDelta,
  formatDisplayMoney,
  formatMoney,
  makeEstimate,
  toDisplayAmount,
} from './money';

describe('toDisplayAmount', () => {
  it('returns USD unchanged', () => {
    expect(toDisplayAmount(123.45, 'USD', null)).toBe(123.45);
  });

  it('converts USD to TRY at the stored rate', () => {
    expect(toDisplayAmount(10, 'TRY', 34.5)).toBeCloseTo(345);
  });

  it('returns null for TRY without a rate instead of showing 0', () => {
    expect(toDisplayAmount(10, 'TRY', null)).toBeNull();
  });

  it('rejects invalid rates and amounts', () => {
    expect(toDisplayAmount(10, 'TRY', 0)).toBeNull();
    expect(toDisplayAmount(10, 'TRY', -4)).toBeNull();
    expect(toDisplayAmount(Number.NaN, 'USD', null)).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats USD with Intl', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('formats TRY with Intl', () => {
    const formatted = formatMoney(345, 'TRY');
    expect(formatted).toContain('345.00');
  });

  it('returns null when the display currency has no stored rate', () => {
    expect(formatDisplayMoney(10, 'TRY', null)).toBeNull();
  });

  it('explains missing rates rather than silently interpolating', () => {
    expect(formatDisplayMoney(10, 'USD', null)).toBe('$10.00');
  });
});

describe('makeEstimate', () => {
  it('builds a range with a mid value', () => {
    const estimate = makeEstimate(10, 20);
    expect(estimate).toEqual({ lowUsd: 10, highUsd: 20, midUsd: 15 });
  });

  it('rejects inverted or invalid ranges', () => {
    expect(makeEstimate(20, 10)).toBeNull();
    expect(makeEstimate(-1, 10)).toBeNull();
    expect(makeEstimate(Number.NaN, 10)).toBeNull();
  });
});

describe('formatDelta', () => {
  it('adds a sign and trims decimals', () => {
    expect(formatDelta(2.5)).toBe('+2.5%');
    expect(formatDelta(-3)).toBe('-3%');
    expect(formatDelta(0)).toBe('0%');
  });
});
