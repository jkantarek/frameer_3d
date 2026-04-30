import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createBox, createPlane } from './PrimitiveFactory.js';

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

describe('createElementRenderer — color, plane, setSelected', () => {
  it('sync with box having material.color applies color to mesh material', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    const coloredBox = {
      ...box,
      parametric_attributes: box.parametric_attributes.map((a) =>
        a.attribute_uri_key === 'material.color' ? { ...a, attribute_value: '#ff0000' } : a,
      ),
    };
    renderer.sync({ elements: [coloredBox] });
    const mesh = sm.getObject(coloredBox.id) as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    expect(mat.color.getHexString()).toBe('ff0000');
  });

  it('sync with plane element creates a THREE.Mesh', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const plane = createPlane();
    renderer.sync({ elements: [plane] });
    expect(sm.getObject(plane.id)).toBeInstanceOf(THREE.Mesh);
  });

  it('setSelected(id) adds __selection-outline__ child to mesh', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    renderer.sync({ elements: [box] });
    renderer.setSelected(box.id);
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh.getObjectByName('__selection-outline__')).toBeTruthy();
  });

  it('setSelected(undefined) removes __selection-outline__ from previous mesh', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    renderer.sync({ elements: [box] });
    renderer.setSelected(box.id);
    renderer.setSelected(undefined);
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh.getObjectByName('__selection-outline__')).toBeUndefined();
  });

  it('setSelected with unknown id is a no-op', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    expect(() => {
      renderer.setSelected('nonexistent');
    }).not.toThrow();
  });
});
