import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { loadProject } from '../project/index.js';
import type { SceneElement } from './ElementTypes.js';
import { createBox } from './PrimitiveFactory.js';
import { createElementPanel } from './ElementPanel.js';

const PROJECT_ID = 'test-project-id';

function seedProject(...elements: SceneElement[]): void {
  const now = new Date().toISOString();
  const proj = { id: PROJECT_ID, name: 'Test', created_at: now, updated_at: now, elements };
  localStorage.setItem(`frameer3d.v1.project.${PROJECT_ID}`, JSON.stringify(proj));
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

function clickPicker(sm: SceneManager, label: string): string {
  localStorage.clear();
  const panel = createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID);
  panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
  const btns = panel.getElement().querySelectorAll<HTMLButtonElement>('#elements-picker button');
  Array.from(btns)
    .find((b) => b.textContent === label)
    ?.click();
  return loadProject(PROJECT_ID)?.elements[0]?.id ?? '';
}

function findElementItem(
  panel: ReturnType<typeof createElementPanel>,
  id: string,
): HTMLElement | null {
  return panel.getElement().querySelector<HTMLElement>(`[data-element-id="${id}"]`);
}

describe('createElementPanel — creation and removal', () => {
  it('clicking Sphere creates sphere element in scene', () => {
    const sm = makeSm();
    expect(sm.getObject(clickPicker(sm, 'Sphere'))).toBeInstanceOf(THREE.Mesh);
  });

  it('clicking Cylinder creates cylinder element in scene', () => {
    const sm = makeSm();
    expect(sm.getObject(clickPicker(sm, 'Cylinder'))).toBeInstanceOf(THREE.Mesh);
  });

  it('no #elements-remove-btn in panel', () => {
    localStorage.clear();
    const panel = createElementPanel(
      document.createElement('div'),
      makeSm(),
      makeFolder(),
      PROJECT_ID,
    );
    expect(panel.getElement().querySelector('#elements-remove-btn')).toBeNull();
  });

  it('each element row contains [data-remove-for] button', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const panel = createElementPanel(
      document.createElement('div'),
      makeSm(),
      makeFolder(),
      PROJECT_ID,
    );
    const removeBtn = panel
      .getElement()
      .querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`);
    expect(removeBtn).toBeTruthy();
    localStorage.clear();
  });

  it('[data-remove-for] button is hidden by default', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const panel = createElementPanel(
      document.createElement('div'),
      makeSm(),
      makeFolder(),
      PROJECT_ID,
    );
    const removeBtn = panel
      .getElement()
      .querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`);
    expect(removeBtn?.hidden).toBe(true);
    localStorage.clear();
  });

  it('[data-remove-for] button is visible after row is selected', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const panel = createElementPanel(
      document.createElement('div'),
      makeSm(),
      makeFolder(),
      PROJECT_ID,
    );
    findElementItem(panel, boxEl.id)?.click();
    const removeBtn = panel
      .getElement()
      .querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`);
    expect(removeBtn?.hidden).toBe(false);
    localStorage.clear();
  });

  it('clicking [data-remove-for] removes element from list and scene', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const panel = createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID);
    findElementItem(panel, boxEl.id)?.click();
    panel.getElement().querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`)?.click();
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(0);
    expect(sm.getObject(boxEl.id)).toBeUndefined();
    localStorage.clear();
  });
});
