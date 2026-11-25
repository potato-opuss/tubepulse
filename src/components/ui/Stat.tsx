import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { formatDelta } from '../../lib/money';
import { sparklinePoints } from '../../lib/sparkline';
import { Badge } from './Badge';
import { InfoPopover } from './InfoPopover';

type StatProps = {
  label: string;
  /** Pre-formatted display value — formatting happens in lib, not here. */
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  badge?: 'estimate' | 'real';
  info?: ReactNode;
  sparkline?: readonly number[];
  className?: string;
};

export function Stat({
  label,
  value,
  delta,
  deltaLabel = 'vs previous period',
  badge,
  info,
  sparkline,
  className,
}: StatProps) {
  const points = sparkline ? sparklinePoints(sparkline, 96, 32) : '';
  const isUp = typeof delta === 'number' && delta >= 0;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn('rounded-2xl border border-line bg-card p-4 shadow-soft', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
          {info ? <InfoPopover>{info}</InfoPopover> : null}
        </div>
        {badge ? <Badge tone={badge}>{badge === 'estimate' ? 'Estimate' : 'Real'}</Badge> : null}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</div>
          {typeof delta === 'number' ? (
            <div className="mt-1.5 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                  isUp ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative',
                )}
              >
                <DeltaIcon className="h-3 w-3" aria-hidden="true" />
                {formatDelta(delta)}
              </span>
              <span className="text-muted">{deltaLabel}</span>
            </div>
          ) : null}
        </div>

        {points ? (
          <svg
            viewBox="0 0 96 32"
            className="h-8 w-24 shrink-0"
            fill="none"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <polyline
              points={points}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isUp ? 'text-positive' : 'text-negative'}
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
