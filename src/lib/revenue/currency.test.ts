import { describe, expect, it } from 'vitest';
import {
  RATE_CACHE_TTL_MS,
  convertUsdToTry,
  fallbackRate,
  getUsdTryRate,
  isCacheFresh,
  parseFrankfurterResponse,
  parseRateCache,
  roundTry,
} from './currency';

const NOW = Date.UTC(2026, 0, 10, 12);
const HOUR = 3_600_000;

function okResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

describe('Frankfurter parsing', () => {
  it('reads the TRY rate and date', () => {
    expect(
      parseFrankfurterResponse({
        amount: 1,
        base: 'USD',
        date: '2026-01-09',
        rates: { TRY: 34.56 },
      }),
    ).toEqual({ rate: 34.56, date: '2026-01-09' });
  });

  it('rejects malformed responses', () => {
    expect(parseFrankfurterResponse(null)).toBeNull();
    expect(parseFrankfurterResponse({ date: '2026-01-09', rates: {} })).toBeNull();
    expect(parseFrankfurterResponse({ date: '09/01/2026', rates: { TRY: 34.5 } })).toBeNull();
  });

  it('parses a stored cache defensively', () => {
    expect(parseRateCache({ rate: 34.5, date: '2026-01-09', fetchedAt: NOW })).toEqual({
      rate: 34.5,
      date: '2026-01-09',
      fetchedAt: NOW,
    });
    expect(parseRateCache({ rate: 0, date: '2026-01-09', fetchedAt: NOW })).toBeNull();
  });
});

describe('rate cache', () => {
  it('treats a cache younger than 12h as fresh', () => {
    expect(
      isCacheFresh({ rate: 34.5, date: '2026-01-09', fetchedAt: NOW - HOUR }, NOW),
    ).toBe(true);
  });

  it('treats an older cache as stale', () => {
    expect(
      isCacheFresh(
        { rate: 34.5, date: '2026-01-09', fetchedAt: NOW - RATE_CACHE_TTL_MS - 1 },
        NOW,
      ),
    ).toBe(false);
  });
});

describe('getUsdTryRate', () => {
  it('uses a fresh cache without calling the network', async () => {
    let called = false;
    const result = await getUsdTryRate({
      now: NOW,
      cache: { rate: 34.5, date: '2026-01-09', fetchedAt: NOW - HOUR },
      fetcher: async () => {
        called = true;
        return okResponse({ date: '2026-01-10', rates: { TRY: 99 } });
      },
    });
    expect(called).toBe(false);
    expect(result?.source).toBe('cache');
    expect(result?.rate).toBe(34.5);
    expect(result?.stale).toBe(false);
  });

  it('returns a fresh Frankfurter rate with its date', async () => {
    const result = await getUsdTryRate({
      now: NOW,
      fetcher: async () => okResponse({ date: '2026-01-10', rates: { TRY: 34.72 } }),
    });
    expect(result?.source).toBe('frankfurter');
    expect(result?.rate).toBe(34.72);
    expect(result?.date).toBe('2026-01-10');
    expect(result?.label).toBe('indicative rate');
  });

  it('falls back to a stale cache when the network fails', async () => {
    const result = await getUsdTryRate({
      now: NOW,
      cache: { rate: 34.1, date: '2026-01-01', fetchedAt: NOW - 13 * HOUR },
      fetcher: async () => {
        throw new Error('offline');
      },
    });
    expect(result?.source).toBe('cache');
    expect(result?.rate).toBe(34.1);
    expect(result?.date).toBe('2026-01-01');
    expect(result?.stale).toBe(true);
  });

  it('falls back to the manual Settings rate when there is no cache', async () => {
    const result = await getUsdTryRate({
      now: NOW,
      manualRate: 35.5,
      manualDate: '2026-01-02',
      fetcher: async () => {
        throw new Error('offline');
      },
    });
    expect(result?.source).toBe('manual');
    expect(result?.rate).toBe(35.5);
    expect(result?.date).toBe('2026-01-02');
  });

  it('returns null when every source is unavailable', async () => {
    const result = await getUsdTryRate({
      now: NOW,
      fetcher: async () => {
        throw new Error('offline');
      },
    });
    expect(result).toBeNull();
  });
});

describe('fallbackRate', () => {
  it('prefers cache over a manual rate', () => {
    const result = fallbackRate({
      now: NOW,
      cache: { rate: 34, date: '2026-01-01', fetchedAt: NOW - 20 * HOUR },
      manualRate: 35,
    });
    expect(result?.source).toBe('cache');
  });
});

describe('TRY conversion', () => {
  it('rounds converted TRY to 2 decimals', () => {
    expect(roundTry(345.678)).toBe(345.68);
    expect(convertUsdToTry(10, 34.5678)).toBe(345.68);
  });

  it('returns null for invalid amounts or rates', () => {
    expect(convertUsdToTry(10, 0)).toBeNull();
    expect(convertUsdToTry(-1, 34)).toBeNull();
    expect(convertUsdToTry(Number.NaN, 34)).toBeNull();
  });
});
