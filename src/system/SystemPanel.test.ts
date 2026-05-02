import { describe, expect, it, vi } from 'vitest';
import type { ThemeValue } from './SystemSettings.js';
import type { ProjectRegistry } from '../project/ProjectTypes.js';
import type { SystemPanelCallbacks, SystemPanelApi } from './SystemPanel.js';
import { createSystemPanel } from './SystemPanel.js';

const REGISTRY: ProjectRegistry = { projects: [] };
const PROJECT_ID = 'test-proj';
const PROJECT_NAME = 'Test Project';
const SUMMARY = {
  id: PROJECT_ID,
  name: PROJECT_NAME,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}
function makePanel(
  container: HTMLElement,
  registry: ProjectRegistry = REGISTRY,
  callbacks?: SystemPanelCallbacks,
): SystemPanelApi {
  return createSystemPanel(
    { theme: 'dark', followSystem: false },
    registry,
    PROJECT_ID,
    callbacks,
    container,
  );
}
describe('createSystemPanel', () => {
  it('returns an object with dispose()', () => {
    // No container passed → covers the `_container ?? document.body` fallback branch
    const panel = createSystemPanel({ theme: 'dark', followSystem: false }, REGISTRY, PROJECT_ID);
    expect(typeof panel.dispose).toBe('function');
    panel.dispose();
    localStorage.clear();
  });
  it('dispose() does not throw', () => {
    const c = makeContainer();
    const panel = makePanel(c);
    expect(() => {
      panel.dispose();
    }).not.toThrow();
    c.remove();
    localStorage.clear();
  });
  it('simulating a theme select change fires onThemeChange', () => {
    let received: ThemeValue | undefined;
    const c = makeContainer();
    const panel = makePanel(c, REGISTRY, {
      onThemeChange: (t) => {
        received = t;
      },
    });
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
    const panel = makePanel(c);
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
  it('Projects folder is present in the panel', () => {
    const c = makeContainer();
    const panel = makePanel(c);
    const folderTitles = Array.from(c.querySelectorAll('.tp-fldv_t'));
    expect(folderTitles.some((t) => t.textContent.includes('Projects'))).toBe(true);
    panel.dispose();
    c.remove();
  });
  it('New Project button fires onNewProject callback', () => {
    let called = false;
    const c = makeContainer();
    const panel = makePanel(c, REGISTRY, {
      onNewProject: () => {
        called = true;
      },
    });
    const btns = Array.from(c.querySelectorAll('button'));
    btns.find((b) => b.textContent.trim() === 'New Project')?.click();
    expect(called).toBe(true);
    panel.dispose();
    c.remove();
  });
  it('active project name binding is visible', () => {
    const c = makeContainer();
    const panel = makePanel(c, { projects: [SUMMARY] });
    const input = c.querySelector<HTMLInputElement>('input.tp-txtv_i');
    expect(input?.value).toBe(PROJECT_NAME);
    panel.dispose();
    c.remove();
  });
  it('onRenameProject fires when project name changes', () => {
    let renamedId: string | undefined;
    let renamedName: string | undefined;
    const c = makeContainer();
    const panel = makePanel(
      c,
      { projects: [SUMMARY] },
      {
        onRenameProject: (id, name) => {
          renamedId = id;
          renamedName = name;
        },
      },
    );
    const input = c.querySelector<HTMLInputElement>('input.tp-txtv_i');
    if (input !== null) {
      input.value = 'Renamed Project';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(renamedId).toBe(PROJECT_ID);
    expect(renamedName).toBe('Renamed Project');
    panel.dispose();
    c.remove();
  });
});
