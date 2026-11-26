export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

/** Subscriber counts at 1,000+ are rounded by YouTube, so they get an "≈". */
export function formatSubscribers(count: number | null, isRounded: boolean): string {
  if (count === null) return 'Hidden';
  return `${isRounded ? '≈' : ''}${formatCount(count)}`;
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Formats an ISO date for display. Returns null for unparseable input. */
export function formatDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
