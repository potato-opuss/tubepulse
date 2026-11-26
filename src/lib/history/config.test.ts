import { describe, expect, it } from 'vitest';
import { intervalToMs, parseCollectInterval } from './config';
import { formatAge } from './format';

describe('parseCollectInterval', () => {
  it('accepts only 1, 5 and 15 minutes', () => {
    expect(parseCollectInterval('5')).toBe(5);
    expect(parseCollectInterval('15')).toBe(15);
    expect(parseCollectInterval('1')).toBe(1);
    expect(parseCollectInterval('30')).toBe(1);
    expect(parseCollectInterval(null)).toBe(1);
  });
});

describe('intervalToMs', () => {
  it('converts minutes to milliseconds', () => {
    expect(intervalToMs(1)).toBe(60_000);
    expect(intervalToMs(15)).toBe(900_000);
  });
});

describe('formatAge', () => {
  it('formats seconds, minutes, hours and days', () => {
    expect(formatAge(2_000)).toBe('just now');
    expect(formatAge(12_000)).toBe('12s ago');
    expect(formatAge(90_000)).toBe('1m ago');
    expect(formatAge(3 * 3_600_000)).toBe('3h ago');
    expect(formatAge(2 * 86_400_000)).toBe('2d ago');
  });

  it('does not show a negative age', () => {
    expect(formatAge(-1)).toBe('just now');
  });
});
