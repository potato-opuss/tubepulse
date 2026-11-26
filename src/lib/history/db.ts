import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ChannelSnapshot, VideoSnapshot } from './types';

/**
 * IndexedDB storage for history. The app also runs in jsdom (tests) where
 * indexedDB is absent, so a small in-memory store keeps the UI usable there.
 * Neither store ever holds revenue data — public Data API counters only.
 */

const DB_NAME = 'tubepulse-history';
const DB_VERSION = 1;

interface HistoryDB extends DBSchema {
  channelSnapshots: {
    key: number;
    value: ChannelSnapshot;
    indexes: { 'by-ts': number };
  };
  videoSnapshots: {
    key: [string, number];
    value: VideoSnapshot;
    indexes: { 'by-ts': number; 'by-video': string };
  };
}

let dbPromise: Promise<IDBPDatabase<HistoryDB> | null> | null = null;

const memoryChannel = new Map<number, ChannelSnapshot>();
const memoryVideos = new Map<string, VideoSnapshot>();

function videoKey(snapshot: VideoSnapshot): string {
  return `${snapshot.videoId}\u0000${snapshot.ts}`;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function getDb(): Promise<IDBPDatabase<HistoryDB> | null> {
  if (!canUseIndexedDb()) return null;
  if (!dbPromise) {
    dbPromise = openDB<HistoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('channelSnapshots')) {
          const store = db.createObjectStore('channelSnapshots', { keyPath: 'ts' });
          store.createIndex('by-ts', 'ts');
        }
        if (!db.objectStoreNames.contains('videoSnapshots')) {
          const store = db.createObjectStore('videoSnapshots', {
            keyPath: ['videoId', 'ts'],
          });
          store.createIndex('by-ts', 'ts');
          store.createIndex('by-video', 'videoId');
        }
      },
    }).catch(() => null);
  }
  return dbPromise;
}

function uniqueChannel(snapshots: readonly ChannelSnapshot[]): ChannelSnapshot[] {
  const byTs = new Map<number, ChannelSnapshot>();
  for (const snapshot of snapshots) {
    if (!Number.isFinite(snapshot.ts) || snapshot.ts <= 0) continue;
    byTs.set(snapshot.ts, snapshot);
  }
  return [...byTs.values()];
}

function uniqueVideos(snapshots: readonly VideoSnapshot[]): VideoSnapshot[] {
  const byKey = new Map<string, VideoSnapshot>();
  for (const snapshot of snapshots) {
    if (!Number.isFinite(snapshot.ts) || snapshot.ts <= 0 || !snapshot.videoId) continue;
    byKey.set(videoKey(snapshot), snapshot);
  }
  return [...byKey.values()];
}

export async function saveChannelSnapshots(
  snapshots: readonly ChannelSnapshot[],
): Promise<void> {
  const unique = uniqueChannel(snapshots);
  if (unique.length === 0) return;

  const db = await getDb();
  if (!db) {
    for (const snapshot of unique) memoryChannel.set(snapshot.ts, snapshot);
    return;
  }

  const tx = db.transaction('channelSnapshots', 'readwrite');
  await Promise.all(unique.map((snapshot) => tx.store.put(snapshot)));
  await tx.done;
}

export async function saveVideoSnapshots(
  snapshots: readonly VideoSnapshot[],
): Promise<void> {
  const unique = uniqueVideos(snapshots);
  if (unique.length === 0) return;

  const db = await getDb();
  if (!db) {
    for (const snapshot of unique) memoryVideos.set(videoKey(snapshot), snapshot);
    return;
  }

  const tx = db.transaction('videoSnapshots', 'readwrite');
  await Promise.all(unique.map((snapshot) => tx.store.put(snapshot)));
  await tx.done;
}

export async function readChannelSnapshots(): Promise<ChannelSnapshot[]> {
  const db = await getDb();
  if (!db) {
    return [...memoryChannel.values()].sort((a, b) => a.ts - b.ts);
  }
  return db.getAll('channelSnapshots');
}

export async function readVideoSnapshots(videoId?: string): Promise<VideoSnapshot[]> {
  const db = await getDb();
  if (!db) {
    const all = [...memoryVideos.values()].filter(
      (snapshot) => videoId === undefined || snapshot.videoId === videoId,
    );
    return all.sort((a, b) =>
      a.ts === b.ts ? a.videoId.localeCompare(b.videoId) : a.ts - b.ts,
    );
  }

  const rows = videoId
    ? await db.getAllFromIndex('videoSnapshots', 'by-video', videoId)
    : await db.getAll('videoSnapshots');
  return rows.sort((a, b) =>
    a.ts === b.ts ? a.videoId.localeCompare(b.videoId) : a.ts - b.ts,
  );
}

/** One newest point per requested video, without loading every historical row. */
export async function latestVideoSnapshots(
  videoIds: readonly string[],
): Promise<VideoSnapshot[]> {
  if (videoIds.length === 0) return [];

  const db = await getDb();
  if (!db) {
    const wanted = new Set(videoIds);
    const latest = new Map<string, VideoSnapshot>();
    for (const snapshot of memoryVideos.values()) {
      if (!wanted.has(snapshot.videoId)) continue;
      const current = latest.get(snapshot.videoId);
      if (!current || snapshot.ts > current.ts) latest.set(snapshot.videoId, snapshot);
    }
    return [...latest.values()];
  }

  const tx = db.transaction('videoSnapshots', 'readonly');
  const index = tx.store.index('by-video');
  const rows: VideoSnapshot[] = [];
  for (const videoId of videoIds) {
    const cursor = await index.openCursor(IDBKeyRange.only(videoId), 'prev');
    if (cursor) rows.push(cursor.value);
  }
  await tx.done;
  return rows;
}

export async function latestChannelSnapshot(): Promise<ChannelSnapshot | null> {
  const db = await getDb();
  if (!db) {
    let latest: ChannelSnapshot | null = null;
    for (const snapshot of memoryChannel.values()) {
      if (!latest || snapshot.ts > latest.ts) latest = snapshot;
    }
    return latest;
  }

  const tx = db.transaction('channelSnapshots', 'readonly');
  const cursor = await tx.store.openCursor(null, 'prev');
  const value = cursor?.value ?? null;
  await tx.done;
  return value;
}

export async function historyCounts(): Promise<{ channel: number; videos: number }> {
  const db = await getDb();
  if (!db) return { channel: memoryChannel.size, videos: memoryVideos.size };
  const [channel, videos] = await Promise.all([
    db.count('channelSnapshots'),
    db.count('videoSnapshots'),
  ]);
  return { channel, videos };
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryChannel.clear();
    memoryVideos.clear();
    return;
  }
  await Promise.all([db.clear('channelSnapshots'), db.clear('videoSnapshots')]);
}
