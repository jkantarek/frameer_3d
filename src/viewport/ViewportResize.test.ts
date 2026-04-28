import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { createViewport } from './Viewport.js';

class MockSceneRenderer implements SceneRenderer {
  readonly setSizeCalls: [number, number][] = [];
  render(): void {
    return;
  }
  setSize(width: number, height: number): void {
    this.setSizeCalls.push([width, height]);
  }
}

class FakeResizeObserver {
  static instance: FakeResizeObserver | null = null;
  private readonly callback: ResizeObserverCallback;
  observeCallCount = 0;
  disconnectCalled = false;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instance = this;
  }
  observe(): void {
    this.observeCallCount++;
  }
  disconnect(): void {
    this.disconnectCalled = true;
  }
  triggerResize(width: number, height: number): void {
    this.callback(
      [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  triggerEmpty(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe('createViewport ResizeObserver', () => {
  beforeEach(() => {
    FakeResizeObserver.instance = null;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ResizeObserver callback updates renderer size and camera aspect', () => {
    const mock = new MockSceneRenderer();
    const canvas = document.createElement('canvas');
    const container = document.createElement('div');
    container.appendChild(canvas);
    const vp = createViewport(canvas, mock);
    const observer = FakeResizeObserver.instance;
    expect(observer).not.toBeNull();
    if (observer === null) return;
    observer.triggerResize(800, 400);
    expect(mock.setSizeCalls).toContainEqual([800, 400]);
    expect(vp.getCamera().aspect).toBe(2);
    vp.dispose();
  });

  it('ResizeObserver callback with empty entries does not throw', () => {
    const vp = createViewport(document.createElement('canvas'), new MockSceneRenderer());
    const observer = FakeResizeObserver.instance;
    expect(observer).not.toBeNull();
    if (observer === null) return;
    expect(() => {
      observer.triggerEmpty();
    }).not.toThrow();
    vp.dispose();
  });

  it('dispose() disconnects the ResizeObserver', () => {
    const vp = createViewport(document.createElement('canvas'), new MockSceneRenderer());
    const observer = FakeResizeObserver.instance;
    expect(observer).not.toBeNull();
    if (observer === null) return;
    vp.dispose();
    expect(observer.disconnectCalled).toBe(true);
  });
});
