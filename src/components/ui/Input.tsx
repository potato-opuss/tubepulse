import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  rightSlot?: ReactNode;
}

export function Input({ label, hint, error, rightSlot, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-xl border bg-card px-3 text-sm text-ink placeholder:text-muted/70',
            'focus:outline-none focus:ring-2 focus:ring-primary/60',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-negative/60' : 'border-line',
            rightSlot ? 'pr-11' : null,
            className,
          )}
          {...props}
        />
        {rightSlot ? (
          <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
