/** Normalized YouTube types. Raw response shapes stay in this file only. */

export type Thumbnail = {
  url: string;
  width?: number;
  height?: number;
};

export type ThumbnailMap = {
  default?: Thumbnail;
  medium?: Thumbnail;
  high?: Thumbnail;
  standard?: Thumbnail;
  maxres?: Thumbnail;
};

export type Channel = {
  id: string;
  title: string;
  handle: string | null;
  description: string;
  thumbnailUrl: string | null;
  /** null when the channel hides its subscriber count. */
  subscriberCount: number | null;
  /** YouTube rounds public counts above 1,000, so the UI should show "≈". */
  subscribersIsRounded: boolean;
  viewCount: number | null;
  videoCount: number | null;
  uploadsPlaylistId: string | null;
};

export type Video = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  /** null when likes are hidden/disabled — never 0 as a stand-in. */
  likeCount: number | null;
  commentCount: number | null;
  tags: string[];
};

export type ListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  pageInfo?: { totalResults?: number; resultsPerPage?: number };
};

export type RawChannel = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: ThumbnailMap;
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
};

export type RawPlaylistItem = {
  contentDetails?: { videoId?: string };
};

export type RawVideo = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    tags?: string[];
    thumbnails?: ThumbnailMap;
  };
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

export function bestThumbnail(thumbnails: ThumbnailMap | undefined): string | null {
  if (!thumbnails) return null;
  const order: Array<keyof ThumbnailMap> = ['maxres', 'standard', 'high', 'medium', 'default'];
  for (const key of order) {
    const url = thumbnails[key]?.url;
    if (url) return url;
  }
  return null;
}

/** Google sends counts as strings; missing or invalid values become null. */
export function toCount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
