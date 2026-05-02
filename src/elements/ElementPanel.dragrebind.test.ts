import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import type { TransformGizmoApi } from '../scene/TransformGizmo.js';
import { loadProject } from '../project/index.js';
import type { SceneElement } from './ElementTypes.js';
import { createBox } from './PrimitiveFactory.js';
import { createElementPanel } from './ElementPanel.js';

const PROJECT_ID = 'drag-rebind-test';

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

class FakeGizmo implements TransformGizmoApi {
  objectChangeCb: (() => void) | undefined;
  dragEndCb: (() => void) | undefined;
  attach(): void {
    return;
  }
  detach(): void {
    return;
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

describe('createElementPanel — drag rebind', () => {
  it('rebinds controls after drag so subsequent onChange uses dragged position as base', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const folder = makeFolder();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(document.createElement('div'), sm, folder, PROJECT_ID, gizmo);

    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();

    // Simulate drag moving the object to x=3
    const mesh = sm.getObject(boxEl.id) as THREE.Mesh;
    mesh.position.set(3, 0, 0);
    gizmo.objectChangeCb?.();
    gizmo.dragEndCb?.(); // should rebind controls with position.x=3

    // Trigger a name change via the controls — if rebind happened, current has position.x=3
    const nameInput = folder.element.querySelector<HTMLInputElement>('input');
    if (nameInput) {
      nameInput.value = 'Renamed';
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Without rebind the commit would overwrite position.x back to 0
    const stored = loadProject(PROJECT_ID);
    const el = stored?.elements.find((e) => e.id === boxEl.id);
    const xAttr = el?.origin_attributes.find((a) => a.dimension_uri_key === 'position.x');
    expect(xAttr?.dimension_uri_value).toBe(3);
    localStorage.clear();
  });

  it('does not throw when no element is selected at drag end', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    createElementPanel(document.createElement('div'), sm, makeFolder(), PROJECT_ID, gizmo);

    expect(() => {
      gizmo.dragEndCb?.();
    }).not.toThrow();
    localStorage.clear();
  });

  it('rebinds rotation controls after rotation drag so values reflect rotated state', () => {
    const boxEl = createBox();
    seedProject(boxEl);
    const sm = makeSm();
    const gizmo = new FakeGizmo();
    const panel = createElementPanel(
      document.createElement('div'),
      sm,
      makeFolder(),
      PROJECT_ID,
      gizmo,
    );

    panel.getElement().querySelector<HTMLElement>('[data-element-id]')?.click();

    const mesh = sm.getObject(boxEl.id) as THREE.Mesh;
    mesh.rotation.set(1.5, 0.3, 0);
    gizmo.objectChangeCb?.();
    gizmo.dragEndCb?.();

    const stored = loadProject(PROJECT_ID);
    const el = stored?.elements.find((e) => e.id === boxEl.id);
    const rxAttr = el?.rotation_attributes.find((a) => a.dimension_uri_key === 'rotation.x');
    expect(rxAttr?.dimension_uri_value).toBeCloseTo(1.5);
    localStorage.clear();
  });
});
