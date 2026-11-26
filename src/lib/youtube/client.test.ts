import { afterEach, describe, expect, it, vi } from 'vitest';
import { youtubeGet } from './client';
import { getQuotaUsage } from './quota';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorBody(reason: string, message = 'Request failed'): unknown {
  return { error: { code: 403, message, errors: [{ reason, domain: 'youtube' }] } };
}

function call(): Promise<unknown> {
  return youtubeGet({ resource: 'channels', params: { part: 'snippet' }, apiKey: 'KEY' });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('youtubeGet error mapping', () => {
  it('maps quotaExceeded to QUOTA_EXCEEDED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(errorBody('quotaExceeded'), 403)));
    await expect(call()).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('maps an invalid key to INVALID_KEY', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(errorBody('keyInvalid', 'API key not valid. Please pass a valid API key.'), 400),
      ),
    );
    await expect(call()).rejects.toMatchObject({ code: 'INVALID_KEY' });
  });

  it('maps a forbidden key to FORBIDDEN', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(errorBody('forbidden'), 403)));
    await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('maps 404 to NOT_FOUND', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { code: 404 } }, 404)));
    await expect(call()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('maps repeated server errors to NETWORK after two retries', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => jsonResponse({ error: { code: 503 } }, 503));
    vi.stubGlobal('fetch', fetchMock);

    const promise = call();
    const assertion = expect(promise).rejects.toMatchObject({ code: 'NETWORK' });
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('youtubeGet retries', () => {
  it('retries a network failure with backoff and succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = call();
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a quota error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(errorBody('quotaExceeded'), 403));
    vi.stubGlobal('fetch', fetchMock);

    await expect(call()).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('quota meter', () => {
  it('counts one unit per request attempt', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ items: [] })));

    await call();
    expect(getQuotaUsage().used).toBe(1);
    await call();
    expect(getQuotaUsage().used).toBe(2);
  });

  it('never attaches the key to the error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(errorBody('forbidden'), 403)));

    try {
      await call();
      throw new Error('expected failure');
    } catch (error) {
      expect(String(error)).not.toContain('KEY');
    }
  });
});
