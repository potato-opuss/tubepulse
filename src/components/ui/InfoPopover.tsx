import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type InfoPopoverProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

/** Small "How is this calculated?" popover used by every assumption-based figure. */
export function InfoPopover({ title = 'How is this calculated?', children, className }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={title}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full p-0.5 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={title}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-card p-3 text-xs leading-relaxed text-muted shadow-soft"
        >
          <p className="mb-1 font-semibold text-ink">{title}</p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
