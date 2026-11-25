/**
 * Maps a numeric series to an SVG polyline `points` string.
 * Pure so the chart component does no math of its own.
 */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
  padding = 2,
): string {
  if (values.length < 2 || width <= 0 || height <= 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = Math.max(width - padding * 2, 0);
  const innerHeight = Math.max(height - padding * 2, 0);

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * innerWidth;
      const y = padding + innerHeight - ((value - min) / span) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
