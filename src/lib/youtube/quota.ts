/**
 * Approximate quota meter.
 *
 * Every call costs the units Google documents for that endpoint. Costs are
 * tracked in localStorage (not Preferences) so the meter survives reloads
 * without an async round-trip on every request. The reset boundary is
 * midnight Pacific Time, matching Google's quota day.
 */

export const DAILY_QUOTA_UNITS = 10_000;

export const QUOTA_COSTS = {
  channelsList: 1,
  playlistItemsList: 1,
  videosList: 1,
  // search.list costs 100 units and is never used by this app.
} as const;

export type QuotaUsage = {
  day: string;
  used: number;
  limit: number;
};

const STORAGE_KEY = 'tp.youtube.quota';

const PACIFIC_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar day (YYYY-MM-DD) in Pacific Time, the quota reset timezone. */
export function pacificDayKey(date: Date = new Date()): string {
  const parts = PACIFIC_DAY.formatToParts(date);
  const read = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

type StoredQuota = { day: string; used: number };

function readStored(): StoredQuota | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed.day !== 'string' || typeof parsed.used !== 'number') return null;
    if (!Number.isFinite(parsed.used) || parsed.used < 0) return null;
    return { day: parsed.day, used: parsed.used };
  } catch {
    return null;
  }
}

function writeStored(value: StoredQuota): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the meter is approximate, keep going.
  }
}

export function getQuotaUsage(now: Date = new Date()): QuotaUsage {
  const day = pacificDayKey(now);
  const stored = readStored();
  const used = stored && stored.day === day ? stored.used : 0;
  return { day, used, limit: DAILY_QUOTA_UNITS };
}

/** Records units spent by one HTTP attempt. Returns the updated usage. */
export function recordQuota(units: number, now: Date = new Date()): QuotaUsage {
  const current = getQuotaUsage(now);
  const next: QuotaUsage = {
    ...current,
    used: current.used + Math.max(0, Math.round(units)),
  };
  writeStored({ day: next.day, used: next.used });
  return next;
}

export function resetQuota(now: Date = new Date()): QuotaUsage {
  const usage: QuotaUsage = { day: pacificDayKey(now), used: 0, limit: DAILY_QUOTA_UNITS };
  writeStored({ day: usage.day, used: 0 });
  return usage;
}
