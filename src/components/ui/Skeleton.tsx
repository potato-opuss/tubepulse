import { cn } from '../../lib/cn';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-pulse rounded-lg bg-line/60', className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-soft">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
