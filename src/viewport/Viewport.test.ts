import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { createViewport } from './Viewport.js';

class MockSceneRenderer implements SceneRenderer {
  renderCallCount = 0;
  render(): void {
    this.renderCallCount++;
  }
  setSize(): void {
    return;
  }
}

class FakeResizeObserver {
  constructor() {
    return;
  }
  observe(): void {
    return;
  }
  disconnect(): void {
    return;
  }
}

describe('createViewport', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
  });

  it('returns object with getCamera, getSceneManager, and dispose', () => {
    const canvas = document.createElement('canvas');
    const vp = createViewport(canvas, new MockSceneRenderer());
    expect(typeof vp.getCamera).toBe('function');
    expect(typeof vp.getSceneManager).toBe('function');
    expect(typeof vp.dispose).toBe('function');
    vp.dispose();
  });

  it('getCamera() returns a PerspectiveCamera with fov 60', () => {
    const vp = createViewport(document.createElement('canvas'), new MockSceneRenderer());
    expect(vp.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(vp.getCamera().fov).toBe(60);
    vp.dispose();
  });

  it('getSceneManager() returns an object with addObject and getCamera', () => {
    const vp = createViewport(document.createElement('canvas'), new MockSceneRenderer());
    const sm = vp.getSceneManager();
    expect(typeof sm.addObject).toBe('function');
    expect(typeof sm.getCamera).toBe('function');
    vp.dispose();
  });

  it('canvas role is set to img and aria-label to 3D viewport', () => {
    const canvas = document.createElement('canvas');
    const vp = createViewport(canvas, new MockSceneRenderer());
    expect(canvas.role).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('3D viewport');
    vp.dispose();
  });

  it('one RAF tick calls renderFrame exactly once', () => {
    vi.useFakeTimers();
    const mock = new MockSceneRenderer();
    const vp = createViewport(document.createElement('canvas'), mock);
    vi.advanceTimersToNextFrame();
    expect(mock.renderCallCount).toBe(1);
    vp.dispose();
  });

  it('visibilitychange to hidden stops rendering', () => {
    vi.useFakeTimers();
    const mock = new MockSceneRenderer();
    const vp = createViewport(document.createElement('canvas'), mock);
    vi.advanceTimersToNextFrame();
    const count = mock.renderCallCount;
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersToNextFrame();
    expect(mock.renderCallCount).toBe(count);
    vp.dispose();
  });

  it('visibilitychange back to visible resumes rendering', () => {
    vi.useFakeTimers();
    const mock = new MockSceneRenderer();
    const vp = createViewport(document.createElement('canvas'), mock);
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersToNextFrame();
    const hiddenCount = mock.renderCallCount;
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersToNextFrame();
    expect(mock.renderCallCount).toBeGreaterThan(hiddenCount);
    vp.dispose();
  });

  it('dispose() stops future render calls', () => {
    vi.useFakeTimers();
    const mock = new MockSceneRenderer();
    const vp = createViewport(document.createElement('canvas'), mock);
    vi.advanceTimersToNextFrame();
    const count = mock.renderCallCount;
    vp.dispose();
    vi.advanceTimersToNextFrame();
    expect(mock.renderCallCount).toBe(count);
  });

  it('getTransformGizmo() returns a TransformGizmoApi with all 7 methods', () => {
    const vp = createViewport(document.createElement('canvas'), new MockSceneRenderer());
    const gizmo = vp.getTransformGizmo();
    expect(typeof gizmo.attach).toBe('function');
    expect(typeof gizmo.detach).toBe('function');
    expect(typeof gizmo.setMode).toBe('function');
    expect(typeof gizmo.getHelper).toBe('function');
    expect(typeof gizmo.onObjectChange).toBe('function');
    expect(typeof gizmo.onDragEnd).toBe('function');
    expect(typeof gizmo.dispose).toBe('function');
    vp.dispose();
  });
});
