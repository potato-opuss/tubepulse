import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from './cache';
import { getQuotaUsage } from './quota';
import { listVideos } from './videos';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

type MockVideo = {
  id: string;
  title: string;
  duration: string;
  statistics: Record<string, string>;
};

const videos: MockVideo[] = [
  {
    id: 'v1',
    title: 'First video',
    duration: 'PT1H2M3S',
    statistics: { viewCount: '1000', likeCount: '50', commentCount: '8' },
  },
  {
    id: 'v2',
    title: 'Likes disabled',
    duration: 'PT45S',
    statistics: { viewCount: '250' },
  },
  {
    id: 'v3',
    title: 'Third video',
    duration: 'P1DT1M',
    statistics: { viewCount: '75', likeCount: '3', commentCount: '1' },
  },
];

function videoResponse(ids: string[]) {
  return {
    items: videos
      .filter((video) => ids.includes(video.id))
      .map((video) => ({
        id: video.id,
        snippet: {
          title: video.title,
          publishedAt: '2026-01-01T00:00:00Z',
          tags: ['finance'],
          thumbnails: { default: { url: `https://img.example/${video.id}.jpg` } },
        },
        contentDetails: { duration: video.duration },
        statistics: video.statistics,
      })),
  };
}

function stubApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/playlistItems')) {
      const pageToken = url.searchParams.get('pageToken');
      if (!pageToken) {
        return jsonResponse({
          items: [{ contentDetails: { videoId: 'v1' } }, { contentDetails: { videoId: 'v2' } }],
          nextPageToken: 'PAGE2',
        });
      }
      return jsonResponse({ items: [{ contentDetails: { videoId: 'v3' } }] });
    }
    const ids = (url.searchParams.get('id') ?? '').split(',');
    return jsonResponse(videoResponse(ids));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  clearCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listVideos', () => {
  it('parses durations, keeps order and uses null for missing likes/comments', async () => {
    stubApi();

    const page = await listVideos('KEY', 'UUabc', { limit: 3 });

    expect(page.videos.map((video) => video.id)).toEqual(['v1', 'v2', 'v3']);
    expect(page.videos[0]).toMatchObject({
      title: 'First video',
      durationSeconds: 3723,
      viewCount: 1000,
      likeCount: 50,
      commentCount: 8,
      thumbnailUrl: 'https://img.example/v1.jpg',
    });
    expect(page.videos[1]?.likeCount).toBeNull();
    expect(page.videos[1]?.commentCount).toBeNull();
    expect(page.videos[2]?.durationSeconds).toBe(86_460);
    // All pages were consumed to fill the limit, so there is nothing left to load.
    expect(page.nextPageToken).toBeNull();
    expect(page.fromCache).toBe(false);
  });

  it('caps at the requested limit and stops paging once it is reached', async () => {
    const fetchMock = stubApi();

    const page = await listVideos('KEY', 'UUabc', { limit: 2 });

    expect(page.videos.map((video) => video.id)).toEqual(['v1', 'v2']);
    const playlistCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/playlistItems'),
    );
    expect(playlistCalls).toHaveLength(1);
  });

  it('serves the second call from the 5-minute cache and saves quota', async () => {
    const fetchMock = stubApi();

    await listVideos('KEY', 'UUabc');
    const quotaAfterFirst = getQuotaUsage().used;
    const callsAfterFirst = fetchMock.mock.calls.length;

    const cached = await listVideos('KEY', 'UUabc');

    expect(cached.fromCache).toBe(true);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
    expect(getQuotaUsage().used).toBe(quotaAfterFirst);
  });

  it('costs one unit per playlist page and one per videos batch', async () => {
    stubApi();

    // Two playlist pages (v1/v2, then v3) plus one videos.list batch.
    await listVideos('KEY', 'UUabc');
    expect(getQuotaUsage().used).toBe(3);

    await listVideos('KEY', 'UUabc', { pageToken: 'PAGE2' });
    expect(getQuotaUsage().used).toBe(5);
  });

  it('returns an empty page for an empty playlist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ items: [] })),
    );

    const page = await listVideos('KEY', 'UUempty', { useCache: false });
    expect(page.videos).toEqual([]);
    expect(page.nextPageToken).toBeNull();
  });
});
