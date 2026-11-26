/** Fired after the API key, channel or remote repo changes. */
export const HISTORY_SETTINGS_EVENT = 'tp:history-settings-changed';

export function notifyHistorySettingsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HISTORY_SETTINGS_EVENT));
  }
}
