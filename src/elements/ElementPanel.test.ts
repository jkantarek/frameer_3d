import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { load } from './ElementStore.js';
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

describe('createElementPanel', () => {
  it('returns an object with getElement() and dispose()', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder());
    expect(typeof panel.getElement).toBe('function');
    expect(typeof panel.dispose).toBe('function');
  });

  it('getElement() returns HTMLElement with id elements-panel', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder());
    const el = panel.getElement();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('elements-panel');
  });

  it('panel element is a descendant of container', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder());
    expect(div.contains(panel.getElement())).toBe(true);
  });

  it('dispose() removes panel element from container', () => {
    localStorage.clear();
    const div = document.createElement('div');
    const panel = createElementPanel(div, makeSm(), makeFolder());
    panel.dispose();
    expect(div.contains(panel.getElement())).toBe(false);
  });

  it('renders 2 list items for 2 pre-seeded elements', () => {
    const boxEl = createBox();
    const sphereEl = createSphere();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl, sphereEl] }));
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    expect(panel.getElement().querySelectorAll('li').length).toBe(2);
    localStorage.clear();
  });

  it('each li has data-id matching element id and text includes label', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    const li = panel.getElement().querySelector('li');
    expect(li?.dataset.id).toBe(boxEl.id);
    expect(li?.textContent).toContain(boxEl.label);
    localStorage.clear();
  });

  it('child element appears as li with data-depth="1"', () => {
    const child = createSphere();
    const parent = { ...createBox(), child_elements: [child] };
    localStorage.setItem(KEY, JSON.stringify({ elements: [parent] }));
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    const lis = panel.getElement().querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(Array.from(lis).find((li) => li.dataset.id === child.id)?.dataset.depth).toBe('1');
    localStorage.clear();
  });

  it('elements-add-btn exists inside elements-panel', () => {
    localStorage.clear();
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    expect(panel.getElement().querySelector('#elements-add-btn')).toBeTruthy();
  });

  it('clicking + reveals picker with Box, Sphere, Cylinder buttons', () => {
    localStorage.clear();
    const panel = createElementPanel(document.createElement('div'), makeSm(), makeFolder());
    panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
    const picker = panel.getElement().querySelector('#elements-picker');
    expect(picker?.hasAttribute('hidden')).toBe(false);
    const labels = Array.from(picker?.querySelectorAll('button') ?? []).map((b) => b.textContent);
    expect(labels).toContain('Box');
    expect(labels).toContain('Sphere');
    expect(labels).toContain('Cylinder');
  });

  it('clicking Box creates element, persists, hides picker, updates list', () => {
    localStorage.clear();
    const sm = makeSm();
    const div = document.createElement('div');
    const panel = createElementPanel(div, sm, makeFolder());
    panel.getElement().querySelector<HTMLElement>('#elements-add-btn')?.click();
    const picker = panel.getElement().querySelector('#elements-picker');
    const btns = panel.getElement().querySelectorAll<HTMLButtonElement>('#elements-picker button');
    Array.from(btns)
      .find((b) => b.textContent === 'Box')
      ?.click();
    expect(picker?.hasAttribute('hidden')).toBe(true);
    expect(panel.getElement().querySelectorAll('li').length).toBe(1);
    const elements = load().elements;
    expect(elements.length).toBe(1);
    expect(sm.getObject(elements[0]?.id ?? '')).toBeInstanceOf(THREE.Mesh);
  });

  it('clicking Sphere creates sphere element in scene', () => {
    const sm = makeSm();
    expect(sm.getObject(clickPicker(sm, 'Sphere'))).toBeInstanceOf(THREE.Mesh);
  });

  it('clicking Cylinder creates cylinder element in scene', () => {
    const sm = makeSm();
    expect(sm.getObject(clickPicker(sm, 'Cylinder'))).toBeInstanceOf(THREE.Mesh);
  });
});
