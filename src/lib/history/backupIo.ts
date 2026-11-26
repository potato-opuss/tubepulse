import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { parseBackupText, serializeBackup, type HistoryBackup } from './backup';

function backupName(now: number): string {
  return `tubepulse-history-${new Date(now).toISOString().slice(0, 10)}.json`;
}

/**
 * Native: write to the cache folder and open the Android share sheet.
 * Web: download a normal JSON file. Never uploads anything.
 */
export async function exportHistoryFile(
  backup: HistoryBackup,
  now: number = Date.now(),
): Promise<string> {
  const name = backupName(now);
  const data = serializeBackup(backup);

  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: 'TubePulse history backup',
      url: result.uri,
      dialogTitle: 'Save or share your history backup',
    });
    return `Backup ready: ${name}`;
  }

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `Downloaded ${name}`;
}

export async function importHistoryFile(file: File): Promise<HistoryBackup> {
  const text = await file.text();
  const backup = parseBackupText(text);
  if (!backup) {
    throw new Error('That file is not a valid TubePulse history backup.');
  }
  return backup;
}
