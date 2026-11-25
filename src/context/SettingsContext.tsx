import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_CURRENCY,
  DEFAULT_THEME,
  isCurrency,
  isTheme,
  parseRate,
  type Currency,
  type Theme,
} from '../lib/settings';
import { SETTINGS_KEYS, storage } from '../lib/storage';

type SettingsContextValue = {
  theme: Theme;
  currency: Currency;
  usdTryRate: number | null;
  ready: boolean;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: Currency) => void;
  setUsdTryRate: (rate: number | null) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const THEME_COLORS: Record<Theme, string> = {
  dark: '#020617',
  light: '#f8fafc',
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);

  if (Capacitor.isNativePlatform()) {
    void StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(
      () => undefined,
    );
    void StatusBar.setBackgroundColor({ color: THEME_COLORS[theme] }).catch(() => undefined);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [usdTryRate, setRateState] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [storedTheme, storedCurrency, storedRate] = await Promise.all([
        storage.get(SETTINGS_KEYS.theme),
        storage.get(SETTINGS_KEYS.currency),
        storage.get(SETTINGS_KEYS.usdTryRate),
      ]);
      if (cancelled) return;

      if (isTheme(storedTheme)) setThemeState(storedTheme);
      if (isCurrency(storedCurrency)) setCurrencyState(storedCurrency);
      setRateState(parseRate(storedRate));
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    void storage.set(SETTINGS_KEYS.theme, next).catch(() => undefined);
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    void storage.set(SETTINGS_KEYS.currency, next).catch(() => undefined);
  }, []);

  const setUsdTryRate = useCallback((next: number | null) => {
    setRateState(next);
    if (next === null) {
      void storage.remove(SETTINGS_KEYS.usdTryRate).catch(() => undefined);
    } else {
      void storage.set(SETTINGS_KEYS.usdTryRate, String(next)).catch(() => undefined);
    }
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      theme,
      currency,
      usdTryRate,
      ready,
      setTheme,
      setCurrency,
      setUsdTryRate,
    }),
    [theme, currency, usdTryRate, ready, setTheme, setCurrency, setUsdTryRate],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider.');
  return context;
}
