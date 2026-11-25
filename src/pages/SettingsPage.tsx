import { Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Banner,
  Button,
  Card,
  Input,
  Segmented,
  type SegmentedOption,
} from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import type { Currency, Theme } from '../lib/settings';
import { parseRate } from '../lib/settings';
import { SETTINGS_KEYS, storage } from '../lib/storage';

const THEME_OPTIONS: ReadonlyArray<SegmentedOption<Theme>> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const CURRENCY_OPTIONS: ReadonlyArray<SegmentedOption<Currency>> = [
  { value: 'USD', label: 'USD' },
  { value: 'TRY', label: 'TRY' },
];

export function SettingsPage() {
  const { theme, setTheme, currency, setCurrency, usdTryRate, setUsdTryRate } = useSettings();

  const [rateDraft, setRateDraft] = useState(usdTryRate === null ? '' : String(usdTryRate));
  const [rateError, setRateError] = useState('');
  const [rateStatus, setRateStatus] = useState('');

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    void storage.get(SETTINGS_KEYS.youtubeApiKey).then((value) => {
      if (!cancelled && value) setApiKey(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function saveRate() {
    setRateError('');
    setRateStatus('');
    const trimmed = rateDraft.trim();

    if (trimmed === '') {
      setUsdTryRate(null);
      setRateStatus('Rate cleared. TRY figures will ask for a rate until you add one.');
      return;
    }

    const parsed = parseRate(trimmed);
    if (parsed === null) {
      setRateError('Enter a positive number, for example 34.50.');
      return;
    }

    setUsdTryRate(parsed);
    setRateStatus('Rate saved on this device.');
  }

  async function saveKey() {
    setKeyError('');
    setKeyStatus('');
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyError('Paste your API key first.');
      return;
    }

    try {
      await storage.set(SETTINGS_KEYS.youtubeApiKey, trimmed);
      setApiKey(trimmed);
      setKeyStatus('Saved on this device only. It is never logged or committed.');
    } catch {
      setKeyError('Could not save the key on this device.');
    }
  }

  async function clearKey() {
    setKeyError('');
    setKeyStatus('');
    await storage.remove(SETTINGS_KEYS.youtubeApiKey);
    setApiKey('');
    setKeyStatus('API key removed from this device.');
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Settings" description="Stored on this device only." />

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Appearance</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">Theme</span>
          <Segmented label="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">Display currency</span>
          <Segmented
            label="Display currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">USD → TRY rate</h2>
        <p className="text-xs text-muted">
          Money is calculated in USD. TRY is a display-only conversion using this stored rate —
          there is no live rate feed.
        </p>
        <Input
          label="Rate"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="e.g. 34.50"
          value={rateDraft}
          onChange={(event) => setRateDraft(event.target.value)}
          {...(rateError ? { error: rateError } : {})}
          hint="1 USD equals this many TRY."
        />
        <Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={saveRate}>
          Save rate
        </Button>
        <p className="text-xs text-muted" aria-live="polite">
          {rateStatus}
        </p>
      </Card>

      <Banner tone="warning" title="Analytics API is not connected yet">
        Google sign-in is intentionally not implemented in this build. Revenue stays “Not enough
        data yet” until it is.
      </Banner>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">YouTube API key</h2>
        <p className="text-xs text-muted">
          Stored in Android Preferences on this device. Restrict it in Google Cloud Console to the
          YouTube Data API v3 only. Do not use HTTP-referrer restrictions — Android apps cannot send
          a referrer.
        </p>
        <Input
          label="API key"
          type={showKey ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          placeholder="AIza…"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          {...(keyError ? { error: keyError } : {})}
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={() => void saveKey()}>
            Save key
          </Button>
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => void clearKey()}
          >
            Remove
          </Button>
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          {keyStatus}
        </p>
      </Card>
    </section>
  );
}
