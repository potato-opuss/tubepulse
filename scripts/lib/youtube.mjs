/** YouTube Data API v3 reader for PUBLIC counters only (never revenue). */

import { setTimeout as sleep } from 'node:timers/promises';
import { count } from './snapshots.mjs';

const API = 'https://www.googleapis.com/youtube/v3';
const PAGE_SIZE = 50;

export function createYouTubeClient({ apiKey }) {
  async function fetchJson(url) {
    let lastError = new Error('Request failed');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
        const text = await response.text();
        const error = new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      await sleep(1000 * (attempt + 1));
    }
    throw lastError;
  }

  async function get(resource, params) {
    const url = new URL(`${API}/${resource}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    url.searchParams.set('key', apiKey);
    return fetchJson(url.toString());
  }

  async function fetchChannel(channelId) {
    const response = await get('channels', {
      part: 'snippet,statistics,contentDetails',
      id: channelId,
    });
    const item = response.items?.[0];
    if (!item) throw new Error(`Channel ${channelId} was not found.`);
    return item;
  }

  async function fetchVideoStats(uploadsPlaylistId) {
    const ids = [];
    let pageToken;
    do {
      const page = await get('playlistItems', {
        part: 'contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: PAGE_SIZE,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const item of page.items ?? []) {
        const id = item.contentDetails?.videoId;
        if (id) ids.push(id);
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    const stats = new Map();
    for (let index = 0; index < ids.length; index += PAGE_SIZE) {
      const batch = ids.slice(index, index + PAGE_SIZE);
      const response = await get('videos', {
        part: 'statistics',
        id: batch.join(','),
      });
      for (const item of response.items ?? []) {
        if (!item.id) continue;
        stats.set(item.id, {
          v: count(item.statistics?.viewCount),
          l: count(item.statistics?.likeCount),
          c: count(item.statistics?.commentCount),
        });
      }
    }
    return stats;
  }

  return { fetchChannel, fetchVideoStats };
}
