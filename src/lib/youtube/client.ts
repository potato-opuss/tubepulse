import { YouTubeApiError, type YouTubeErrorCode } from './errors';
import { QUOTA_COSTS, recordQuota } from './quota';

/**
 * The only place in the app allowed to perform YouTube HTTP calls.
 * UI components must go through this module or its siblings.
 */

export const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
export const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [400, 1_200];

type QueryParams = Record<string, string | number | undefined>;

export type YouTubeRequest = {
  resource: 'channels' | 'playlistItems' | 'videos';
  params: QueryParams;
  apiKey: string;
  quotaUnits?: number;
};

type GoogleErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string; domain?: string }>;
  };
};

const QUOTA_REASONS = new Set([
  'quotaexceeded',
  'dailylimitexceeded',
  'dailylimitexceededunreg',
  'ratelimitexceeded',
]);

const KEY_REASONS = new Set(['keyinvalid', 'api_key_invalid', 'api_key_expired']);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildUrl({ resource, params, apiKey }: YouTubeRequest): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  query.set('key', apiKey);
  return `${YOUTUBE_API_BASE}/${resource}?${query.toString()}`;
}

function invalidKey(status: number): YouTubeApiError {
  return new YouTubeApiError(
    'INVALID_KEY',
    'Google rejected the API key.',
    status,
  );
}

/** Maps a Google error response onto the five typed error codes. */
export function mapApiError(status: number, body: unknown): YouTubeApiError {
  const error = (body as GoogleErrorBody | null)?.error;
  const reasons = (error?.errors ?? []).map((item) => (item.reason ?? '').toLowerCase());
  const message = (error?.message ?? '').toLowerCase();
  const keyProblem =
    reasons.some((reason) => KEY_REASONS.has(reason)) ||
    message.includes('api key not valid') ||
    message.includes('api key expired');

  if (status === 400 || status === 401) {
    return keyProblem
      ? invalidKey(status)
      : new YouTubeApiError('FORBIDDEN', 'YouTube rejected the request.', status);
  }

  if (status === 403) {
    if (reasons.some((reason) => QUOTA_REASONS.has(reason))) {
      return new YouTubeApiError('QUOTA_EXCEEDED', 'The daily quota is used up.', status);
    }
    if (keyProblem) return invalidKey(status);
    return new YouTubeApiError('FORBIDDEN', 'This key is not allowed to use the API.', status);
  }

  if (status === 404) {
    return new YouTubeApiError('NOT_FOUND', 'YouTube did not find that resource.', status);
  }

  if (status >= 500) {
    return new YouTubeApiError('NETWORK', 'YouTube returned a server error.', status);
  }

  return new YouTubeApiError('FORBIDDEN', 'YouTube rejected the request.', status);
}

async function attemptFetch(url: string, quotaUnits: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    throw new YouTubeApiError('NETWORK', 'Could not reach YouTube.', null);
  } finally {
    clearTimeout(timer);
  }

  recordQuota(quotaUnits);

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) throw mapApiError(response.status, body);
  return body;
}

function isRetryable(error: YouTubeApiError): boolean {
  return error.code === 'NETWORK';
}

/**
 * Runs a GET against the YouTube Data API v3 with a 15s timeout and up to two
 * retries (with backoff) on network and 5xx failures. The API key is only ever
 * sent in the query string Google requires; it is never logged.
 */
export async function youtubeGet<T>(request: YouTubeRequest): Promise<T> {
  const url = buildUrl(request);
  const quotaUnits = request.quotaUnits ?? 1;
  let lastError: YouTubeApiError | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await delay(RETRY_DELAYS_MS[attempt - 1] ?? 0);

    try {
      return (await attemptFetch(url, quotaUnits)) as T;
    } catch (error) {
      const apiError =
        error instanceof YouTubeApiError
          ? error
          : new YouTubeApiError('NETWORK', 'Could not reach YouTube.', null);

      if (!isRetryable(apiError)) throw apiError;
      lastError = apiError;
    }
  }

  throw lastError ?? new YouTubeApiError('NETWORK', 'Could not reach YouTube.', null);
}

export type { YouTubeErrorCode };
export { QUOTA_COSTS };
