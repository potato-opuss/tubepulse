import { youtubeErrorMessage } from '../youtube/errors';
import { getChannel, resolveChannel } from '../youtube/channel';
import { listVideos } from '../youtube/videos';
import type { Channel, Video } from '../youtube/types';
import { WRITE_INTERVAL_MS } from './config';
import type { ChannelSnapshot, VideoSnapshot } from './types';

/** Keeps the in-app collector to ~3 quota units per run. */
export const IN_APP_VIDEO_LIMIT = 50;

export function toChannelSnapshot(channel: Channel, ts: number): ChannelSnapshot {
  return {
    ts,
    subs: channel.subscriberCount,
    views: channel.viewCount,
    videoCount: channel.videoCount,
    subsRounded: channel.subscribersIsRounded,
  };
}

export function toVideoSnapshots(videos: readonly Video[], ts: number): VideoSnapshot[] {
  return videos
    .filter((video) => video.id !== '')
    .map((video) => ({
      videoId: video.id,
      ts,
      views: video.viewCount,
      likes: video.likeCount,
      comments: video.commentCount,
    }));
}

export function channelValuesChanged(
  previous: ChannelSnapshot | null,
  next: ChannelSnapshot,
): boolean {
  if (!previous) return true;
  return (
    previous.subs !== next.subs ||
    previous.views !== next.views ||
    previous.videoCount !== next.videoCount ||
    previous.subsRounded !== next.subsRounded
  );
}

/**
 * A snapshot is written only when a value changed or 15+ minutes have passed
 * since the last stored point. This keeps a quiet channel from filling the
 * database with identical rows.
 */
export function shouldWriteSnapshot(
  previous: ChannelSnapshot | null,
  next: ChannelSnapshot,
  lastWriteTs: number | null,
  now: number,
): boolean {
  if (channelValuesChanged(previous, next)) return true;
  if (lastWriteTs === null) return true;
  return now - lastWriteTs >= WRITE_INTERVAL_MS;
}

export function videoValuesChanged(previous: VideoSnapshot, next: VideoSnapshot): boolean {
  return (
    previous.views !== next.views ||
    previous.likes !== next.likes ||
    previous.comments !== next.comments
  );
}

/** Compares fresh video points against the latest stored point per video. */
export function changedVideoSnapshots(
  latestByVideo: readonly VideoSnapshot[],
  next: readonly VideoSnapshot[],
): VideoSnapshot[] {
  const previous = new Map(latestByVideo.map((snapshot) => [snapshot.videoId, snapshot]));
  return next.filter((snapshot) => {
    const before = previous.get(snapshot.videoId);
    return !before || videoValuesChanged(before, snapshot);
  });
}

/** Collapses all stored video points to the newest point per video. */
export function latestPerVideo(
  snapshots: readonly VideoSnapshot[],
): VideoSnapshot[] {
  const latest = new Map<string, VideoSnapshot>();
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.videoId);
    if (!current || snapshot.ts > current.ts) latest.set(snapshot.videoId, snapshot);
  }
  return [...latest.values()];
}

export type CollectSnapshotInput = {
  apiKey: string;
  channelInput: string;
  channelId: string | null;
  now?: number;
  videoLimit?: number;
};

export type CollectSnapshotResult = {
  channelId: string;
  channelTitle: string;
  channel: ChannelSnapshot;
  videos: VideoSnapshot[];
  /** Set when channel stats succeeded but video stats failed. */
  warning: string | null;
};

async function loadChannel(input: CollectSnapshotInput): Promise<Channel> {
  if (input.channelId) {
    try {
      return await getChannel(input.apiKey, input.channelId);
    } catch (error) {
      if (!input.channelInput) throw error;
    }
  }
  return resolveChannel(input.apiKey, input.channelInput);
}

/**
 * One in-app collection run: channel counters plus recent video counters.
 * HTTP stays in src/lib/youtube/; this module only normalizes and compares.
 */
export async function collectSnapshot(
  input: CollectSnapshotInput,
): Promise<CollectSnapshotResult> {
  const now = input.now ?? Date.now();
  const channel = await loadChannel(input);

  let videos: Video[] = [];
  let warning: string | null = null;

  if (channel.uploadsPlaylistId) {
    try {
      const page = await listVideos(input.apiKey, channel.uploadsPlaylistId, {
        limit: input.videoLimit ?? IN_APP_VIDEO_LIMIT,
        useCache: false,
      });
      videos = page.videos;
    } catch (error) {
      warning = youtubeErrorMessage(error);
    }
  }

  return {
    channelId: channel.id,
    channelTitle: channel.title,
    channel: toChannelSnapshot(channel, now),
    videos: toVideoSnapshots(videos, now),
    warning,
  };
}
