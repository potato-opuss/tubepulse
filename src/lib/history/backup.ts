import type { ChannelSnapshot, VideoSnapshot } from './types';

export const BACKUP_VERSION = 1;

export type HistoryBackup = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  channelId: string | null;
  channel: ChannelSnapshot[];
  videos: VideoSnapshot[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function readTs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function buildBackup(
  channel: readonly ChannelSnapshot[],
  videos: readonly VideoSnapshot[],
  channelId: string | null,
  now: number = Date.now(),
): HistoryBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    channelId,
    channel: [...channel].sort((a, b) => a.ts - b.ts),
    videos: [...videos].sort((a, b) =>
      a.ts === b.ts ? a.videoId.localeCompare(b.videoId) : a.ts - b.ts,
    ),
  };
}

export function serializeBackup(backup: HistoryBackup): string {
  return JSON.stringify(backup, null, 2);
}

/** Validates an imported file. Returns null instead of throwing on junk. */
export function parseBackup(raw: unknown): HistoryBackup | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== BACKUP_VERSION) return null;

  const channel: ChannelSnapshot[] = [];
  if (Array.isArray(raw.channel)) {
    for (const item of raw.channel) {
      if (!isRecord(item)) continue;
      const ts = readTs(item.ts);
      if (ts === null) continue;
      channel.push({
        ts,
        subs: readCount(item.subs),
        views: readCount(item.views),
        videoCount: readCount(item.videoCount),
        subsRounded: item.subsRounded === true,
      });
    }
  }

  const videos: VideoSnapshot[] = [];
  if (Array.isArray(raw.videos)) {
    for (const item of raw.videos) {
      if (!isRecord(item) || typeof item.videoId !== 'string' || item.videoId === '') continue;
      const ts = readTs(item.ts);
      if (ts === null) continue;
      videos.push({
        videoId: item.videoId,
        ts,
        views: readCount(item.views),
        likes: readCount(item.likes),
        comments: readCount(item.comments),
      });
    }
  }

  if (channel.length === 0 && videos.length === 0) return null;

  return {
    version: BACKUP_VERSION,
    exportedAt:
      typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date(0).toISOString(),
    channelId: typeof raw.channelId === 'string' ? raw.channelId : null,
    channel,
    videos,
  };
}

export function parseBackupText(text: string): HistoryBackup | null {
  try {
    return parseBackup(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}
