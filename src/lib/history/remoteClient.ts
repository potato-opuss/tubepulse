import {
  parseRemoteSnapshots,
  remoteSnapshotsUrl,
  type ParsedRemote,
} from './remote';

/**
 * Fetches the public data branch. This is the only network call outside
 * src/lib/youtube/ and it never carries the YouTube API key.
 */
export async function fetchRemoteSnapshots(repo: string): Promise<ParsedRemote> {
  const url = remoteSnapshotsUrl(repo);
  if (!url) throw new Error('That does not look like owner/repo.');

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'No data branch yet. Run the collector workflow once.'
        : `GitHub returned ${response.status}.`,
    );
  }

  const parsed = parseRemoteSnapshots(await response.json());
  if (!parsed) throw new Error('The remote snapshot file is not valid.');
  return parsed;
}
