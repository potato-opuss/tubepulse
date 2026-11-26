import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup, parseBackupText, serializeBackup } from './backup';
import type { ChannelSnapshot, VideoSnapshot } from './types';

const channel: ChannelSnapshot[] = [
  { ts: 2000, subs: 120, views: 500, videoCount: 10, subsRounded: false },
  { ts: 1000, subs: 100, views: 400, videoCount: 9, subsRounded: false },
];
const videos: VideoSnapshot[] = [
  { videoId: 'v1', ts: 1000, views: 10, likes: 1, comments: 0 },
];

describe('history backup', () => {
  it('round-trips channel and video points', () => {
    const backup = buildBackup(channel, videos, 'UC123', 5000);
    const parsed = parseBackupText(serializeBackup(backup));

    expect(parsed?.channelId).toBe('UC123');
    expect(parsed?.channel.map((point) => point.ts)).toEqual([1000, 2000]);
    expect(parsed?.videos).toHaveLength(1);
  });

  it('rejects a different version', () => {
    expect(parseBackup({ version: 2, channel: [], videos: [] })).toBeNull();
  });

  it('rejects junk and empty backups', () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup({ version: 1, channel: [], videos: [] })).toBeNull();
    expect(parseBackupText('not json')).toBeNull();
  });

  it('drops invalid points but keeps valid ones', () => {
    const parsed = parseBackup({
      version: 1,
      channel: [{ ts: 0, subs: 1 }, { ts: 1000, subs: 2 }],
      videos: [{ videoId: '', ts: 1000, views: 1 }],
    });

    expect(parsed?.channel).toHaveLength(1);
    expect(parsed?.videos).toHaveLength(0);
  });
});
