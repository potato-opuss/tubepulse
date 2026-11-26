export type YouTubeErrorCode =
  | 'INVALID_KEY'
  | 'QUOTA_EXCEEDED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NETWORK';

export class YouTubeApiError extends Error {
  readonly code: YouTubeErrorCode;
  readonly status: number | null;

  constructor(code: YouTubeErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'YouTubeApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * User-facing explanation for each typed error. Kept in one place so the UI
 * never leaks raw Google responses or the API key.
 */
export function youtubeErrorMessage(error: unknown): string {
  if (!(error instanceof YouTubeApiError)) {
    return 'Something went wrong while talking to YouTube. Try again.';
  }

  switch (error.code) {
    case 'INVALID_KEY':
      return 'Google rejected this API key. Check that it is a YouTube Data API v3 key.';
    case 'QUOTA_EXCEEDED':
      return 'The daily YouTube API quota is used up. It resets at midnight Pacific Time.';
    case 'NOT_FOUND':
      return 'No channel was found for that handle, URL or ID.';
    case 'FORBIDDEN':
      return 'This key cannot call the YouTube Data API v3. Check that the API is enabled and the key is restricted to it.';
    case 'NETWORK':
      return 'Could not reach YouTube. Check your connection and try again.';
  }
}
