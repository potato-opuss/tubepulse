export type Theme = 'dark' | 'light';
export type Currency = 'USD' | 'TRY';

export const DEFAULT_THEME: Theme = 'dark';
export const DEFAULT_CURRENCY: Currency = 'USD';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function isCurrency(value: unknown): value is Currency {
  return value === 'USD' || value === 'TRY';
}

/** Parses a stored rate; returns null when absent or not a positive number. */
export function parseRate(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
