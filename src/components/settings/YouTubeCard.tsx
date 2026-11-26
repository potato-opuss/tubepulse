import { Eye, EyeOff, Loader2, PlugZap, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatNumber } from '../../lib/format';
import { SETTINGS_KEYS, storage } from '../../lib/storage';
import { resolveChannel } from '../../lib/youtube/channel';
import { youtubeErrorMessage } from '../../lib/youtube/errors';
import { getQuotaUsage, type QuotaUsage } from '../../lib/youtube/quota';
import type { Channel } from '../../lib/youtube/types';
import { Banner, Button, Card, Input } from '../ui';
import { ChannelResultCard } from './ChannelResultCard';

export function YouTubeCard() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [result, setResult] = useState<Channel | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<QuotaUsage>(() => getQuotaUsage());

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      storage.get(SETTINGS_KEYS.youtubeApiKey),
      storage.get(SETTINGS_KEYS.youtubeChannel),
    ]).then(([storedKey, storedChannel]) => {
      if (cancelled) return;
      if (storedKey) setApiKey(storedKey);
      if (storedChannel) setChannelInput(storedChannel);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function testConnection() {
    const key = apiKey.trim();
    const target = channelInput.trim();
    setError('');
    setStatus('');
    setResult(null);

    if (!key) {
      setError('Paste your API key first.');
      return;
    }
    if (!target) {
      setError('Enter a channel handle, channel URL or channel ID.');
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        storage.set(SETTINGS_KEYS.youtubeApiKey, key),
        storage.set(SETTINGS_KEYS.youtubeChannel, target),
      ]);
      const channel = await resolveChannel(key, target);
      setResult(channel);
      setStatus(`Connected. “${channel.title}” came straight from the YouTube API.`);
    } catch (cause) {
      setError(youtubeErrorMessage(cause));
    } finally {
      setLoading(false);
      setQuota(getQuotaUsage());
    }
  }

  async function removeKey() {
    await storage.remove(SETTINGS_KEYS.youtubeApiKey);
    setApiKey('');
    setResult(null);
    setError('');
    setStatus('API key removed from this device.');
  }

  const percent = Math.min(100, (quota.used / quota.limit) * 100);

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">YouTube Data API</h2>
        <p className="mt-1 text-xs text-muted">
          The key is stored only on this device. It is never logged or committed.
        </p>
      </div>

      <Input
        label="API key"
        type={showKey ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        placeholder="AIza…"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        rightSlot={
          <button
            type="button"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            onClick={() => setShowKey((value) => !value)}
            className="rounded-lg p-2 text-muted hover:text-ink"
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        }
      />

      <Input
        label="Channel"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="@handle, channel URL, or UC… ID"
        value={channelInput}
        onChange={(event) => setChannelInput(event.target.value)}
        hint="For example @mkbhd, https://youtube.com/@mkbhd, or UC…"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          leftIcon={
            loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlugZap className="h-4 w-4" aria-hidden="true" />
            )
          }
          onClick={() => void testConnection()}
          disabled={loading}
        >
          {loading ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          size="sm"
          variant="danger"
          leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void removeKey()}
          disabled={loading || !apiKey}
        >
          Remove key
        </Button>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {status}
      </p>

      {error ? (
        <Banner tone="error" title="Connection failed">
          {error}
        </Banner>
      ) : null}

      {result ? <ChannelResultCard channel={result} /> : null}

      <div className="space-y-2 rounded-xl border border-line bg-bg/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-ink">Approximate quota today</span>
          <span className="text-xs tabular-nums text-muted">
            {formatNumber(quota.used)} / {formatNumber(quota.limit)} units
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Approximate YouTube quota used today"
          aria-valuemin={0}
          aria-valuemax={quota.limit}
          aria-valuenow={quota.used}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          Counts requests made on this device. Resets at midnight Pacific Time (Google&apos;s quota
          day).
        </p>
      </div>

      <div className="space-y-1.5 rounded-xl border border-line bg-bg/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <ShieldCheck className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
          Restrict your key in Google Cloud
        </p>
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
          <li>API restriction = YouTube Data API v3.</li>
          <li>
            Do not add an HTTP-referrer restriction: this is an Android app and cannot send a
            referrer.
          </li>
          <li>Keep the default 10,000 units/day; TubePulse never calls search.list (100 units).</li>
        </ul>
      </div>
    </Card>
  );
}
