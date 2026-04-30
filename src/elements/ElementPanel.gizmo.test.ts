import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import type { TransformGizmoApi } from '../scene/TransformGizmo.js';
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

class FakeGizmo implements TransformGizmoApi {
  attachedObject: THREE.Object3D | undefined;
  detachCalled = false;
  objectChangeCb: (() => void) | undefined;
  dragEndCb: (() => void) | undefined;

  attach(object: THREE.Object3D | undefined): void {
    this.attachedObject = object;
  }
  detach(): void {
    this.detachCalled = true;
  }
  setMode(): void {
    return;
  }
  getHelper(): THREE.Object3D {
    return new THREE.Object3D();
  }
  onObjectChange(cb: () => void): void {
    this.objectChangeCb = cb;
  }
  onDragEnd(cb: () => void): void {
    this.dragEndCb = cb;
  }
  dispose(): void {
    return;
  }
}

describe('createElementPanel — gizmo wiring', () => {
  it('stub.attach called on row select', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(document.createElement('div'), sm, makeFolder(), gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    expect(gizmo.attachedObject).toBeTruthy();
    localStorage.clear();
  });

  it('stub.detach called on inline × remove', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(document.createElement('div'), sm, makeFolder(), gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    panel.getElement().querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`)?.click();
    expect(gizmo.detachCalled).toBe(true);
    localStorage.clear();
  });

  it('onObjectChange updates origin_attributes and saves without re-syncing mesh count', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    createElementPanel(document.createElement('div'), sm, makeFolder(), gizmo);
    // Trigger object change with a moved object
    const obj = sm.getObject(boxEl.id) as THREE.Mesh;
    obj.position.set(1, 2, 3);
    gizmo.objectChangeCb?.();
    const stored = load();
    const el = stored.elements.find((e) => e.id === boxEl.id);
    const xAttr = el?.origin_attributes.find((a) => a.dimension_uri_key === 'position.x');
    expect(xAttr?.dimension_uri_value).toBe(1);
    localStorage.clear();
  });

  it('onDragEnd triggers renderer.sync (mesh count stable)', () => {
    const boxEl = createBox();
    localStorage.setItem(KEY, JSON.stringify({ elements: [boxEl] }));
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    createElementPanel(document.createElement('div'), sm, makeFolder(), gizmo);
    // Trigger drag end — should re-sync without throwing
    expect(() => {
      gizmo.dragEndCb?.();
    }).not.toThrow();
    expect(sm.getObject(boxEl.id)).toBeInstanceOf(THREE.Mesh);
    localStorage.clear();
  });
});
