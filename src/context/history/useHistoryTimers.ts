import { useEffect } from 'react';
import {
  intervalToMs,
  REMOTE_SYNC_INTERVAL_MS,
} from '../../lib/history/config';
import type { HistoryConfig } from '../../lib/history/engine';
import type { MutableRef } from './useHistoryEngine';

type Options = {
  ready: boolean;
  configRef: MutableRef<HistoryConfig>;
  visibleRef: MutableRef<boolean>;
  lastAttemptRef: MutableRef<number>;
  lastRemoteRef: MutableRef<number>;
  runCollect: (force?: boolean) => Promise<void>;
  pullRemote: (manual: boolean) => Promise<void>;
};

/**
 * One 60s tick drives both loops. The user interval only decides when a
 * collection is due; remote snapshots refresh every 15 minutes.
 */
export function useHistoryTimers({
  ready,
  configRef,
  visibleRef,
  lastAttemptRef,
  lastRemoteRef,
  runCollect,
  pullRemote,
}: Options): void {
  useEffect(() => {
    if (!ready) return;

    const tick = () => {
      const config = configRef.current;
      if (!config.apiKey || (!config.channelId && !config.channelInput)) return;
      if (!visibleRef.current) return;
      if (Date.now() - lastAttemptRef.current < intervalToMs(config.intervalMin)) return;
      void runCollect();
    };

    const id = window.setInterval(tick, 60_000);
    tick();
    return () => window.clearInterval(id);
  }, [ready, configRef, visibleRef, lastAttemptRef, runCollect]);

  useEffect(() => {
    if (!ready) return;

    const tick = () => {
      if (!visibleRef.current || !configRef.current.remoteRepo) return;
      if (Date.now() - lastRemoteRef.current < REMOTE_SYNC_INTERVAL_MS) return;
      void pullRemote(false);
    };

    const id = window.setInterval(tick, 60_000);
    tick();
    return () => window.clearInterval(id);
  }, [ready, configRef, visibleRef, lastRemoteRef, pullRemote]);
}
