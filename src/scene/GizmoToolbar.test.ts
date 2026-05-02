import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { TransformGizmoApi, TransformMode } from './TransformGizmo.js';
import { createGizmoToolbar } from './GizmoToolbar.js';

class FakeGizmo implements TransformGizmoApi {
  lastMode: TransformMode | undefined;

  attach(): void {
    return;
  }
  detach(): void {
    return;
  }
  setMode(mode: TransformMode): void {
    this.lastMode = mode;
  }
  getHelper(): THREE.Object3D {
    return new THREE.Object3D();
  }
  onObjectChange(): void {
    return;
  }
  onDragEnd(): void {
    return;
  }
  dispose(): void {
    return;
  }
}

function makeSetup(): { container: HTMLElement; gizmo: FakeGizmo } {
  return { container: document.createElement('div'), gizmo: new FakeGizmo() };
}

describe('createGizmoToolbar', () => {
  it('appends div#gizmo-toolbar with role="toolbar"', () => {
    const { container, gizmo } = makeSetup();
    createGizmoToolbar(container, gizmo);
    const tb = container.querySelector('#gizmo-toolbar');
    expect(tb).toBeTruthy();
    expect(tb?.getAttribute('role')).toBe('toolbar');
  });

  it('contains exactly 3 buttons with data-mode translate, rotate, scale', () => {
    const { container, gizmo } = makeSetup();
    createGizmoToolbar(container, gizmo);
    const btns = container.querySelectorAll<HTMLButtonElement>('#gizmo-toolbar button');
    expect(btns.length).toBe(3);
    expect(btns[0]?.getAttribute('data-mode')).toBe('translate');
    expect(btns[1]?.getAttribute('data-mode')).toBe('rotate');
    expect(btns[2]?.getAttribute('data-mode')).toBe('scale');
  });

  it('translate starts aria-pressed="true"; others "false"', () => {
    const { container, gizmo } = makeSetup();
    createGizmoToolbar(container, gizmo);
    const btns = container.querySelectorAll<HTMLButtonElement>('#gizmo-toolbar button');
    expect(btns[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(btns[1]?.getAttribute('aria-pressed')).toBe('false');
    expect(btns[2]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking rotate calls gizmo.setMode("rotate") and updates aria-pressed', () => {
    const { container, gizmo } = makeSetup();
    createGizmoToolbar(container, gizmo);
    container.querySelector<HTMLButtonElement>('[data-mode="rotate"]')?.click();
    expect(gizmo.lastMode).toBe('rotate');
    const btns = container.querySelectorAll<HTMLButtonElement>('#gizmo-toolbar button');
    expect(btns[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(btns[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(btns[2]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('setActiveMode("scale") updates aria-pressed', () => {
    const { container, gizmo } = makeSetup();
    const toolbar = createGizmoToolbar(container, gizmo);
    toolbar.setActiveMode('scale');
    const btns = container.querySelectorAll<HTMLButtonElement>('#gizmo-toolbar button');
    expect(btns[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(btns[1]?.getAttribute('aria-pressed')).toBe('false');
    expect(btns[2]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('creation calls gizmo.setMode("translate") to sync initial state', () => {
    const { container, gizmo } = makeSetup();
    createGizmoToolbar(container, gizmo);
    expect(gizmo.lastMode).toBe('translate');
  });

  it('dispose() removes #gizmo-toolbar from container', () => {
    const { container, gizmo } = makeSetup();
    const toolbar = createGizmoToolbar(container, gizmo);
    expect(container.querySelector('#gizmo-toolbar')).toBeTruthy();
    toolbar.dispose();
    expect(container.querySelector('#gizmo-toolbar')).toBeNull();
  });
});
