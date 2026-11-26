/**
 * RPM = estimated creator revenue per 1,000 TOTAL video views after YouTube's
 * share. Never multiply views by CPM: the 55% long-form / 45% Shorts creator
 * share is already inside these numbers.
 *
 * "Rough starting assumptions, NOT official YouTube figures. Real RPM varies by niche, season, audience and ad type. Users should calibrate."
 */

export type VideoFormat = 'long' | 'short';
export type CountryTier = 'premium' | 'high' | 'mid' | 'low';

export type RpmRange = {
  low: number;
  mid: number;
  high: number;
};

export type RpmSource = 'assumption';

export type RpmEntry = RpmRange & {
  source: RpmSource;
};

export const RPM_ASSUMPTION_NOTE =
  'Rough starting assumptions, NOT official YouTube figures. Real RPM varies by niche, season, audience and ad type. Users should calibrate.';

export const PREMIUM_COUNTRIES = [
  'US',
  'CA',
  'GB',
  'AU',
  'NZ',
  'CH',
  'NO',
  'IE',
] as const;

export const HIGH_COUNTRIES = [
  'DE',
  'FR',
  'NL',
  'SE',
  'DK',
  'FI',
  'AT',
  'BE',
  'JP',
  'KR',
  'SG',
  'AE',
  'SA',
  'QA',
  'KW',
  'IL',
] as const;

export const MID_COUNTRIES = [
  'ES',
  'IT',
  'PT',
  'PL',
  'CZ',
  'GR',
  'BR',
  'MX',
  'AR',
  'CL',
  'CO',
  'RO',
  'HU',
  'ZA',
  'MY',
  'TH',
] as const;

export const LOW_COUNTRIES = [
  'TR',
  'IQ',
  'EG',
  'PK',
  'IN',
  'ID',
  'PH',
  'NG',
  'BD',
  'VN',
  'MA',
  'DZ',
] as const;

export const COUNTRY_TIERS: Record<CountryTier, readonly string[]> = {
  premium: PREMIUM_COUNTRIES,
  high: HIGH_COUNTRIES,
  mid: MID_COUNTRIES,
  low: LOW_COUNTRIES,
};

function entry(low: number, mid: number, high: number): RpmEntry {
  return { low, mid, high, source: 'assumption' };
}

/** Editable defaults. USD per 1,000 total views, after YouTube's share. */
export const DEFAULT_LONG_RPM: Record<CountryTier, RpmEntry> = {
  premium: entry(2.0, 4.5, 9.0),
  high: entry(1.2, 3.0, 6.0),
  mid: entry(0.5, 1.2, 2.5),
  low: entry(0.15, 0.5, 1.2),
};

export const DEFAULT_SHORT_RPM: Record<CountryTier, RpmEntry> = {
  premium: entry(0.03, 0.07, 0.15),
  high: entry(0.02, 0.05, 0.1),
  mid: entry(0.01, 0.03, 0.06),
  low: entry(0.003, 0.01, 0.03),
};

export const DEFAULT_RPM: Record<VideoFormat, Record<CountryTier, RpmEntry>> = {
  long: DEFAULT_LONG_RPM,
  short: DEFAULT_SHORT_RPM,
};

const tierByCountry = new Map<string, CountryTier>();
for (const tier of Object.keys(COUNTRY_TIERS) as CountryTier[]) {
  for (const code of COUNTRY_TIERS[tier]) tierByCountry.set(code, tier);
}

/** ISO-style country codes are compared uppercase; anything unknown is low. */
export function normalizeCountryCode(code: string): string {
  return code.trim().toUpperCase();
}

export function countryTier(code: string): CountryTier {
  return tierByCountry.get(normalizeCountryCode(code)) ?? 'low';
}

export function isKnownCountry(code: string): boolean {
  return tierByCountry.has(normalizeCountryCode(code));
}

export function rpmForTier(format: VideoFormat, tier: CountryTier): RpmEntry {
  return DEFAULT_RPM[format][tier];
}

/** Unknown countries intentionally fall back to the low tier. */
export function rpmFor(format: VideoFormat, country: string): RpmEntry {
  return rpmForTier(format, countryTier(country));
}

export function isValidRpmRange(value: unknown): value is RpmRange {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RpmRange>;
  return (
    typeof candidate.low === 'number' &&
    typeof candidate.mid === 'number' &&
    typeof candidate.high === 'number' &&
    Number.isFinite(candidate.low) &&
    Number.isFinite(candidate.mid) &&
    Number.isFinite(candidate.high) &&
    candidate.low >= 0 &&
    candidate.low <= candidate.mid &&
    candidate.mid <= candidate.high
  );
}
