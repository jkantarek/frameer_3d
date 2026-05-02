import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import type { TransformGizmoApi } from '../scene/TransformGizmo.js';
import { loadProject } from '../project/index.js';
import type { SceneElement } from './ElementTypes.js';
import type { ElementPanelApi } from './ElementPanel.js';
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
function makePanel(sm: SceneManager, gizmo: TransformGizmoApi): ElementPanelApi {
  return createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID, gizmo);
}
class FakeGizmo implements TransformGizmoApi {
  attachedObject: THREE.Object3D | undefined;
  attachCallCount = 0;
  detachCalled = false;
  objectChangeCb: (() => void) | undefined;
  dragEndCb: (() => void) | undefined;
  attach(object: THREE.Object3D | undefined): void {
    this.attachCallCount++;
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
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    const panel = makePanel(sm, gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    expect(gizmo.attachedObject).toBeTruthy();
    localStorage.clear();
  });
  it('stub.detach called on inline × remove', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    const panel = makePanel(sm, gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    panel.getElement().querySelector<HTMLButtonElement>(`[data-remove-for="${boxEl.id}"]`)?.click();
    expect(gizmo.detachCalled).toBe(true);
    localStorage.clear();
  });
  it('onObjectChange updates origin_attributes and saves without re-syncing mesh count', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID, gizmo);
    // Trigger object change with a moved object
    const obj = sm.getObject(boxEl.id) as THREE.Mesh;
    obj.position.set(1, 2, 3);
    obj.rotation.set(0.7, 0.4, 0.2);
    gizmo.objectChangeCb?.();
    const stored = loadProject(PROJECT_ID);
    const el = stored?.elements.find((e) => e.id === boxEl.id);
    const xAttr = el?.origin_attributes.find((a) => a.dimension_uri_key === 'position.x');
    expect(xAttr?.dimension_uri_value).toBe(1);
    const rxAttr = el?.rotation_attributes.find((a) => a.dimension_uri_key === 'rotation.x');
    expect(rxAttr?.dimension_uri_value).toBe(0.7);
    localStorage.clear();
  });
  it('onDragEnd triggers renderer.sync (mesh count stable)', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID, gizmo);
    // Trigger drag end — should re-sync without throwing
    expect(() => {
      gizmo.dragEndCb?.();
    }).not.toThrow();
    expect(sm.getObject(boxEl.id)).toBeInstanceOf(THREE.Mesh);
    localStorage.clear();
  });
  it('re-attaches gizmo after commit when element is selected', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const folder = makeFolder();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(document.createElement('div'), sm, folder, PROJECT_ID, gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    expect(gizmo.attachCallCount).toBe(1);
    const inputs = folder.element.querySelectorAll<HTMLInputElement>('input');
    const widthInput = inputs[1];
    if (widthInput) {
      widthInput.value = '5';
      widthInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(gizmo.attachCallCount).toBe(2);
    localStorage.clear();
  });
  it('re-attaches gizmo and selection after onDragEnd when element is selected', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const folder = makeFolder();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(document.createElement('div'), sm, folder, PROJECT_ID, gizmo);
    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();
    const countBefore = gizmo.attachCallCount;
    gizmo.dragEndCb?.();
    expect(gizmo.attachCallCount).toBe(countBefore + 1);
    expect(sm.getObject(boxEl.id)?.getObjectByName('__selection-outline__')).toBeTruthy();
    localStorage.clear();
  });
});
