import { describe, expect, it, vi } from 'vitest';
import type { ThemeValue } from './SystemSettings.js';
import { createSystemPanel } from './SystemPanel.js';

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('createSystemPanel', () => {
  it('returns an object with dispose()', () => {
    // No container passed → covers the `_container ?? document.body` fallback branch
    const panel = createSystemPanel({ theme: 'dark', followSystem: false });
    expect(typeof panel.dispose).toBe('function');
    panel.dispose();
    localStorage.clear();
  });

  it('dispose() does not throw', () => {
    const c = makeContainer();
    const panel = createSystemPanel({ theme: 'dark', followSystem: false }, undefined, c);
    expect(() => {
      panel.dispose();
    }).not.toThrow();
    c.remove();
    localStorage.clear();
  });

  it('simulating a theme select change fires onThemeChange', () => {
    let received: ThemeValue | undefined;
    const c = makeContainer();
    const panel = createSystemPanel(
      { theme: 'dark', followSystem: false },
      (t) => {
        received = t;
      },
      c,
    );
    const select = c.querySelector<HTMLSelectElement>('select') ?? null;
    if (select !== null) {
      select.selectedIndex = 1; // index 1 = 'Light' option
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(received).toBe('light');
    panel.dispose();
    c.remove();
    localStorage.clear();
  });

  it('followSystem checkbox change calls applyAndNotify', () => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('dark'),
      addEventListener: (): void => {
        return;
      },
      removeEventListener: (): void => {
        return;
      },
    }));
    const c = makeContainer();
    const panel = createSystemPanel({ theme: 'dark', followSystem: false }, undefined, c);
    const checkbox = c.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null;
    expect(checkbox).not.toBeNull();
    if (checkbox !== null) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const stored = localStorage.getItem('frameer3d.v1.settings');
    expect(stored).not.toBeNull();
    panel.dispose();
    c.remove();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
});
