import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { load } from './ElementStore.js';
import { createBox } from './PrimitiveFactory.js';
import { createElementPanel } from './ElementPanel.js';

const KEY = 'frameer3d.v1.elements';

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
  const panel = createElementPanel(document.createElement('div'), sm, makeFolder());
  panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
  const btns = panel.getElement().querySelectorAll<HTMLButtonElement>('#elements-picker button');
  Array.from(btns)
    .find((b) => b.textContent === label)
    ?.click();
  return load().elements[0]?.id ?? '';
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

  it('elements-remove-btn exists inside elements-panel', () => {
    localStorage.clear();
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    expect(panel.getElement().querySelector('#elements-remove-btn')).toBeTruthy();
  });

  it('clicking remove without selection does nothing', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    panel.getElement().querySelector<HTMLElement>('#elements-remove-btn')?.click();
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(1);
    localStorage.clear();
  });

  it('clicking remove after selection removes element from list and scene', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const panel = createElementPanel(document.createElement('div'), sm, makeFolder());
    findElementItem(panel, boxEl.id)?.click();
    panel.getElement().querySelector<HTMLElement>('#elements-remove-btn')?.click();
    expect(panel.getElement().querySelectorAll('[data-element-id]').length).toBe(0);
    expect(sm.getObject(boxEl.id)).toBeUndefined();
    localStorage.clear();
  });
});
