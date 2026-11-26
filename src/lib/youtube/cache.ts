/** Small JSON cache with a TTL, mirrored in memory and localStorage. */

const PREFIX = 'tp.youtube.cache.';
const MEMORY_LIMIT = 20;

type Entry<T> = { expires: number; value: T };

const memory = new Map<string, Entry<unknown>>();

function readMemory<T>(storageKey: string, now: number): Entry<T> | null {
  const entry = memory.get(storageKey) as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expires <= now) {
    memory.delete(storageKey);
    return null;
  }
  return entry;
}

function remember<T>(storageKey: string, entry: Entry<T>): void {
  memory.delete(storageKey);
  memory.set(storageKey, entry);
  while (memory.size > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

export function readCache<T>(key: string, now: number = Date.now()): T | null {
  const storageKey = `${PREFIX}${key}`;
  const cached = readMemory<T>(storageKey, now);
  if (cached) return cached.value;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Entry<T>>;
    if (typeof parsed.expires !== 'number' || parsed.expires <= now) {
      localStorage.removeItem(storageKey);
      return null;
    }
    remember(storageKey, { expires: parsed.expires, value: parsed.value as T });
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeCache<T>(
  key: string,
  value: T,
  ttlMs: number,
  now: number = Date.now(),
): void {
  const storageKey = `${PREFIX}${key}`;
  const entry: Entry<T> = { expires: now + ttlMs, value };
  remember(storageKey, entry);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage disabled: memory still helps this session.
  }
}

export function clearCache(): void {
  memory.clear();
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}
