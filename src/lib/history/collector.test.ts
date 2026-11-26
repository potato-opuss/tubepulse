import { describe, expect, it } from 'vitest';
import {
  changedVideoSnapshots,
  channelValuesChanged,
  latestPerVideo,
  shouldWriteSnapshot,
  toChannelSnapshot,
  toVideoSnapshots,
} from './collector';
import type { ChannelSnapshot, VideoSnapshot } from './types';
import type { Channel, Video } from '../youtube/types';

const MINUTE = 60_000;
const WRITE_AFTER = 15 * MINUTE;

function snapshot(ts: number, subs = 100): ChannelSnapshot {
  return { ts, subs, views: 1000, videoCount: 10, subsRounded: false };
}

function videoPoint(videoId: string, ts: number, views: number): VideoSnapshot {
  return { videoId, ts, views, likes: 1, comments: 0 };
}

function channel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 'UC123',
    title: 'Pulse',
    handle: '@pulse',
    description: '',
    thumbnailUrl: null,
    subscriberCount: 1500,
    subscribersIsRounded: true,
    viewCount: 9000,
    videoCount: 20,
    uploadsPlaylistId: 'UU123',
    ...overrides,
  };
}

function video(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid1',
    title: 'One',
    description: '',
    publishedAt: '',
    thumbnailUrl: null,
    durationSeconds: 10,
    viewCount: 50,
    likeCount: 4,
    commentCount: 1,
    tags: [],
    ...overrides,
  };
}

describe('snapshot normalization', () => {
  it('maps channel counters and the rounded flag', () => {
    expect(toChannelSnapshot(channel(), 5000)).toEqual({
      ts: 5000,
      subs: 1500,
      views: 9000,
      videoCount: 20,
      subsRounded: true,
    });
  });

  it('keeps hidden counts as null and skips empty video ids', () => {
    expect(toChannelSnapshot(channel({ subscriberCount: null, subscribersIsRounded: false }), 1).subs).toBeNull();
    expect(toVideoSnapshots([video(), video({ id: '' })], 5000)).toEqual([
      { videoId: 'vid1', ts: 5000, views: 50, likes: 4, comments: 1 },
    ]);
  });
});

describe('shouldWriteSnapshot', () => {
  it('writes the first snapshot', () => {
    expect(shouldWriteSnapshot(null, snapshot(1000), null, 1000)).toBe(true);
  });

  it('skips an unchanged value inside 15 minutes', () => {
    expect(shouldWriteSnapshot(snapshot(1000), snapshot(2000), 1000, 2000)).toBe(false);
  });

  it('writes a changed value immediately', () => {
    expect(shouldWriteSnapshot(snapshot(1000, 100), snapshot(2000, 101), 1000, 2000)).toBe(true);
  });

  it('writes an unchanged value after 15 minutes', () => {
    const now = 1000 + WRITE_AFTER;
    expect(shouldWriteSnapshot(snapshot(1000), snapshot(now), 1000, now)).toBe(true);
  });

  it('detects each channel counter change', () => {
    expect(channelValuesChanged(snapshot(1), snapshot(2, 101))).toBe(true);
    expect(
      channelValuesChanged(snapshot(1), { ...snapshot(2), subsRounded: true }),
    ).toBe(true);
  });
});

describe('video comparison', () => {
  it('returns only changed or new videos', () => {
    const previous = [videoPoint('a', 1, 10), videoPoint('b', 1, 20)];
    const next = [
      videoPoint('a', 2, 10),
      videoPoint('b', 2, 25),
      videoPoint('c', 2, 5),
    ];

    expect(changedVideoSnapshots(previous, next).map((point) => point.videoId)).toEqual([
      'b',
      'c',
    ]);
  });

  it('collapses all points to the newest per video', () => {
    const latest = latestPerVideo([
      videoPoint('a', 1, 10),
      videoPoint('a', 3, 30),
      videoPoint('b', 2, 20),
    ]);

    expect(latest.find((point) => point.videoId === 'a')?.views).toBe(30);
    expect(latest).toHaveLength(2);
  });
});
