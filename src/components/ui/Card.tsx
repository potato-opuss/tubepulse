import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  children: ReactNode;
};

export function Card({ padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-card shadow-soft',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
