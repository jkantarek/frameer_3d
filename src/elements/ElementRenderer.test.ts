import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createBox, createCylinder, createSphere } from './PrimitiveFactory.js';

class MockSceneRenderer implements SceneRenderer {
  renderCallCount = 0;
  render(): void {
    this.renderCallCount++;
  }
  setSize(): void {
    return;
  }
}

function makeSm(): SceneManager {
  return new SceneManager(new MockSceneRenderer(), new THREE.PerspectiveCamera());
}

describe('createElementRenderer', () => {
  it('returns an object with a sync method', () => {
    const renderer = createElementRenderer(makeSm());
    expect(typeof renderer.sync).toBe('function');
  });

  it('sync with empty elements leaves no objects in scene', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    renderer.sync({ elements: [] });
    expect(sm.getObject('any')).toBeUndefined();
  });

  it('sync with a box element adds a THREE.Mesh accessible by id', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    renderer.sync({ elements: [box] });
    expect(sm.getObject(box.id)).toBeInstanceOf(THREE.Mesh);
  });

  it('sync with sphere element uses SphereGeometry', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const sphere = createSphere();
    renderer.sync({ elements: [sphere] });
    const mesh = sm.getObject(sphere.id) as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
  });

  it('sync with cylinder element uses CylinderGeometry', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const cyl = createCylinder();
    renderer.sync({ elements: [cyl] });
    const mesh = sm.getObject(cyl.id) as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
  });

  it('second sync without the element removes the mesh', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    renderer.sync({ elements: [box] });
    expect(sm.getObject(box.id)).toBeInstanceOf(THREE.Mesh);
    renderer.sync({ elements: [] });
    expect(sm.getObject(box.id)).toBeUndefined();
  });

  it('sync with child element adds child mesh accessible by child id', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const child = createSphere();
    const parent = { ...createBox(), child_elements: [child] } as const;
    renderer.sync({ elements: [parent] });
    expect(sm.getObject(parent.id)).toBeInstanceOf(THREE.Mesh);
    expect(sm.getObject(child.id)).toBeInstanceOf(THREE.Mesh);
  });

  it('second sync with updated element replaces mesh with distinct object', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    renderer.sync({ elements: [box] });
    const mesh1 = sm.getObject(box.id);
    const updatedBox = {
      ...box,
      parametric_attributes: box.parametric_attributes.map((a) =>
        a.attribute_uri_key === 'geometry.width' ? { ...a, attribute_value: '3' } : a,
      ),
    };
    renderer.sync({ elements: [updatedBox] });
    const mesh2 = sm.getObject(box.id);
    expect(mesh2).toBeInstanceOf(THREE.Mesh);
    expect(mesh2).not.toBe(mesh1);
  });

  it('sets mesh position from origin_attributes', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = createBox();
    const movedBox = {
      ...box,
      origin_attributes: [
        { id: 'ox', dimension_uri_key: 'position.x', dimension_uri_value: 5 },
        { id: 'oy', dimension_uri_key: 'position.y', dimension_uri_value: 3 },
        { id: 'oz', dimension_uri_key: 'position.z', dimension_uri_value: -2 },
      ],
    };
    renderer.sync({ elements: [movedBox] });
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh.position.x).toBe(5);
    expect(mesh.position.y).toBe(3);
    expect(mesh.position.z).toBe(-2);
  });

  it('second sync removes child mesh when parent element removed', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const child = createSphere();
    const parent = { ...createBox(), child_elements: [child] } as const;
    renderer.sync({ elements: [parent] });
    renderer.sync({ elements: [] });
    expect(sm.getObject(parent.id)).toBeUndefined();
    expect(sm.getObject(child.id)).toBeUndefined();
  });

  it('falls back to 0 for missing parametric and origin attributes', () => {
    const sm = makeSm();
    const renderer = createElementRenderer(sm);
    const box = { ...createBox(), parametric_attributes: [], origin_attributes: [] };
    renderer.sync({ elements: [box] });
    const mesh = sm.getObject(box.id) as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.position.x).toBe(0);
    expect(mesh.position.y).toBe(0);
    expect(mesh.position.z).toBe(0);
  });
});
