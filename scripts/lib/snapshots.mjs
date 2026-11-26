/** Pure helpers for the collector's compact snapshots.json format. */

export const DAY = 86_400_000;
export const RETENTION_MS = 14 * DAY;

export function count(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isPoint(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isFinite(value.t) &&
    value.t > 0
  );
}

export function dedupe(points) {
  const byTs = new Map();
  for (const point of points) byTs.set(point.t, point);
  return [...byTs.values()].sort((a, b) => a.t - b.t);
}

/** Hourly for the last 14 days, then one point per UTC day. */
export function compact(points, now) {
  const cutoff = now - RETENTION_MS;
  const recent = [];
  const daily = new Map();

  for (const point of points) {
    if (point.t >= cutoff) {
      recent.push(point);
      continue;
    }
    const day = Math.floor(point.t / DAY);
    const current = daily.get(day);
    if (!current || point.t > current.t) daily.set(day, point);
  }

  return [...daily.values(), ...recent].sort((a, b) => a.t - b.t);
}

/** Validates the existing file before appending; never silently resets it. */
export function readExisting(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { channel: [], videos: {} };
  }
  if (json.channel !== undefined && !Array.isArray(json.channel)) {
    throw new Error('snapshots.json channel is not an array; refusing to overwrite it.');
  }
  if (
    json.videos !== undefined &&
    (typeof json.videos !== 'object' || json.videos === null || Array.isArray(json.videos))
  ) {
    throw new Error('snapshots.json videos is not an object; refusing to overwrite it.');
  }

  const channel = Array.isArray(json.channel) ? json.channel.filter(isPoint) : [];
  const videos = {};
  for (const [id, series] of Object.entries(json.videos ?? {})) {
    if (Array.isArray(series)) videos[id] = series.filter(isPoint);
  }
  return { channel, videos };
}
