import { youtubeGet } from './client';
import { YouTubeApiError } from './errors';
import { parseChannelInput, type ChannelRef } from './parse';
import { QUOTA_COSTS } from './quota';
import {
  bestThumbnail,
  toCount,
  type Channel,
  type ListResponse,
  type RawChannel,
} from './types';

const CHANNEL_PARTS = 'snippet,statistics,contentDetails';

/**
 * Subscriber counts at 1,000+ are rounded by YouTube (3 significant digits),
 * so every display of them must carry an "≈".
 */
export function normalizeChannel(raw: RawChannel): Channel {
  const stats = raw.statistics;
  const hidden = stats?.hiddenSubscriberCount === true;
  const subscriberCount = hidden ? null : toCount(stats?.subscriberCount);

  return {
    id: raw.id ?? '',
    title: raw.snippet?.title?.trim() || 'Untitled channel',
    handle: raw.snippet?.customUrl?.trim() || null,
    description: raw.snippet?.description ?? '',
    thumbnailUrl: bestThumbnail(raw.snippet?.thumbnails),
    subscriberCount,
    subscribersIsRounded: subscriberCount !== null && subscriberCount >= 1000,
    viewCount: toCount(stats?.viewCount),
    videoCount: toCount(stats?.videoCount),
    uploadsPlaylistId: raw.contentDetails?.relatedPlaylists?.uploads ?? null,
  };
}

async function fetchChannel(apiKey: string, ref: ChannelRef): Promise<Channel> {
  const params =
    ref.kind === 'id' ? { id: ref.value } : { forHandle: ref.value };
  const response = await youtubeGet<ListResponse<RawChannel>>({
    resource: 'channels',
    params: { part: CHANNEL_PARTS, ...params },
    apiKey,
    quotaUnits: QUOTA_COSTS.channelsList,
  });

  const item = response.items?.[0];
  if (!item) {
    throw new YouTubeApiError('NOT_FOUND', 'No channel matched that lookup.');
  }
  return normalizeChannel(item);
}

/** Looks up a channel by @handle, channel URL, or raw UC… id. */
export async function resolveChannel(apiKey: string, input: string): Promise<Channel> {
  const ref = parseChannelInput(input);
  if (!ref) {
    throw new YouTubeApiError(
      'NOT_FOUND',
      'That is not a channel handle, channel URL or channel ID.',
    );
  }
  return fetchChannel(apiKey, ref);
}

/** Fetches a channel by id, e.g. one already stored on this device. */
export async function getChannel(apiKey: string, channelId: string): Promise<Channel> {
  return fetchChannel(apiKey, { kind: 'id', value: channelId });
}
