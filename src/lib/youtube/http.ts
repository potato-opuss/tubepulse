/**
 * The only place in the app allowed to perform YouTube HTTP calls.
 * UI components must go through this module (or future siblings in this
 * folder) — never call fetch directly.
 */

export class YouTubeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'YouTubeApiError';
    this.status = status;
  }
}

type FetchJsonOptions = {
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

/** Minimal typed JSON fetch used by the YouTube API modules. */
export async function fetchYouTubeJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined) query.set(key, String(value));
  }
  const fullUrl = query.size > 0 ? `${url}?${query.toString()}` : url;

  const response = await fetch(fullUrl, {
    headers: { Accept: 'application/json' },
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) {
    throw new YouTubeApiError(`YouTube API request failed (${response.status}).`, response.status);
  }

  return (await response.json()) as T;
}
