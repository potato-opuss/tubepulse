import { useEffect, useState } from 'react';
import { useHistory } from '../../context/HistoryContext';
import { cn } from '../../lib/cn';
import { formatAge } from '../../lib/history/format';

const DOT_TONES = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
  muted: 'bg-muted',
} as const;

type Tone = keyof typeof DOT_TONES;

function toneFor(options: {
  configured: boolean;
  visible: boolean;
  error: string | null;
}): Tone {
  if (options.error) return 'negative';
  if (!options.configured) return 'muted';
  if (!options.visible) return 'warning';
  return 'positive';
}

export function LiveIndicator() {
  const { configured, visible, collecting, lastUpdated, error } = useHistory();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const tone = toneFor({ configured, visible, error });
  const label = error
    ? 'Error'
    : !configured
      ? 'Offline'
      : !visible
        ? 'Paused'
        : collecting
          ? 'Syncing'
          : 'Live';
  const age = lastUpdated === null ? 'waiting for first snapshot' : `updated ${formatAge(now - lastUpdated)}`;
  const shortAge = lastUpdated === null ? 'waiting' : formatAge(now - lastUpdated);

  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
      title={`${label} · ${age}`}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          DOT_TONES[tone],
          tone === 'positive' && 'animate-pulse',
        )}
      />
      <span className="truncate text-[11px] text-muted">
        <span className="font-medium text-ink">{label}</span>
        <span className="hidden sm:inline"> · {age}</span>
        <span className="sm:hidden"> · {shortAge}</span>
      </span>
    </div>
  );
}
