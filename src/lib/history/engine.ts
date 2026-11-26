import { SETTINGS_KEYS, storage } from '../storage';
import { buildBackup } from './backup';
import { exportHistoryFile, importHistoryFile } from './backupIo';
import { parseCollectInterval, type CollectInterval } from './config';
import {
  changedVideoSnapshots,
  collectSnapshot,
  shouldWriteSnapshot,
} from './collector';
import {
  historyCounts,
  latestChannelSnapshot,
  latestVideoSnapshots,
  readChannelSnapshots,
  readVideoSnapshots,
  saveChannelSnapshots,
  saveVideoSnapshots,
} from './db';
import { mergeChannelSnapshots, mergeVideoSnapshots } from './merge';
import { normalizeRepo } from './remote';
import { fetchRemoteSnapshots } from './remoteClient';

export type HistoryConfig = {
  apiKey: string | null;
  channelInput: string | null;
  channelId: string | null;
  intervalMin: CollectInterval;
  remoteRepo: string | null;
};

export async function loadHistoryConfig(): Promise<HistoryConfig> {
  const [apiKey, channelInput, channelId, intervalRaw, remoteRepo] = await Promise.all([
    storage.get(SETTINGS_KEYS.youtubeApiKey),
    storage.get(SETTINGS_KEYS.youtubeChannel),
    storage.get(SETTINGS_KEYS.youtubeChannelId),
    storage.get(SETTINGS_KEYS.collectInterval),
    storage.get(SETTINGS_KEYS.remoteRepo),
  ]);

  return {
    apiKey: apiKey?.trim() || null,
    channelInput: channelInput?.trim() || null,
    channelId: channelId?.trim() || null,
    intervalMin: parseCollectInterval(intervalRaw),
    remoteRepo: remoteRepo ? normalizeRepo(remoteRepo) : null,
  };
}

export async function saveInterval(value: CollectInterval): Promise<void> {
  await storage.set(SETTINGS_KEYS.collectInterval, String(value));
}

export async function saveRemoteRepo(value: string | null): Promise<void> {
  if (value === null) {
    await storage.remove(SETTINGS_KEYS.remoteRepo);
    return;
  }
  await storage.set(SETTINGS_KEYS.remoteRepo, value);
}

export type CollectOutcome = {
  channelId: string;
  channelTitle: string;
  ts: number;
  warning: string | null;
  wrote: boolean;
};

/** Collects, then writes only when a value changed or 15+ minutes passed. */
export async function collectAndStore(config: HistoryConfig): Promise<CollectOutcome> {
  if (!config.apiKey) throw new Error('No API key is stored.');

  const result = await collectSnapshot({
    apiKey: config.apiKey,
    channelInput: config.channelInput ?? '',
    channelId: config.channelId,
  });

  const now = result.channel.ts;
  const previousChannel = await latestChannelSnapshot();
  const previousVideos = await latestVideoSnapshots(
    result.videos.map((snapshot) => snapshot.videoId),
  );
  const writeChannel = shouldWriteSnapshot(
    previousChannel,
    result.channel,
    previousChannel?.ts ?? null,
    now,
  );
  const changedVideos = changedVideoSnapshots(previousVideos, result.videos);
  const wrote = writeChannel || changedVideos.length > 0;

  if (wrote) {
    await saveChannelSnapshots([result.channel]);
    await saveVideoSnapshots(writeChannel ? result.videos : changedVideos);
  }

  if (result.channelId !== config.channelId) {
    await Promise.all([
      storage.set(SETTINGS_KEYS.youtubeChannelId, result.channelId),
      storage.set(SETTINGS_KEYS.youtubeChannelTitle, result.channelTitle),
    ]);
  }

  await storage.set(SETTINGS_KEYS.lastCollectAt, String(now));

  return {
    channelId: result.channelId,
    channelTitle: result.channelTitle,
    ts: now,
    warning: result.warning,
    wrote,
  };
}

export type RemoteOutcome = {
  channelId: string | null;
  channelPoints: number;
  videoPoints: number;
};

/** Pulls the data branch and merges it into IndexedDB by timestamp. */
export async function mergeRemoteSnapshots(
  repo: string,
  currentChannelId: string | null,
): Promise<RemoteOutcome> {
  const parsed = await fetchRemoteSnapshots(repo);
  const [localChannel, localVideos] = await Promise.all([
    readChannelSnapshots(),
    readVideoSnapshots(),
  ]);

  if (parsed.channel.length > 0) {
    await saveChannelSnapshots(mergeChannelSnapshots(localChannel, parsed.channel));
  }
  if (parsed.videos.length > 0) {
    await saveVideoSnapshots(mergeVideoSnapshots(localVideos, parsed.videos));
  }
  if (parsed.channelId && !currentChannelId) {
    await storage.set(SETTINGS_KEYS.youtubeChannelId, parsed.channelId);
  }

  return {
    channelId: parsed.channelId,
    channelPoints: parsed.channel.length,
    videoPoints: parsed.videos.length,
  };
}

export async function exportStoredBackup(channelId: string | null): Promise<string> {
  const [channel, videos] = await Promise.all([
    readChannelSnapshots(),
    readVideoSnapshots(),
  ]);
  if (channel.length === 0 && videos.length === 0) {
    return 'No snapshots to export yet.';
  }
  return exportHistoryFile(buildBackup(channel, videos, channelId));
}

export type ImportOutcome = {
  channelId: string | null;
  channelPoints: number;
  videoPoints: number;
};

export async function importStoredBackup(
  file: File,
  currentChannelId: string | null,
): Promise<ImportOutcome> {
  const backup = await importHistoryFile(file);
  const [localChannel, localVideos] = await Promise.all([
    readChannelSnapshots(),
    readVideoSnapshots(),
  ]);
  await saveChannelSnapshots(mergeChannelSnapshots(localChannel, backup.channel));
  await saveVideoSnapshots(mergeVideoSnapshots(localVideos, backup.videos));

  if (backup.channelId && !currentChannelId) {
    await storage.set(SETTINGS_KEYS.youtubeChannelId, backup.channelId);
  }

  return {
    channelId: backup.channelId,
    channelPoints: backup.channel.length,
    videoPoints: backup.videos.length,
  };
}

export { historyCounts };
