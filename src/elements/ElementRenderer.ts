import * as THREE from 'three';
import type { SceneManager } from '../scene/SceneManager.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';

export interface ElementRendererApi {
  sync(data: ElementStoreData): void;
}

function collectIds(elements: readonly SceneElement[]): Set<string> {
  const ids = new Set<string>();
  function collect(els: readonly SceneElement[]): void {
    for (const el of els) {
      ids.add(el.id);
      collect(el.child_elements);
    }
  }
  collect(elements);
  return ids;
}

function getParam(element: SceneElement, key: string): number {
  const attr = element.parametric_attributes.find((a) => a.attribute_uri_key === key);
  return Number(attr?.attribute_value ?? '0');
}

function getOrigin(element: SceneElement, key: string): number {
  const attr = element.origin_attributes.find((a) => a.dimension_uri_key === key);
  return attr?.dimension_uri_value ?? 0;
}

function buildGeometry(element: SceneElement): THREE.BufferGeometry {
  const typeAttr = element.fixed_attributes.find((a) => a.attribute_uri_key === 'geometry.type');
  const type = typeAttr?.attribute_value;
  if (type === 'sphere') {
    return new THREE.SphereGeometry(getParam(element, 'geometry.radius'), 32, 16);
  }
  if (type === 'cylinder') {
    const r = getParam(element, 'geometry.radius');
    return new THREE.CylinderGeometry(r, r, getParam(element, 'geometry.height'), 32);
  }
  return new THREE.BoxGeometry(
    getParam(element, 'geometry.width'),
    getParam(element, 'geometry.height'),
    getParam(element, 'geometry.depth'),
  );
}

function syncElement(element: SceneElement, sceneManager: SceneManager): void {
  const mesh = new THREE.Mesh(buildGeometry(element), new THREE.MeshStandardMaterial());
  mesh.position.set(
    getOrigin(element, 'position.x'),
    getOrigin(element, 'position.y'),
    getOrigin(element, 'position.z'),
  );
  sceneManager.addObject(element.id, mesh);
  for (const child of element.child_elements) {
    syncElement(child, sceneManager);
  }
}

export function createElementRenderer(sceneManager: SceneManager): ElementRendererApi {
  const renderedIds = new Set<string>();
  return {
    sync(data: ElementStoreData): void {
      const newIds = collectIds(data.elements);
      for (const id of renderedIds) {
        if (!newIds.has(id)) {
          sceneManager.removeObject(id);
        }
      }
      for (const el of data.elements) {
        syncElement(el, sceneManager);
      }
      renderedIds.clear();
      for (const id of newIds) {
        renderedIds.add(id);
      }
    },
  };
}
