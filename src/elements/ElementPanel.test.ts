import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { loadProject } from '../project/index.js';
import type { SceneElement } from './ElementTypes.js';
import type { ElementPanelApi } from './ElementPanel.js';
import { createBox, createSphere } from './PrimitiveFactory.js';
import { createElementPanel } from './ElementPanel.js';

const PROJECT_ID = 'test-project-id';

function seedProject(...elements: SceneElement[]): void {
  const now = new Date().toISOString();
  localStorage.setItem(
    `frameer3d.v1.project.${PROJECT_ID}`,
    JSON.stringify({ id: PROJECT_ID, name: 'Test', created_at: now, updated_at: now, elements }),
  );
}

class MockSceneRenderer implements SceneRenderer {
  render(): void {
    return;
  }
  setSize(): void {
    return;
  }
}

function makeSm(): SceneManager {
  return new SceneManager(new MockSceneRenderer(), new THREE.PerspectiveCamera());
}

function makeFolder(): FolderApi {
  return new Pane({ container: document.createElement('div') }).addFolder({ title: 'Element' });
}
function makePanel(sm: SceneManager = makeSm()): ElementPanelApi {
  return createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID);
}

function findElementItem(
  panel: ReturnType<typeof createElementPanel>,
  id: string,
): HTMLElement | null {
  return panel.getElement().querySelector<HTMLElement>(`[data-element-id="${id}"]`);
}

describe('createElementPanel', () => {
  it('returns an object with getElement() and dispose()', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder(), PROJECT_ID);
    expect(typeof panel.getElement).toBe('function');
    expect(typeof panel.dispose).toBe('function');
  });

  it('getElement() returns HTMLElement with id elements-panel', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder(), PROJECT_ID);
    const el = panel.getElement();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('elements-panel');
  });

  it('panel element is a descendant of container', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder(), PROJECT_ID);
    expect(div.contains(panel.getElement())).toBe(true);
  });

  it('dispose() removes panel element from container', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder(), PROJECT_ID);
    panel.dispose();
    expect(div.contains(panel.getElement())).toBe(false);
  });

  it('renders 2 list items for 2 pre-seeded elements', () => {
    seedProject(createBox(), createSphere());
    const panel = makePanel();
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(2);
    localStorage.clear();
  });

  it('each element item has data-element-id matching id and text includes label', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const panel = makePanel();
    const el = findElementItem(panel, boxEl.id);
    expect(el?.dataset['elementId']).toBe(boxEl.id);
    expect(el?.textContent).toContain(boxEl.label);
    localStorage.clear();
  });

  it('child element appears with data-depth="1"', () => {
    const child = createSphere();
    seedProject({ ...createBox(), child_elements: [child] });
    const panel = makePanel();
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(2);
    expect(findElementItem(panel, child.id)?.dataset['depth']).toBe('1');
    localStorage.clear();
  });

  it('elements-add-btn exists inside elements-panel', () => {
    localStorage.clear();
    const panel = makePanel();
    expect(panel.getElement().querySelector('#elements-add-btn')).toBeTruthy();
  });

  it('clicking + reveals picker with Box, Sphere, Cylinder buttons', () => {
    localStorage.clear();
    const panel = makePanel();
    panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
    const picker = panel.getElement().querySelector('#elements-picker');
    expect(picker?.hasAttribute('hidden')).toBe(false);
    const labels = Array.from(picker?.querySelectorAll('button') ?? []).map((b) => b.textContent);
    expect(labels).toContain('Box');
    expect(labels).toContain('Sphere');
    expect(labels).toContain('Cylinder');
  });

  it('clicking Box creates element, persists to project storage, hides picker, updates list', () => {
    localStorage.clear();
    const sm = makeSm();
    const panel = createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID);
    panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
    const picker = panel.getElement().querySelector('#elements-picker');
    const btns = panel.getElement().querySelectorAll<HTMLButtonElement>('#elements-picker button');
    Array.from(btns)
      .find((b) => b.textContent === 'Box')
      ?.click();
    expect(picker?.hasAttribute('hidden')).toBe(true);
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(1);
    const saved = loadProject(PROJECT_ID);
    expect(saved?.elements.length).toBe(1);
    expect(sm.getObject(saved?.elements[0]?.id ?? '')).toBeInstanceOf(THREE.Mesh);
  });
});
