import { clamp } from '../utils/math.js';

export interface LayoutState {
  paneWidth: number;
  paneCollapsed: boolean;
}

const STORAGE_KEY = 'frameer3d.v1.layout';

export function defaultLayoutState(): LayoutState {
  return {
    paneWidth: window.innerWidth / 3,
    paneCollapsed: false,
  };
}

export function loadLayoutState(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultLayoutState();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultLayoutState();
    const record = parsed as Record<string, unknown>;
    const paneWidth =
      typeof record['paneWidth'] === 'number'
        ? clamp(record['paneWidth'], 200, window.innerWidth * 0.5)
        : defaultLayoutState().paneWidth;
    const paneCollapsed =
      typeof record['paneCollapsed'] === 'boolean' ? record['paneCollapsed'] : false;
    return { paneWidth, paneCollapsed };
  } catch {
    console.warn('frameer3d: Failed to load layout state from localStorage');
    return defaultLayoutState();
  }
}

export function saveLayoutState(state: LayoutState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('frameer3d: Failed to save layout state to localStorage', err);
  }
}
