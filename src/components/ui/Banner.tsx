import { AlertTriangle, FlaskConical, Info, OctagonAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BannerTone = 'demo' | 'warning' | 'info' | 'error';

type BannerProps = {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
  className?: string;
};

const tones: Record<BannerTone, { wrap: string; icon: ReactNode }> = {
  demo: {
    wrap: 'border-warning/40 bg-warning/10 text-warning',
    icon: <FlaskConical className="h-4 w-4" aria-hidden="true" />,
  },
  warning: {
    wrap: 'border-warning/30 bg-warning/10 text-warning',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
  info: {
    wrap: 'border-primary/30 bg-primary/10 text-primary',
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
  },
  error: {
    wrap: 'border-negative/30 bg-negative/10 text-negative',
    icon: <OctagonAlert className="h-4 w-4" aria-hidden="true" />,
  },
};

export function Banner({ tone = 'info', title, children, className }: BannerProps) {
  const { wrap, icon } = tones[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm', wrap, className)}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-current/90 [&_p]:leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
