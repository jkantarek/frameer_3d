import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { createSelectionHighlight } from './SelectionHighlight.js';

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

function makeMesh(): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
}

describe('createSelectionHighlight', () => {
  it('attach adds a child named __selection-outline__', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    highlight.attach(mesh);
    expect(mesh.getObjectByName('__selection-outline__')).toBeTruthy();
  });

  it('attached outline has BackSide material', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    highlight.attach(mesh);
    const outline = mesh.getObjectByName('__selection-outline__') as THREE.Mesh;
    expect((outline.material as THREE.MeshStandardMaterial).side).toBe(THREE.BackSide);
  });

  it('attached outline scale is > 1', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    highlight.attach(mesh);
    const outline = mesh.getObjectByName('__selection-outline__') as THREE.Mesh;
    expect(outline.scale.x).toBeGreaterThan(1);
    expect(outline.scale.y).toBeGreaterThan(1);
    expect(outline.scale.z).toBeGreaterThan(1);
  });

  it('attach twice is idempotent (no duplicate children)', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    highlight.attach(mesh);
    highlight.attach(mesh);
    const count = mesh.children.filter((c) => c.name === '__selection-outline__').length;
    expect(count).toBe(1);
  });

  it('detach removes the outline child', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    highlight.attach(mesh);
    highlight.detach(mesh);
    expect(mesh.getObjectByName('__selection-outline__')).toBeUndefined();
  });

  it('detach on mesh without outline is a no-op', () => {
    const highlight = createSelectionHighlight();
    const mesh = makeMesh();
    expect(() => {
      highlight.detach(mesh);
    }).not.toThrow();
  });

  it('clear removes outline from mesh in SceneManager by id', () => {
    const highlight = createSelectionHighlight();
    const sm = makeSm();
    const mesh = makeMesh();
    sm.addObject('test-id', mesh);
    highlight.attach(mesh);
    highlight.clear(sm, 'test-id');
    expect(mesh.getObjectByName('__selection-outline__')).toBeUndefined();
  });

  it('clear with unknown id is a no-op', () => {
    const highlight = createSelectionHighlight();
    const sm = makeSm();
    expect(() => {
      highlight.clear(sm, 'not-found');
    }).not.toThrow();
  });
});
