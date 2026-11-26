import { useCallback, useEffect, useRef, useState } from 'react';
import { youtubeErrorMessage } from '../../lib/youtube/errors';
import type { CollectInterval } from '../../lib/history/config';
import {
  collectAndStore,
  exportStoredBackup,
  historyCounts,
  importStoredBackup,
  loadHistoryConfig,
  mergeRemoteSnapshots,
  saveInterval,
  saveRemoteRepo,
  type HistoryConfig,
} from '../../lib/history/engine';
import { HISTORY_SETTINGS_EVENT } from '../../lib/history/events';
import { latestChannelSnapshot } from '../../lib/history/db';
import { normalizeRepo } from '../../lib/history/remote';
import { SETTINGS_KEYS, storage } from '../../lib/storage';

export type MutableRef<T> = { current: T };

export type HistoryEngine = {
  config: HistoryConfig;
  ready: boolean;
  visible: boolean;
  collecting: boolean;
  lastUpdated: number | null;
  error: string | null;
  counts: { channel: number; videos: number };
  remoteSyncing: boolean;
  remoteMessage: string | null;
  configRef: MutableRef<HistoryConfig>;
  visibleRef: MutableRef<boolean>;
  lastAttemptRef: MutableRef<number>;
  lastRemoteRef: MutableRef<number>;
  runCollect: (force?: boolean) => Promise<void>;
  pullRemote: (manual: boolean) => Promise<void>;
  setIntervalMin: (value: CollectInterval) => void;
  setRemoteRepo: (value: string | null) => boolean;
  collectNow: () => void;
  syncRemote: () => void;
  exportBackup: () => Promise<string>;
  importBackup: (file: File) => Promise<string>;
};

const EMPTY_CONFIG: HistoryConfig = {
  apiKey: null,
  channelInput: null,
  channelId: null,
  intervalMin: 1,
  remoteRepo: null,
};

