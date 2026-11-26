import { describe, expect, it } from 'vitest';
import { normalizeRepo, parseRemoteSnapshots, remoteSnapshotsUrl } from './remote';

describe('normalizeRepo', () => {
  it('accepts owner/repo and GitHub URLs', () => {
    expect(normalizeRepo('potato-opuss/tubepulse')).toBe('potato-opuss/tubepulse');
    expect(normalizeRepo('https://github.com/potato-opuss/tubepulse.git')).toBe(
      'potato-opuss/tubepulse',
    );
    expect(normalizeRepo(' potato-opuss/tubepulse/ ')).toBe('potato-opuss/tubepulse');
  });

  it('rejects malformed values', () => {
    expect(normalizeRepo('tubepulse')).toBeNull();
    expect(normalizeRepo('owner/repo/extra')).toBeNull();
    expect(normalizeRepo('')).toBeNull();
  });
});

describe('remoteSnapshotsUrl', () => {
  it('points at the data branch on raw.githubusercontent.com', () => {
    expect(remoteSnapshotsUrl('potato-opuss/tubepulse')).toBe(
      'https://raw.githubusercontent.com/potato-opuss/tubepulse/data/snapshots.json',
    );
  });

  it('returns null for an invalid repo', () => {
    expect(remoteSnapshotsUrl('nope')).toBeNull();
  });
});

describe('parseRemoteSnapshots', () => {
  it('maps the compact collector format', () => {
    const parsed = parseRemoteSnapshots({
      version: 1,
      channelId: 'UC123',
      channel: [{ t: 1000, s: 1500, v: 9000, c: 20, r: true }],
      videos: {
        vid1: [{ t: 1000, v: 50, l: 4, c: 1 }],
      },
    });

    expect(parsed?.channelId).toBe('UC123');
    expect(parsed?.channel).toEqual([
      { ts: 1000, subs: 1500, views: 9000, videoCount: 20, subsRounded: true },
    ]);
    expect(parsed?.videos).toEqual([
      { videoId: 'vid1', ts: 1000, views: 50, likes: 4, comments: 1 },
    ]);
  });

  it('skips invalid entries instead of failing the whole file', () => {
    const parsed = parseRemoteSnapshots({
      channel: [{ t: 0, s: 10 }, { t: 1000, s: -5 }, { t: 2000, s: 20 }],
      videos: { vid1: [{ t: 1000, v: 'bad' }] },
    });

    expect(parsed?.channel).toHaveLength(1);
    expect(parsed?.channel[0]?.subs).toBe(20);
    expect(parsed?.videos).toHaveLength(0);
  });

  it('returns null for a non-object payload', () => {
    expect(parseRemoteSnapshots(null)).toBeNull();
    expect(parseRemoteSnapshots([])).toBeNull();
    expect(parseRemoteSnapshots('nope')).toBeNull();
  });
});
