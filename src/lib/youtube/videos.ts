import { readCache, writeCache } from './cache';
import { youtubeGet } from './client';
import { parseIsoDuration } from './parse';
import { QUOTA_COSTS } from './quota';
import {
  bestThumbnail,
  toCount,
  type ListResponse,
  type RawPlaylistItem,
  type RawVideo,
  type Video,
} from './types';

export const VIDEO_CACHE_TTL_MS = 5 * 60_000;
export const FIRST_LOAD_LIMIT = 500;
const PAGE_SIZE = 50;

export type VideoListPage = {
  videos: Video[];
  nextPageToken: string | null;
  fromCache: boolean;
  quotaUsed: number;
};

export type ListVideosOptions = {
  /** Token returned by a previous call; omit for the first page. */
  pageToken?: string | null;
  /** Max videos to return in this call, 1–500. */
  limit?: number;
  /** Set false to bypass the 5-minute cache. */
  useCache?: boolean;
};

export function normalizeVideo(raw: RawVideo): Video {
  return {
    id: raw.id ?? '',
    title: raw.snippet?.title?.trim() || 'Untitled video',
    description: raw.snippet?.description ?? '',
    publishedAt: raw.snippet?.publishedAt ?? '',
    thumbnailUrl: bestThumbnail(raw.snippet?.thumbnails),
    durationSeconds: parseIsoDuration(raw.contentDetails?.duration ?? ''),
    viewCount: toCount(raw.statistics?.viewCount),
    // Likes/comments are absent when disabled: null, never 0.
    likeCount: toCount(raw.statistics?.likeCount),
    commentCount: toCount(raw.statistics?.commentCount),
    tags: raw.snippet?.tags ?? [],
  };
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return FIRST_LOAD_LIMIT;
  return Math.min(FIRST_LOAD_LIMIT, Math.max(1, Math.floor(value)));
}

/**
 * Lists videos from a channel's uploads playlist.
 *
 * playlistItems.list pages at 50 and videos.list accepts 50 ids per call, so a
 * 500-video first load costs 10 + 10 = 20 units. Cached for 5 minutes to save
 * quota; call again with the returned nextPageToken for "Load more".
 */
export async function listVideos(
  apiKey: string,
  uploadsPlaylistId: string,
  options: ListVideosOptions = {},
): Promise<VideoListPage> {
  const limit = clampLimit(options.limit ?? FIRST_LOAD_LIMIT);
  const startToken = options.pageToken ?? null;
  const cacheKey = `videos.${uploadsPlaylistId}.${startToken ?? 'first'}.${limit}`;

  if (options.useCache !== false) {
    const cached = readCache<VideoListPage>(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  const ids: string[] = [];
  let pageToken = startToken;
  let nextPageToken: string | null = null;
  let quotaUsed = 0;

  do {
    const page = await youtubeGet<ListResponse<RawPlaylistItem>>({
      resource: 'playlistItems',
      params: {
        part: 'contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: PAGE_SIZE,
        ...(pageToken ? { pageToken } : {}),
      },
      apiKey,
      quotaUnits: QUOTA_COSTS.playlistItemsList,
    });
    quotaUsed += QUOTA_COSTS.playlistItemsList;

    for (const item of page.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id) ids.push(id);
    }

    nextPageToken = page.nextPageToken ?? null;
    pageToken = nextPageToken;
  } while (pageToken && ids.length < limit);

  const wanted = ids.slice(0, limit);
  const videos: Video[] = [];

  for (let index = 0; index < wanted.length; index += PAGE_SIZE) {
    const batch = wanted.slice(index, index + PAGE_SIZE);
    const response = await youtubeGet<ListResponse<RawVideo>>({
      resource: 'videos',
      params: {
        part: 'snippet,contentDetails,statistics',
        id: batch.join(','),
      },
      apiKey,
      quotaUnits: QUOTA_COSTS.videosList,
    });
    quotaUsed += QUOTA_COSTS.videosList;

    for (const item of response.items ?? []) {
      if (item.id) videos.push(normalizeVideo(item));
    }
  }

  const result: VideoListPage = {
    videos,
    nextPageToken,
    fromCache: false,
    quotaUsed,
  };

  writeCache(cacheKey, result, VIDEO_CACHE_TTL_MS);
  return result;
}
