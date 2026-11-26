import type { ChannelSnapshot, VideoSnapshot } from './types';

function pick(primary: number | null, secondary: number | null): number | null {
  return primary !== null ? primary : secondary;
}

/**
 * Merges two snapshot lists by timestamp. Duplicates keep the primary
 * (local) values and let the secondary (remote) fill any null fields.
 */
export function mergeChannelSnapshots(
  primary: readonly ChannelSnapshot[],
  secondary: readonly ChannelSnapshot[],
): ChannelSnapshot[] {
  const byTs = new Map<number, ChannelSnapshot>();

  for (const snapshot of [...primary, ...secondary]) {
    if (!Number.isFinite(snapshot.ts) || snapshot.ts <= 0) continue;
    const existing = byTs.get(snapshot.ts);
    if (!existing) {
      byTs.set(snapshot.ts, { ...snapshot });
      continue;
    }
    byTs.set(snapshot.ts, {
      ts: snapshot.ts,
      subs: pick(existing.subs, snapshot.subs),
      views: pick(existing.views, snapshot.views),
      videoCount: pick(existing.videoCount, snapshot.videoCount),
      subsRounded: existing.subsRounded || snapshot.subsRounded,
    });
  }

  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

function videoKey(snapshot: VideoSnapshot): string {
  return `${snapshot.videoId}\u0000${snapshot.ts}`;
}

/** Same as channel merge, keyed by videoId + timestamp. */
export function mergeVideoSnapshots(
  primary: readonly VideoSnapshot[],
  secondary: readonly VideoSnapshot[],
): VideoSnapshot[] {
  const byKey = new Map<string, VideoSnapshot>();

  for (const snapshot of [...primary, ...secondary]) {
    if (!Number.isFinite(snapshot.ts) || snapshot.ts <= 0 || !snapshot.videoId) continue;
    const key = videoKey(snapshot);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...snapshot });
      continue;
    }
    byKey.set(key, {
      videoId: snapshot.videoId,
      ts: snapshot.ts,
      views: pick(existing.views, snapshot.views),
      likes: pick(existing.likes, snapshot.likes),
      comments: pick(existing.comments, snapshot.comments),
    });
  }

  return [...byKey.values()].sort((a, b) =>
    a.ts === b.ts ? a.videoId.localeCompare(b.videoId) : a.ts - b.ts,
  );
}
