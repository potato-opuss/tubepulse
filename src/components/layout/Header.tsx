import { Activity, Moon, Sun } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Segmented, type SegmentedOption } from '../ui';
import type { Currency } from '../../lib/settings';
import { LiveIndicator } from './LiveIndicator';

const CURRENCY_OPTIONS: ReadonlyArray<SegmentedOption<Currency>> = [
  { value: 'USD', label: 'USD' },
  { value: 'TRY', label: 'TRY' },
];

export function Header() {
  const { theme, setTheme, currency, setCurrency } = useSettings();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="safe-top safe-x sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="shrink-0 text-sm font-semibold tracking-tight text-ink">TubePulse</span>
          <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
          <LiveIndicator />
        </div>

        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            label="Display currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
          <button
            type="button"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} theme`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-card text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
