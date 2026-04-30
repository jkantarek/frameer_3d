export type ThemeValue = 'dark' | 'light';

export interface SystemSettingsData {
  readonly theme: ThemeValue;
  readonly followSystem: boolean;
}

const SETTINGS_KEY = 'frameer3d.v1.settings';

const FALLBACK: SystemSettingsData = { theme: 'dark', followSystem: false };

function isSystemSettingsData(value: unknown): value is SystemSettingsData {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    (rec['theme'] === 'dark' || rec['theme'] === 'light') &&
    typeof rec['followSystem'] === 'boolean'
  );
}

export function loadSettings(storage: Storage = localStorage): SystemSettingsData {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return FALLBACK;
    const parsed: unknown = JSON.parse(raw);
    if (!isSystemSettingsData(parsed)) return FALLBACK;
    return parsed;
  } catch {
    console.warn('[SystemSettings] Failed to parse stored settings');
    return FALLBACK;
  }
}

export function saveSettings(data: SystemSettingsData, storage: Storage = localStorage): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    console.warn('[SystemSettings] Failed to save settings (quota exceeded?)');
  }
}

export function applyTheme(data: SystemSettingsData): void {
  document.documentElement.dataset['theme'] = data.theme;
}

type MqFn = (query: string) => { readonly matches: boolean };

export function detectSystemTheme(mq: MqFn = (q) => window.matchMedia(q)): ThemeValue {
  return mq('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
