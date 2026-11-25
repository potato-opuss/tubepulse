import { describe, expect, it } from 'vitest';
import { isCurrency, isTheme, parseRate } from './settings';

describe('parseRate', () => {
  it('accepts positive numbers', () => {
    expect(parseRate('34.5')).toBe(34.5);
    expect(parseRate(' 1 ')).toBe(1);
  });

  it('rejects empty, invalid, zero and negative values', () => {
    expect(parseRate('')).toBeNull();
    expect(parseRate('   ')).toBeNull();
    expect(parseRate('abc')).toBeNull();
    expect(parseRate('0')).toBeNull();
    expect(parseRate('-34')).toBeNull();
    expect(parseRate(null)).toBeNull();
  });
});

describe('theme and currency guards', () => {
  it('only accepts supported values', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isCurrency('TRY')).toBe(true);
    expect(isCurrency('EUR')).toBe(false);
  });
});
