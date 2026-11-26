import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { CollectInterval } from '../lib/history/config';
import { useHistoryEngine } from './history/useHistoryEngine';
import { useHistoryTimers } from './history/useHistoryTimers';

export type HistoryContextValue = {
  configured: boolean;
  visible: boolean;
  collecting: boolean;
  lastUpdated: number | null;
  error: string | null;
  counts: { channel: number; videos: number };
  intervalMin: CollectInterval;
  remoteRepo: string | null;
  remoteSyncing: boolean;
  remoteMessage: string | null;
  setIntervalMin: (value: CollectInterval) => void;
  /** Returns false when the text is not owner/repo. */
  setRemoteRepo: (value: string | null) => boolean;
  collectNow: () => void;
  syncRemote: () => void;
  exportBackup: () => Promise<string>;
  importBackup: (file: File) => Promise<string>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const engine = useHistoryEngine();

  useHistoryTimers({
    ready: engine.ready,
    configRef: engine.configRef,
    visibleRef: engine.visibleRef,
    lastAttemptRef: engine.lastAttemptRef,
    lastRemoteRef: engine.lastRemoteRef,
    runCollect: engine.runCollect,
    pullRemote: engine.pullRemote,
  });

  const value = useMemo<HistoryContextValue>(
    () => ({
      configured: Boolean(
        engine.config.apiKey && (engine.config.channelId || engine.config.channelInput),
      ),
      visible: engine.visible,
      collecting: engine.collecting,
      lastUpdated: engine.lastUpdated,
      error: engine.error,
      counts: engine.counts,
      intervalMin: engine.config.intervalMin,
      remoteRepo: engine.config.remoteRepo,
      remoteSyncing: engine.remoteSyncing,
      remoteMessage: engine.remoteMessage,
      setIntervalMin: engine.setIntervalMin,
      setRemoteRepo: engine.setRemoteRepo,
      collectNow: engine.collectNow,
      syncRemote: engine.syncRemote,
      exportBackup: engine.exportBackup,
      importBackup: engine.importBackup,
    }),
    [engine],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  const context = useContext(HistoryContext);
  if (!context) throw new Error('useHistory must be used inside HistoryProvider.');
  return context;
}
