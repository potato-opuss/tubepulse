import { describe, expect, it } from 'vitest';
import { mergeChannelSnapshots, mergeVideoSnapshots } from './merge';
import type { ChannelSnapshot, VideoSnapshot } from './types';

function channel(ts: number, subs: number | null, views: number | null = null): ChannelSnapshot {
  return { ts, subs, views, videoCount: null, subsRounded: false };
}

function video(videoId: string, ts: number, views: number | null): VideoSnapshot {
  return { videoId, ts, views, likes: null, comments: null };
}

describe('mergeChannelSnapshots', () => {
  it('de-duplicates by timestamp and keeps non-null fields from both sides', () => {
    const local = [channel(200, 120), channel(100, 100)];
    const remote = [channel(100, 999, 500), channel(300, 130)];

    const merged = mergeChannelSnapshots(local, remote);

    expect(merged.map((point) => point.ts)).toEqual([100, 200, 300]);
    expect(merged[0]).toMatchObject({ subs: 100, views: 500 });
    expect(merged[2]?.subs).toBe(130);
  });

  it('skips invalid timestamps', () => {
    const merged = mergeChannelSnapshots([channel(0, 10)], [channel(Number.NaN, 20)]);
    expect(merged).toEqual([]);
  });
});

describe('mergeVideoSnapshots', () => {
  it('keys by videoId + timestamp', () => {
    const local = [video('a', 100, 10), video('b', 100, 20)];
    const remote = [video('a', 100, 999), video('a', 200, 30)];

    const merged = mergeVideoSnapshots(local, remote);

    expect(merged).toHaveLength(3);
    expect(merged.find((point) => point.videoId === 'a' && point.ts === 100)?.views).toBe(10);
    expect(merged.find((point) => point.videoId === 'a' && point.ts === 200)?.views).toBe(30);
  });

  it('sorts by timestamp then video id', () => {
    const merged = mergeVideoSnapshots([video('b', 200, 1), video('a', 200, 1)], []);
    expect(merged.map((point) => point.videoId)).toEqual(['a', 'b']);
  });
});
