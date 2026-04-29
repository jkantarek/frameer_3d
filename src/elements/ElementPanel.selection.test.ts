import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { createBox, createSphere } from './PrimitiveFactory.js';
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

describe('createElementPanel — selection', () => {
  it('clicking a list row sets aria-selected and binds controls', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const folder = makeFolder();
    const panel = createElementPanel(document.createElement('div'), makeSm(), folder);
    const li = panel.getElement().querySelector<HTMLLIElement>('li');
    li?.click();
    expect(li?.getAttribute('aria-selected')).toBe('true');
    expect(folder.children.length).toBeGreaterThan(0);
    localStorage.clear();
  });

  it('clicking a second row deselects the first', () => {
    const boxEl = createBox();
    const sphereEl = createSphere();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl, sphereEl] }));
    const folder = makeFolder();
    const panel = createElementPanel(document.createElement('div'), makeSm(), folder);
    const lis = panel.getElement().querySelectorAll<HTMLLIElement>('li');
    lis[0]?.click();
    lis[1]?.click();
    expect(lis[0]?.getAttribute('aria-selected')).toBe('false');
    expect(lis[1]?.getAttribute('aria-selected')).toBe('true');
    localStorage.clear();
  });

  it('onChange from binding updates geometry in scene', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const folder = makeFolder();
    const panel = createElementPanel(document.createElement('div'), sm, folder);
    panel.getElement().querySelector<HTMLLIElement>('li')?.click();
    const input = folder.element.querySelector<HTMLInputElement>('input');
    expect(input).toBeTruthy();
    if (input) {
      input.value = '5';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const mesh = sm.getObject(boxEl.id);
    expect((mesh as THREE.Mesh).geometry).toBeInstanceOf(THREE.BoxGeometry);
    const geo = (mesh as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(geo.parameters.width).toBe(5);
    localStorage.clear();
  });
});