export function useHistoryEngine(): HistoryEngine {
  const [config, setConfig] = useState<HistoryConfig>(EMPTY_CONFIG);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  const [collecting, setCollecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ channel: 0, videos: 0 });
  const [remoteSyncing, setRemoteSyncing] = useState(false);
  const [remoteMessage, setRemoteMessage] = useState<string | null>(null);

  const configRef = useRef<HistoryConfig>(EMPTY_CONFIG);
  const visibleRef = useRef(visible);
  const collectingRef = useRef(false);
  const remoteSyncingRef = useRef(false);
  const lastAttemptRef = useRef(0);
  const lastRemoteRef = useRef(0);
  const mountedRef = useRef(true);

  visibleRef.current = visible;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyConfig = useCallback((next: HistoryConfig) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const loadConfig = useCallback(async (): Promise<HistoryConfig> => {
    const next = await loadHistoryConfig();
    applyConfig(next);
    if (!next.apiKey) setError(null);
    return next;
  }, [applyConfig]);

  const runCollect = useCallback(async (force = false) => {
    const cfg = configRef.current;
    if (!cfg.apiKey || (!cfg.channelId && !cfg.channelInput)) return;
    if (collectingRef.current) return;
    if (!force && !visibleRef.current) return;

    collectingRef.current = true;
    lastAttemptRef.current = Date.now();
    setCollecting(true);

    try {
      const outcome = await collectAndStore(cfg);
      if (outcome.channelId !== cfg.channelId) {
        applyConfig({ ...configRef.current, channelId: outcome.channelId });
      }
      if (!mountedRef.current) return;
      setLastUpdated(outcome.ts);
      setError(outcome.warning);
      setCounts(await historyCounts());
    } catch (cause) {
      if (mountedRef.current) setError(youtubeErrorMessage(cause));
    } finally {
      collectingRef.current = false;
      if (mountedRef.current) setCollecting(false);
    }
  }, [applyConfig]);

  const pullRemote = useCallback(async (manual: boolean) => {
    const repo = configRef.current.remoteRepo;
    if (!repo) {
      if (manual) setRemoteMessage('Add a GitHub owner/repo first.');
      return;
    }
    if (remoteSyncingRef.current) return;

    remoteSyncingRef.current = true;
    setRemoteSyncing(true);
    try {
      const outcome = await mergeRemoteSnapshots(repo, configRef.current.channelId);
      if (outcome.channelId && !configRef.current.channelId) {
        applyConfig({ ...configRef.current, channelId: outcome.channelId });
      }
      lastRemoteRef.current = Date.now();
      if (!mountedRef.current) return;
      setCounts(await historyCounts());
      setRemoteMessage(
        `Merged ${outcome.channelPoints} channel and ${outcome.videoPoints} video points from GitHub.`,
      );
    } catch (cause) {
      if (mountedRef.current) {
        setRemoteMessage(cause instanceof Error ? cause.message : 'Could not sync from GitHub.');
      }
    } finally {
      remoteSyncingRef.current = false;
      if (mountedRef.current) setRemoteSyncing(false);
    }
  }, [applyConfig]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadConfig();
      const [lastCollectRaw, localCounts, latestRaw] = await Promise.all([
        storage.get(SETTINGS_KEYS.lastCollectAt),
        historyCounts(),
        latestChannelSnapshot(),
      ]);
      if (cancelled) return;

      const lastCollect = lastCollectRaw ? Number(lastCollectRaw) : Number.NaN;
      setLastUpdated(
        Number.isFinite(lastCollect) && lastCollect > 0 ? lastCollect : latestRaw?.ts ?? null,
      );
      setCounts(localCounts);
      setReady(true);
      if (next.apiKey && (next.channelId || next.channelInput)) {
        void runCollect(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig, runCollect]);

  useEffect(() => {
    const onChange = () => {
      const next = document.visibilityState === 'visible';
      setVisible(next);
      if (next) void runCollect(true);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [runCollect]);

  useEffect(() => {
    const onSettings = () => {
      void (async () => {
        await loadConfig();
        void runCollect(true);
      })();
    };
    window.addEventListener(HISTORY_SETTINGS_EVENT, onSettings);
    return () => window.removeEventListener(HISTORY_SETTINGS_EVENT, onSettings);
  }, [loadConfig, runCollect]);

  const setIntervalMin = useCallback((value: CollectInterval) => {
    applyConfig({ ...configRef.current, intervalMin: value });
    lastAttemptRef.current = 0;
    void saveInterval(value).catch(() => undefined);
  }, [applyConfig]);

  const setRemoteRepo = useCallback((value: string | null): boolean => {
    const trimmed = value?.trim() ?? '';

    if (trimmed === '') {
      applyConfig({ ...configRef.current, remoteRepo: null });
      void saveRemoteRepo(null).catch(() => undefined);
      setRemoteMessage('Remote sync is off.');
      return true;
    }

    const normalized = normalizeRepo(trimmed);
    if (!normalized) return false;

    applyConfig({ ...configRef.current, remoteRepo: normalized });
    lastRemoteRef.current = 0;
    void saveRemoteRepo(normalized).catch(() => undefined);
    void pullRemote(true);
    return true;
  }, [applyConfig, pullRemote]);

  const collectNow = useCallback(() => {
    void runCollect(true);
  }, [runCollect]);

  const syncRemote = useCallback(() => {
    void pullRemote(true);
  }, [pullRemote]);

  const exportBackup = useCallback(
    () => exportStoredBackup(configRef.current.channelId),
    [],
  );

  const importBackup = useCallback(async (file: File): Promise<string> => {
    const outcome = await importStoredBackup(file, configRef.current.channelId);
    if (outcome.channelId && !configRef.current.channelId) {
      applyConfig({ ...configRef.current, channelId: outcome.channelId });
    }
    setCounts(await historyCounts());
    return `Imported ${outcome.channelPoints} channel and ${outcome.videoPoints} video points.`;
  }, [applyConfig]);

  return {
    config,
    ready,
    visible,
    collecting,
    lastUpdated,
    error,
    counts,
    remoteSyncing,
    remoteMessage,
    configRef,
    visibleRef,
    lastAttemptRef,
    lastRemoteRef,
    runCollect,
    pullRemote,
    setIntervalMin,
    setRemoteRepo,
    collectNow,
    syncRemote,
    exportBackup,
    importBackup,
  };
}
