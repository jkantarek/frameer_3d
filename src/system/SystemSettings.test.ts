import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings, applyTheme, detectSystemTheme } from './SystemSettings.js';

describe('loadSettings', () => {
  it('returns fallback when no key in localStorage', () => {
    localStorage.clear();
    expect(loadSettings()).toEqual({ theme: 'dark', followSystem: false });
  });

  it('returns fallback on corrupt JSON and warns', () => {
    localStorage.setItem('frameer3d.v1.settings', 'NOT_JSON');
    expect(loadSettings()).toEqual({ theme: 'dark', followSystem: false });
    localStorage.clear();
  });

  it('returns fallback when JSON parses to non-object (covers isSystemSettingsData false path)', () => {
    localStorage.setItem('frameer3d.v1.settings', '"just-a-string"');
    expect(loadSettings()).toEqual({ theme: 'dark', followSystem: false });
    localStorage.clear();
  });
});

describe('saveSettings + loadSettings', () => {
  it('round-trips light theme', () => {
    const data = { theme: 'light', followSystem: true } as const;
    saveSettings(data);
    expect(loadSettings()).toEqual(data);
    localStorage.clear();
  });

  it('round-trips dark theme', () => {
    const data = { theme: 'dark', followSystem: false } as const;
    saveSettings(data);
    expect(loadSettings()).toEqual(data);
    localStorage.clear();
  });

  it('swallows QuotaExceededError and does not throw', () => {
    const throwingStorage: Storage = {
      setItem(): never {
        throw new DOMException('QuotaExceededError');
      },
      getItem: () => null,
      removeItem: (): void => {
        return;
      },
      clear: (): void => {
        return;
      },
      length: 0,
      key: () => null,
    };
    expect(() => {
      saveSettings({ theme: 'dark', followSystem: false }, throwingStorage);
    }).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('sets document.documentElement.dataset theme to light', () => {
    applyTheme({ theme: 'light', followSystem: false });
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('sets document.documentElement.dataset theme to dark', () => {
    applyTheme({ theme: 'dark', followSystem: false });
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});

describe('detectSystemTheme', () => {
  it('returns dark when matchMedia matches', () => {
    expect(detectSystemTheme(() => ({ matches: true }))).toBe('dark');
  });

  it('returns light when matchMedia does not match', () => {
    expect(detectSystemTheme(() => ({ matches: false }))).toBe('light');
  });
});
