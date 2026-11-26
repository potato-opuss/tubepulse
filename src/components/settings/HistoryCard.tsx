import { Database, Download, Github, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from '../../context/HistoryContext';
import type { CollectInterval } from '../../lib/history/config';
import { formatNumber } from '../../lib/format';
import {
  Banner,
  Button,
  Card,
  Input,
  Segmented,
  type SegmentedOption,
} from '../ui';

type IntervalValue = '1' | '5' | '15';

const INTERVAL_OPTIONS: ReadonlyArray<SegmentedOption<IntervalValue>> = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
];

function toInterval(value: IntervalValue): CollectInterval {
  if (value === '5') return 5;
  if (value === '15') return 15;
  return 1;
}

function fromInterval(value: CollectInterval): IntervalValue {
  return value === 5 ? '5' : value === 15 ? '15' : '1';
}

export function HistoryCard() {
  const {
    counts,
    lastUpdated,
    error,
    intervalMin,
    remoteRepo,
    remoteSyncing,
    remoteMessage,
    setIntervalMin,
    setRemoteRepo,
    syncRemote,
    exportBackup,
    importBackup,
  } = useHistory();

  const [repoDraft, setRepoDraft] = useState(remoteRepo ?? '');
  const [repoError, setRepoError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRepoDraft(remoteRepo ?? '');
  }, [remoteRepo]);

  function saveRepo() {
    setRepoError('');
    setStatus('');
    if (setRemoteRepo(repoDraft)) {
      setStatus(repoDraft.trim() ? 'Remote repo saved. Syncing from GitHub…' : 'Remote sync off.');
    } else {
      setRepoError('Use owner/repo, for example potato-opuss/tubepulse.');
    }
  }

  async function runExport() {
    setBusy(true);
    setStatus('');
    try {
      setStatus(await exportBackup());
    } catch {
      setStatus('Could not export the backup.');
    } finally {
      setBusy(false);
    }
  }

  async function runImport(file: File) {
    setBusy(true);
    setStatus('');
    try {
      setStatus(await importBackup(file));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Could not import that file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const lastUpdatedText =
    lastUpdated === null ? 'not yet' : new Date(lastUpdated).toLocaleString();

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Database className="h-4 w-4 text-primary" aria-hidden="true" />
          History &amp; live collection
        </h2>
        <p className="mt-1 text-xs text-muted">
          Public counters only. Snapshots live in this device&apos;s IndexedDB; revenue is never
          collected.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm text-ink">Snapshot interval</span>
          <p className="text-[11px] text-muted">Pauses while the app is hidden.</p>
        </div>
        <Segmented
          label="Snapshot interval"
          options={INTERVAL_OPTIONS}
          value={fromInterval(intervalMin)}
          onChange={(value) => setIntervalMin(toInterval(value))}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg/40 p-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">Channel points</p>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {formatNumber(counts.channel)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">Video points</p>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {formatNumber(counts.videos)}
          </p>
        </div>
        <p className="col-span-2 text-[11px] text-muted">
          Last update: <span className="tabular-nums text-ink">{lastUpdatedText}</span>
        </p>
      </div>

      {error ? (
        <Banner tone="error" title="Collector error">
          {error}
        </Banner>
      ) : null}

      <div className="space-y-2 rounded-xl border border-line bg-bg/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Github className="h-3.5 w-3.5" aria-hidden="true" />
          GitHub background collector
        </p>
        <Input
          label="Data repo"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="owner/repo"
          value={repoDraft}
          onChange={(event) => setRepoDraft(event.target.value)}
          {...(repoError ? { error: repoError } : {})}
          hint="Read from the data branch (snapshots.json) on raw.githubusercontent.com."
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={saveRepo}>
            Save repo
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={
              remoteSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={syncRemote}
            disabled={remoteSyncing || !remoteRepo}
          >
            Sync now
          </Button>
        </div>
        {remoteMessage ? (
          <p className="text-[11px] leading-relaxed text-muted" aria-live="polite">
            {remoteMessage}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink">Backup</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void runExport()}
            disabled={busy}
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import history backup"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void runImport(file);
            }}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-muted" aria-live="polite">
          {status}
        </p>
      </div>
    </Card>
  );
}
