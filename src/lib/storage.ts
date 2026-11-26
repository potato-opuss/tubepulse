import { Preferences } from '@capacitor/preferences';

/**
 * Single async storage API for the whole app.
 *
 * Backed by Capacitor Preferences, which is native SharedPreferences on
 * Android and localStorage on the web build. Keep sensitive values (API keys)
 * here only — never commit or log them.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch {
      // Nothing to remove.
    }
  },
};

export const SETTINGS_KEYS = {
  theme: 'tp.theme',
  currency: 'tp.currency',
  usdTryRate: 'tp.rate.usdTry',
  youtubeApiKey: 'tp.youtube.apiKey',
  youtubeChannel: 'tp.youtube.channel',
  youtubeChannelId: 'tp.youtube.channelId',
  youtubeChannelTitle: 'tp.youtube.channelTitle',
  collectInterval: 'tp.history.interval',
  remoteRepo: 'tp.history.remoteRepo',
  lastCollectAt: 'tp.history.lastCollectAt',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
