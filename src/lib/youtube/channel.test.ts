import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChannel, resolveChannel } from './channel';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function channelItem(statistics: Record<string, unknown>, id = 'UCabc123') {
  return {
    id,
    snippet: {
      title: 'Pulse Studio',
      description: 'Weekly finance explainers.',
      customUrl: '@pulsestudio',
      thumbnails: { high: { url: 'https://img.example/high.jpg' } },
    },
    statistics,
    contentDetails: { relatedPlaylists: { uploads: 'UUabc123' } },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveChannel', () => {
  it('looks handles up with forHandle and normalizes the channel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({
        items: [
          channelItem({
            viewCount: '1234567',
            subscriberCount: '15300',
            hiddenSubscriberCount: false,
            videoCount: '214',
          }),
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const channel = await resolveChannel('KEY', 'https://youtube.com/@pulsestudio');

    expect(channel).toMatchObject({
      id: 'UCabc123',
      title: 'Pulse Studio',
      handle: '@pulsestudio',
      subscriberCount: 15300,
      subscribersIsRounded: true,
      viewCount: 1_234_567,
      videoCount: 214,
      uploadsPlaylistId: 'UUabc123',
      thumbnailUrl: 'https://img.example/high.jpg',
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('forHandle')).toBe('pulsestudio');
    expect(url.searchParams.get('key')).toBe('KEY');
    expect(url.searchParams.get('part')).toContain('statistics');
  });

  it('flags subscriber counts below 1,000 as exact', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          items: [channelItem({ subscriberCount: '940', hiddenSubscriberCount: false })],
        }),
      ),
    );

    const channel = await resolveChannel('KEY', '@pulsestudio');
    expect(channel.subscriberCount).toBe(940);
    expect(channel.subscribersIsRounded).toBe(false);
  });

  it('returns null subscribers, not zero, when the count is hidden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          items: [channelItem({ hiddenSubscriberCount: true, viewCount: '10' })],
        }),
      ),
    );

    const channel = await resolveChannel('KEY', '@pulsestudio');
    expect(channel.subscriberCount).toBeNull();
    expect(channel.subscribersIsRounded).toBe(false);
  });

  it('uses id lookups for raw channel ids', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ items: [channelItem({ subscriberCount: '5000' })] });
    });
    vi.stubGlobal('fetch', fetchMock);

    await getChannel('KEY', 'UCBJycsmduvYEL83R_U4JriQ');

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('id')).toBe('UCBJycsmduvYEL83R_U4JriQ');
    expect(url.searchParams.get('forHandle')).toBeNull();
  });

  it('throws NOT_FOUND for unknown or malformed input', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ items: [] })));

    await expect(resolveChannel('KEY', '@nobody')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(resolveChannel('KEY', 'https://example.com')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
