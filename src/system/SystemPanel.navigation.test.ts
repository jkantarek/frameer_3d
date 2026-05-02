import { describe, expect, it } from 'vitest';
import type { ProjectRegistry } from '../project/ProjectTypes.js';
import type { SystemPanelCallbacks, SystemPanelApi } from './SystemPanel.js';
import { createSystemPanel } from './SystemPanel.js';

const BASE_SETTINGS = { theme: 'dark' as const, followSystem: false };
const ID_A = 'proj-a';
const ID_B = 'proj-b';
const NAME_A = 'Alpha';
const NAME_B = 'Beta';
const SUMMARY_A = {
  id: ID_A,
  name: NAME_A,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const SUMMARY_B = {
  id: ID_B,
  name: NAME_B,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const TWO_PROJECTS: ProjectRegistry = { projects: [SUMMARY_A, SUMMARY_B] };

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makePanel(
  container: HTMLElement,
  registry: ProjectRegistry,
  activeId: string,
  callbacks?: SystemPanelCallbacks,
): SystemPanelApi {
  return createSystemPanel(BASE_SETTINGS, registry, activeId, callbacks, container);
}

describe('SystemPanel navigation buttons', () => {
  it('renders one button per project in the registry', () => {
    const c = makeContainer();
    const panel = makePanel(c, TWO_PROJECTS, ID_A);
    const btns = Array.from(c.querySelectorAll('button'));
    const projBtns = btns.filter(
      (b) => b.textContent.trim() === NAME_A || b.textContent.trim() === NAME_B,
    );
    expect(projBtns).toHaveLength(2);
    panel.dispose();
    c.remove();
  });

  it('clicking a project button calls onSelectProject with the correct id', () => {
    let selected: string | undefined;
    const c = makeContainer();
    const panel = makePanel(c, TWO_PROJECTS, ID_A, {
      onSelectProject: (id) => {
        selected = id;
      },
    });
    const btns = Array.from(c.querySelectorAll('button'));
    btns.find((b) => b.textContent.trim() === NAME_B)?.click();
    expect(selected).toBe(ID_B);
    panel.dispose();
    c.remove();
  });

  it('active project button has aria-current="true"', () => {
    const c = makeContainer();
    const panel = makePanel(c, TWO_PROJECTS, ID_A);
    const current = c.querySelector<HTMLButtonElement>('button[aria-current="true"]');
    expect(current?.textContent.trim()).toBe(NAME_A);
    panel.dispose();
    c.remove();
  });
});
