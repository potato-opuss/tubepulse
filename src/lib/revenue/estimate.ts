import { clampCalibrationFactor } from './calibration';
import {
  countryTier,
  isValidRpmRange,
  normalizeCountryCode,
  rpmFor,
  type CountryTier,
  type RpmRange,
  type VideoFormat,
} from './rpmTable';

/**
 * Revenue estimate = Σ (views / 1,000 × RPM), split by country and format.
 * Country weights are normalized to 100%; views are never multiplied by CPM.
 */

export type CountryMix = Record<string, number>;
export type FormatOverrides = Partial<Record<VideoFormat, RpmRange>>;
export type CalibrationFactors = Partial<Record<VideoFormat, number>>;

export type RevenueRange = {
  low: number;
  mid: number;
  high: number;
};

export type RevenueBreakdownItem = {
  country: string;
  tier: CountryTier;
  format: VideoFormat;
  views: number;
  /** Normalized share of total views for this format, 0–1. */
  share: number;
  rpm: RpmRange;
  low: number;
  mid: number;
  high: number;
};

export type EstimateInput = {
  longViews: number;
  shortViews: number;
  countryMix: CountryMix;
  /** Optional RPM range overrides for a whole format. */
  overrides?: FormatOverrides;
  /** Calibration factors from calibration.ts, one per format. */
  calibration?: CalibrationFactors;
  monetized?: boolean;
};

export type RevenueEstimate = {
  low: number;
  mid: number;
  high: number;
  /** Computed range when monetized=false; null otherwise. */
  potential: RevenueRange | null;
  monetized: boolean;
  breakdown: RevenueBreakdownItem[];
  totalViews: number;
  /** True when input weights were rescaled to sum to 1. */
  countryMixNormalized: boolean;
  calibration: { long: number; short: number };
  reason: string | null;
};

type MixEntry = {
  country: string;
  share: number;
};

function cleanViews(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeMix(mix: CountryMix): {
  entries: MixEntry[];
  total: number;
  rescaled: boolean;
} {
  const totals = new Map<string, number>();

  for (const [rawCode, rawWeight] of Object.entries(mix)) {
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) continue;
    const code = normalizeCountryCode(rawCode);
    if (code === '') continue;
    totals.set(code, (totals.get(code) ?? 0) + rawWeight);
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { entries: [], total: 0, rescaled: false };

  const entries = [...totals.entries()]
    .map(([country, weight]) => ({ country, share: weight / total }))
    .sort((a, b) => a.country.localeCompare(b.country));

  return { entries, total, rescaled: Math.abs(total - 1) > 1e-9 };
}

function rangeFor(
  format: VideoFormat,
  country: string,
  overrides: FormatOverrides | undefined,
): RpmRange {
  const override = overrides?.[format];
  if (override !== undefined && isValidRpmRange(override)) return override;
  return rpmFor(format, country);
}

function factorFor(factors: CalibrationFactors | undefined, format: VideoFormat): number {
  return clampCalibrationFactor(factors?.[format] ?? 1);
}

export function estimateRevenue(input: EstimateInput): RevenueEstimate {
  const longViews = cleanViews(input.longViews);
  const shortViews = cleanViews(input.shortViews);
  const totalViews = longViews + shortViews;
  const mix = normalizeMix(input.countryMix);
  const factors = {
    long: factorFor(input.calibration, 'long'),
    short: factorFor(input.calibration, 'short'),
  };
  const formatViews: Record<VideoFormat, number> = { long: longViews, short: shortViews };

  const breakdown: RevenueBreakdownItem[] = [];
  let low = 0;
  let mid = 0;
  let high = 0;

  if (mix.entries.length > 0) {
    for (const entry of mix.entries) {
      const tier = countryTier(entry.country);
      for (const format of ['long', 'short'] as const) {
        const views = formatViews[format] * entry.share;
        if (views <= 0) continue;

        const rpm = rangeFor(format, entry.country, input.overrides);
        const factor = factors[format];
        const itemLow = (views / 1_000) * rpm.low * factor;
        const itemMid = (views / 1_000) * rpm.mid * factor;
        const itemHigh = (views / 1_000) * rpm.high * factor;

        breakdown.push({
          country: entry.country,
          tier,
          format,
          views,
          share: entry.share,
          rpm,
          low: itemLow,
          mid: itemMid,
          high: itemHigh,
        });

        low += itemLow;
        mid += itemMid;
        high += itemHigh;
      }
    }
  }

  const monetized = input.monetized ?? true;
  const computed: RevenueRange = { low, mid, high };

  let reason: string | null = null;
  if (totalViews > 0 && mix.entries.length === 0) {
    reason =
      'Country mix is empty. Add at least one country with a positive share before estimating revenue.';
  } else if (!monetized && totalViews > 0) {
    reason = 'Not monetized yet. The earned amount is 0; the potential range is shown separately.';
  }

  return {
    low: monetized ? low : 0,
    mid: monetized ? mid : 0,
    high: monetized ? high : 0,
    potential: monetized ? null : computed,
    monetized,
    breakdown,
    totalViews,
    countryMixNormalized: mix.rescaled,
    calibration: factors,
    reason,
  };
}

/** Weighted RPM for one format, useful when calibrating from Studio RPM. */
export function blendedRpm(
  format: VideoFormat,
  countryMix: CountryMix,
  overrides?: FormatOverrides,
): RpmRange | null {
  const mix = normalizeMix(countryMix);
  if (mix.entries.length === 0) return null;

  let low = 0;
  let mid = 0;
  let high = 0;

  for (const entry of mix.entries) {
    const rpm = rangeFor(format, entry.country, overrides);
    low += rpm.low * entry.share;
    mid += rpm.mid * entry.share;
    high += rpm.high * entry.share;
  }

  return { low, mid, high };
}
