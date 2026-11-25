import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'estimate' | 'real' | 'demo' | 'neutral' | 'positive' | 'negative';

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

const tones: Record<BadgeTone, string> = {
  estimate: 'bg-warning/10 text-warning border-warning/25',
  real: 'bg-positive/10 text-positive border-positive/25',
  demo: 'bg-warning/15 text-warning border-warning/40',
  neutral: 'bg-line/40 text-muted border-line',
  positive: 'bg-positive/10 text-positive border-positive/25',
  negative: 'bg-negative/10 text-negative border-negative/25',
};

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
