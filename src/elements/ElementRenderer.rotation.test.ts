import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createBox } from './PrimitiveFactory.js';

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

describe('ElementRenderer rotation sync', () => {
  it('sets mesh rotation from rotation_attributes', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = {
      ...createBox(),
      rotation_attributes: [
        { id: 'rx', dimension_uri_key: 'rotation.x', dimension_uri_value: 1.0 },
        { id: 'ry', dimension_uri_key: 'rotation.y', dimension_uri_value: 0.5 },
        { id: 'rz', dimension_uri_key: 'rotation.z', dimension_uri_value: 0.3 },
      ],
    };
    renderer.sync({ elements: [box] });
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh.rotation.x).toBeCloseTo(1.0);
    expect(mesh.rotation.y).toBeCloseTo(0.5);
    expect(mesh.rotation.z).toBeCloseTo(0.3);
  });

  it('defaults mesh rotation to 0/0/0 when rotation_attributes is empty', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = { ...createBox(), rotation_attributes: [] };
    renderer.sync({ elements: [box] });
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh.rotation.x).toBe(0);
    expect(mesh.rotation.y).toBe(0);
    expect(mesh.rotation.z).toBe(0);
  });
});
