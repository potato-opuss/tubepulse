import type { ChannelSnapshot, VideoSnapshot } from './types';

/** Compact shape written by scripts/collect.mjs to the `data` branch. */
export type CompactChannelPoint = {
  t: number;
  s?: number | null;
  v?: number | null;
  c?: number | null;
  r?: boolean;
};

export type CompactVideoPoint = {
  t: number;
  v?: number | null;
  l?: number | null;
  c?: number | null;
};

export type RemoteSnapshotFile = {
  version?: number;
  channelId?: string;
  generatedAt?: string;
  channel?: CompactChannelPoint[];
  videos?: Record<string, CompactVideoPoint[]>;
};

export type ParsedRemote = {
  channelId: string | null;
  channel: ChannelSnapshot[];
  videos: VideoSnapshot[];
};

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/** Accepts owner/repo, a GitHub URL, or owner/repo.git. */
export function normalizeRepo(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  return REPO_RE.test(trimmed) ? trimmed : null;
}

export function remoteSnapshotsUrl(repo: string): string | null {
  const normalized = normalizeRepo(repo);
  if (!normalized) return null;
  return `https://raw.githubusercontent.com/${normalized}/data/snapshots.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function readCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Parses a remote file defensively; invalid entries are skipped, not fatal. */
export function parseRemoteSnapshots(raw: unknown): ParsedRemote | null {
  if (!isRecord(raw)) return null;

  const channelId =
    typeof raw.channelId === 'string' && raw.channelId.trim() !== ''
      ? raw.channelId.trim()
      : null;

  const channel: ChannelSnapshot[] = [];
  if (Array.isArray(raw.channel)) {
    for (const item of raw.channel) {
      if (!isRecord(item)) continue;
      const ts = readTs(item.t);
      if (ts === null) continue;
      const subs = readCount(item.s);
      const views = readCount(item.v);
      const videoCount = readCount(item.c);
      if (subs === null && views === null && videoCount === null) continue;
      channel.push({
        ts,
        subs,
        views,
        videoCount,
        subsRounded: item.r === true,
      });
    }
  }

  const videos: VideoSnapshot[] = [];
  if (isRecord(raw.videos)) {
    for (const [videoId, series] of Object.entries(raw.videos)) {
      if (!videoId || !Array.isArray(series)) continue;
      for (const item of series) {
        if (!isRecord(item)) continue;
        const ts = readTs(item.t);
        if (ts === null) continue;
        const views = readCount(item.v);
        const likes = readCount(item.l);
        const comments = readCount(item.c);
        if (views === null && likes === null && comments === null) continue;
        videos.push({
          videoId,
          ts,
          views,
          likes,
          comments,
        });
      }
    }
  }

  return { channelId, channel, videos };
}
