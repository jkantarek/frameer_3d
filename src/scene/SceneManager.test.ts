import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from './SceneRenderer.js';
import { SceneManager } from './SceneManager.js';

class MockSceneRenderer implements SceneRenderer {
  renderCallCount = 0;
  lastScene: THREE.Scene | null = null;
  readonly setSizeCalls: [number, number][] = [];

  render(scene: THREE.Scene): void {
    this.renderCallCount++;
    this.lastScene = scene;
  }

  setSize(width: number, height: number): void {
    this.setSizeCalls.push([width, height]);
  }
}

describe('SceneManager', () => {
  it('renderFrame() calls renderer.render exactly once per call', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    const sm = new SceneManager(mock, camera);
    expect(mock.renderCallCount).toBe(0);
    sm.renderFrame();
    expect(mock.renderCallCount).toBe(1);
  });

  it('getCamera() returns the injected PerspectiveCamera', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    const sm = new SceneManager(mock, camera);
    expect(sm.getCamera()).toBe(camera);
  });

  it('constructor creates an internal THREE.Scene passed to renderer.render', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    const sm = new SceneManager(mock, camera);
    sm.renderFrame();
    expect(mock.lastScene).toBeInstanceOf(THREE.Scene);
  });

  it('setBackground sets scene.background to a THREE.Color with the specified hex', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    const sm = new SceneManager(mock, camera);
    sm.setBackground('#1a1a2e');
    sm.renderFrame();
    const bg = mock.lastScene?.background;
    expect(bg).toBeInstanceOf(THREE.Color);
    expect((bg as THREE.Color).getHex()).toBe(0x1a1a2e);
  });

  it('addObject adds an object retrievable via getObject', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    const obj = new THREE.Object3D();
    sm.addObject('test', obj);
    expect(sm.getObject('test')).toBe(obj);
  });

  it('addObject adds the object to the scene', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    const obj = new THREE.Object3D();
    sm.addObject('test', obj);
    sm.renderFrame();
    expect(mock.lastScene?.children).toContain(obj);
  });

  it('addObject with duplicate id replaces previous object and removes it from scene', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    const obj1 = new THREE.Object3D();
    const obj2 = new THREE.Object3D();
    sm.addObject('a', obj1);
    sm.addObject('a', obj2);
    sm.renderFrame();
    expect(sm.getObject('a')).toBe(obj2);
    expect(mock.lastScene?.children).toContain(obj2);
    expect(mock.lastScene?.children).not.toContain(obj1);
  });

  it('addObject with empty id throws Error', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    expect(() => {
      sm.addObject('', new THREE.Object3D());
    }).toThrow(Error);
  });

  it('removeObject removes the object from scene and getObject returns undefined', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    const obj = new THREE.Object3D();
    sm.addObject('r', obj);
    sm.removeObject('r');
    expect(sm.getObject('r')).toBeUndefined();
    sm.renderFrame();
    expect(mock.lastScene?.children).not.toContain(obj);
  });

  it('removeObject is a no-op for an unknown id', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    expect(() => {
      sm.removeObject('nonexistent');
    }).not.toThrow();
  });

  it('getObject returns undefined for an unknown id', () => {
    const mock = new MockSceneRenderer();
    const camera = new THREE.PerspectiveCamera();
    const sm = new SceneManager(mock, camera);
    expect(sm.getObject('missing')).toBeUndefined();
  });
});
