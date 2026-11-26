/** Pure parsing helpers for channel input and ISO-8601 durations. */

export type ChannelRef =
  | { kind: 'id'; value: string }
  | { kind: 'handle'; value: string };

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;
const HANDLE_RE = /^[\w.-]{3,30}$/;
const ISO_DURATION_RE =
  /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

function isHandle(value: string): boolean {
  return HANDLE_RE.test(value);
}

function fromPath(pathname: string): ChannelRef | null {
  const segments = pathname.split('/').filter(Boolean);

  const channelIndex = segments.indexOf('channel');
  if (channelIndex >= 0) {
    const id = segments[channelIndex + 1];
    if (id && CHANNEL_ID_RE.test(id)) return { kind: 'id', value: id };
  }

  for (const segment of segments) {
    if (!segment.startsWith('@')) continue;
    const handle = segment.slice(1);
    if (isHandle(handle)) return { kind: 'handle', value: handle };
  }

  return null;
}

/**
 * Accepts @handle, a channel URL (/@handle, /channel/UC…), or a raw UC… id.
 * Bare handles without "@" are also accepted so the field is forgiving.
 */
export function parseChannelInput(raw: string): ChannelRef | null {
  const input = raw.trim();
  if (!input) return null;

  if (CHANNEL_ID_RE.test(input)) return { kind: 'id', value: input };

  if (input.startsWith('@')) {
    const handle = input.slice(1);
    return isHandle(handle) ? { kind: 'handle', value: handle } : null;
  }

  const looksLikeUrl = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(input);
  if (looksLikeUrl) {
    const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    try {
      return fromPath(new URL(withProtocol).pathname);
    } catch {
      return null;
    }
  }

  return isHandle(input) ? { kind: 'handle', value: input } : null;
}

/** Parses an ISO-8601 duration (PT1H2M3S) into whole seconds. */
export function parseIsoDuration(value: string): number | null {
  const match = ISO_DURATION_RE.exec(value.trim());
  if (!match) return null;

  const [, weeks, days, hours, minutes, seconds] = match;
  if (weeks === undefined && days === undefined && hours === undefined && minutes === undefined && seconds === undefined) {
    return null;
  }

  const total =
    Number(weeks ?? 0) * 604_800 +
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);

  return Number.isFinite(total) ? Math.floor(total) : null;
}
