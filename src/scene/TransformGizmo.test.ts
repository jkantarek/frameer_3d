import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTransformGizmo } from './TransformGizmo.js';

class FakeOrbitControls {
  enabled = true;
}

class FakeTransformControls extends THREE.EventDispatcher {
  attachCalled = false;
  detachCalled = false;
  lastMode: string | undefined;
  disposeCalled = false;
  readonly helper = new THREE.Object3D();

  attach(): void {
    this.attachCalled = true;
  }
  detach(): void {
    this.detachCalled = true;
  }
  setMode(mode: string): void {
    this.lastMode = mode;
  }
  dispose(): void {
    this.disposeCalled = true;
  }
  getHelper(): THREE.Object3D {
    return this.helper;
  }
}

function makeGizmo(): {
  gizmo: ReturnType<typeof createTransformGizmo>;
  tc: FakeTransformControls;
  orbit: FakeOrbitControls;
} {
  const tc = new FakeTransformControls();
  const orbit = new FakeOrbitControls();
  const canvas = document.createElement('canvas');
  const camera = new THREE.PerspectiveCamera();
  const gizmo = createTransformGizmo(camera, canvas, orbit as unknown as OrbitControls, () => tc);
  return { gizmo, tc, orbit };
}

describe('createTransformGizmo', () => {
  it('getHelper() returns a THREE.Object3D', () => {
    const { gizmo } = makeGizmo();
    expect(gizmo.getHelper()).toBeInstanceOf(THREE.Object3D);
  });

  it('dragging-changed with value:true disables orbitControls', () => {
    const { gizmo, tc, orbit } = makeGizmo();
    void gizmo;
    tc.dispatchEvent({ type: 'dragging-changed', value: true });
    expect(orbit.enabled).toBe(false);
  });

  it('dragging-changed with value:false re-enables orbitControls', () => {
    const { gizmo, tc, orbit } = makeGizmo();
    void gizmo;
    tc.dispatchEvent({ type: 'dragging-changed', value: true });
    tc.dispatchEvent({ type: 'dragging-changed', value: false });
    expect(orbit.enabled).toBe(true);
  });

  it('onObjectChange callback fires when objectChange event dispatched', () => {
    const { gizmo, tc } = makeGizmo();
    let called = false;
    gizmo.onObjectChange(() => {
      called = true;
    });
    tc.dispatchEvent({ type: 'objectChange' });
    expect(called).toBe(true);
  });

  it('onDragEnd callback fires when dragging-changed fires with value:false', () => {
    const { gizmo, tc } = makeGizmo();
    let called = false;
    gizmo.onDragEnd(() => {
      called = true;
    });
    tc.dispatchEvent({ type: 'dragging-changed', value: false });
    expect(called).toBe(true);
  });

  it('attach(object) calls tc.attach', () => {
    const { gizmo, tc } = makeGizmo();
    const obj = new THREE.Object3D();
    gizmo.attach(obj);
    expect(tc.attachCalled).toBe(true);
  });

  it('attach(undefined) does not call tc.attach', () => {
    const { gizmo, tc } = makeGizmo();
    gizmo.attach(undefined);
    expect(tc.attachCalled).toBe(false);
  });

  it('detach() calls tc.detach', () => {
    const { gizmo, tc } = makeGizmo();
    gizmo.detach();
    expect(tc.detachCalled).toBe(true);
  });

  it('setMode() calls tc.setMode with given mode', () => {
    const { gizmo, tc } = makeGizmo();
    gizmo.setMode('rotate');
    expect(tc.lastMode).toBe('rotate');
  });

  it('dispose() does not throw', () => {
    const { gizmo } = makeGizmo();
    expect(() => {
      gizmo.dispose();
    }).not.toThrow();
  });

  it('gizmo has attach, detach, setMode, getHelper, onObjectChange, onDragEnd, dispose', () => {
    const { gizmo } = makeGizmo();
    expect(typeof gizmo.attach).toBe('function');
    expect(typeof gizmo.detach).toBe('function');
    expect(typeof gizmo.setMode).toBe('function');
    expect(typeof gizmo.getHelper).toBe('function');
    expect(typeof gizmo.onObjectChange).toBe('function');
    expect(typeof gizmo.onDragEnd).toBe('function');
    expect(typeof gizmo.dispose).toBe('function');
  });
});
