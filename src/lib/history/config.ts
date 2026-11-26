export type CollectInterval = 1 | 5 | 15;

export const COLLECT_INTERVALS: readonly CollectInterval[] = [1, 5, 15];

/** A write is forced after this long even when every value is unchanged. */
export const WRITE_INTERVAL_MS = 15 * 60_000;

/** How often the app pulls the GitHub data branch while visible. */
export const REMOTE_SYNC_INTERVAL_MS = 15 * 60_000;

export function parseCollectInterval(raw: unknown): CollectInterval {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return value === 5 || value === 15 ? value : 1;
}

export function intervalToMs(interval: CollectInterval): number {
  return interval * 60_000;
}
