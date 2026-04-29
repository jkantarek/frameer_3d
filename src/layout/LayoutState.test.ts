import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultLayoutState, loadLayoutState, saveLayoutState } from './LayoutState.js';

const STORAGE_KEY = 'frameer3d.v1.layout';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('defaultLayoutState', () => {
  it('returns paneWidth as window.innerWidth / 3', () => {
    const state = defaultLayoutState();
    expect(state.paneWidth).toBe(window.innerWidth / 3);
  });

  it('returns paneCollapsed as false', () => {
    expect(defaultLayoutState().paneCollapsed).toBe(false);
  });
});

describe('loadLayoutState', () => {
  it('returns defaults when localStorage is empty', () => {
    const state = loadLayoutState();
    expect(state).toEqual(defaultLayoutState());
  });

  it('round-trips valid stored values', () => {
    const saved = { paneWidth: 300, paneCollapsed: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const state = loadLayoutState();
    expect(state.paneWidth).toBe(300);
    expect(state.paneCollapsed).toBe(true);
  });

  it('clamps paneWidth below minimum 200 to 200', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ paneWidth: 100, paneCollapsed: false }));
    expect(loadLayoutState().paneWidth).toBe(200);
  });

  it('clamps paneWidth above window.innerWidth * 0.5 to maximum', () => {
    const max = window.innerWidth * 0.5;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ paneWidth: max + 100, paneCollapsed: false }),
    );
    expect(loadLayoutState().paneWidth).toBe(max);
  });

  it('falls back paneCollapsed to false for non-boolean values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ paneWidth: 300, paneCollapsed: 'yes' }));
    expect(loadLayoutState().paneCollapsed).toBe(false);
  });

  it('falls back to defaults for invalid JSON and calls console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    localStorage.setItem(STORAGE_KEY, '{not valid json}');
    const state = loadLayoutState();
    expect(state).toEqual(defaultLayoutState());
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('falls back to defaults when stored JSON is null', () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    expect(loadLayoutState()).toEqual(defaultLayoutState());
  });

  it('falls back to defaults when stored JSON is a number', () => {
    localStorage.setItem(STORAGE_KEY, '42');
    expect(loadLayoutState()).toEqual(defaultLayoutState());
  });

  it('uses default paneWidth when stored value has missing paneWidth', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ paneCollapsed: true }));
    const state = loadLayoutState();
    expect(state.paneWidth).toBe(defaultLayoutState().paneWidth);
    expect(state.paneCollapsed).toBe(true);
  });

  it('uses default paneWidth when stored paneWidth is not a number', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ paneWidth: '300', paneCollapsed: false }));
    expect(loadLayoutState().paneWidth).toBe(defaultLayoutState().paneWidth);
  });
});

describe('saveLayoutState', () => {
  it('writes valid JSON to localStorage under the correct key', () => {
    const state = { paneWidth: 350, paneCollapsed: false };
    saveLayoutState(state);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '')).toEqual(state);
  });

  it('calls console.warn and does not throw when localStorage quota is exceeded', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => {
      saveLayoutState({ paneWidth: 300, paneCollapsed: false });
    }).not.toThrow();
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});
