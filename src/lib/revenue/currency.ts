/**
 * USD→TRY is display-only. The rate is indicative, never a bank rate, and is
 * always returned with the date it belongs to. Order: fresh cache → network →
 * stale cache → manual Settings rate.
 */

export const FRANKFURTER_URL =
  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY';
export const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;
export const INDICATIVE_RATE_LABEL = 'indicative rate';

export type RateSource = 'frankfurter' | 'cache' | 'manual';

export type RateCache = {
  rate: number;
  /** ISO date from Frankfurter, or the date a manual rate was applied. */
  date: string;
  fetchedAt: number;
};

export type UsdTryRate = {
  rate: number;
  date: string;
  fetchedAt: number;
  source: RateSource;
  indicative: true;
  label: typeof INDICATIVE_RATE_LABEL;
  stale: boolean;
};

export type FallbackRateInput = {
  cache?: RateCache | null;
  manualRate?: number | null;
  manualDate?: string | null;
  now?: number;
};

export type RateOptions = FallbackRateInput & {
  fetcher?: typeof fetch;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function isoDate(ts: number): string {
  return new Date(Number.isFinite(ts) ? ts : 0).toISOString().slice(0, 10);
}

export function roundTry(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertUsdToTry(
  usdAmount: number,
  rate: number,
  round = true,
): number | null {
  if (
    !Number.isFinite(usdAmount) ||
    !Number.isFinite(rate) ||
    usdAmount < 0 ||
    rate <= 0
  ) {
    return null;
  }
  const converted = usdAmount * rate;
  return round ? roundTry(converted) : converted;
}

export function parseFrankfurterResponse(
  raw: unknown,
): { rate: number; date: string } | null {
  if (!isRecord(raw) || !isRecord(raw.rates)) return null;
  const rate = raw.rates.TRY;
  const date = raw.date;
  if (!validRate(rate) || !validDate(date)) return null;
  return { rate, date };
}

export function parseRateCache(raw: unknown): RateCache | null {
  if (!isRecord(raw)) return null;
  const rate = raw.rate;
  const date = raw.date;
  const fetchedAt = raw.fetchedAt;
  if (
    !validRate(rate) ||
    !validDate(date) ||
    typeof fetchedAt !== 'number' ||
    !Number.isFinite(fetchedAt) ||
    fetchedAt <= 0
  ) {
    return null;
  }
  return { rate, date, fetchedAt };
}

export function isCacheFresh(cache: RateCache, now: number): boolean {
  if (!validRate(cache.rate) || !validDate(cache.date)) return false;
  if (!Number.isFinite(cache.fetchedAt) || !Number.isFinite(now)) return false;
  return now - cache.fetchedAt < RATE_CACHE_TTL_MS;
}

function cacheResult(cache: RateCache, now: number): UsdTryRate {
  return {
    rate: cache.rate,
    date: cache.date,
    fetchedAt: cache.fetchedAt,
    source: 'cache',
    indicative: true,
    label: INDICATIVE_RATE_LABEL,
    stale: !isCacheFresh(cache, now),
  };
}

function manualResult(rate: number, date: string | null, now: number): UsdTryRate {
  return {
    rate,
    date: validDate(date) ? date : isoDate(now),
    fetchedAt: now,
    source: 'manual',
    indicative: true,
    label: INDICATIVE_RATE_LABEL,
    stale: false,
  };
}

/** Pure fallback used after a network failure. Cached beats manual. */
export function fallbackRate(input: FallbackRateInput): UsdTryRate | null {
  const now = input.now ?? Date.now();

  if (input.cache && validRate(input.cache.rate) && validDate(input.cache.date)) {
    return cacheResult(input.cache, now);
  }

  if (input.manualRate !== undefined && input.manualRate !== null && validRate(input.manualRate)) {
    return manualResult(input.manualRate, input.manualDate ?? null, now);
  }

  return null;
}

export async function getUsdTryRate(options: RateOptions = {}): Promise<UsdTryRate | null> {
  const now = options.now ?? Date.now();

  if (options.cache && isCacheFresh(options.cache, now)) {
    return cacheResult(options.cache, now);
  }

  const fetcher = options.fetcher ?? (typeof fetch === 'function' ? fetch : null);

  if (fetcher) {
    try {
      const response = await fetcher(FRANKFURTER_URL, { cache: 'no-store' });
      if (response.ok) {
        const parsed = parseFrankfurterResponse(await response.json());
        if (parsed) {
          return {
            rate: parsed.rate,
            date: parsed.date,
            fetchedAt: now,
            source: 'frankfurter',
            indicative: true,
            label: INDICATIVE_RATE_LABEL,
            stale: false,
          };
        }
      }
    } catch {
      // Fall through to the cache and manual rate.
    }
  }

  return fallbackRate({
    cache: options.cache ?? null,
    manualRate: options.manualRate ?? null,
    manualDate: options.manualDate ?? null,
    now,
  });
}
