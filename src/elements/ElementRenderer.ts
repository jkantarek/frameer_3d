import * as THREE from 'three';
import type { SceneManager } from '../scene/SceneManager.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';
import { createSelectionHighlight } from './SelectionHighlight.js';
import type { SelectionHighlightApi } from './SelectionHighlight.js';

export interface ElementRendererApi {
  sync(data: ElementStoreData): void;
  setSelected(id: string | undefined): void;
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

function getRotation(element: SceneElement, key: string): number {
  const attr = element.rotation_attributes.find((a) => a.dimension_uri_key === key);
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
  if (type === 'plane') {
    return new THREE.PlaneGeometry(
      getParam(element, 'geometry.width'),
      getParam(element, 'geometry.height'),
    );
  }
  return new THREE.BoxGeometry(
    getParam(element, 'geometry.width'),
    getParam(element, 'geometry.height'),
    getParam(element, 'geometry.depth'),
  );
}

function getColor(element: SceneElement): string | undefined {
  return element.parametric_attributes.find((a) => a.attribute_uri_key === 'material.color')
    ?.attribute_value;
}

function syncElement(element: SceneElement, sceneManager: SceneManager): void {
  const typeAttr = element.fixed_attributes.find((a) => a.attribute_uri_key === 'geometry.type');
  const isPlane = typeAttr?.attribute_value === 'plane';
  const color = getColor(element);
  const matOptions: THREE.MeshStandardMaterialParameters = color !== undefined ? { color } : {};
  if (isPlane) matOptions.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(buildGeometry(element), new THREE.MeshStandardMaterial(matOptions));
  mesh.position.set(
    getOrigin(element, 'position.x'),
    getOrigin(element, 'position.y'),
    getOrigin(element, 'position.z'),
  );
  mesh.rotation.set(
    getRotation(element, 'rotation.x'),
    getRotation(element, 'rotation.y'),
    getRotation(element, 'rotation.z'),
  );
  sceneManager.addObject(element.id, mesh);
  for (const child of element.child_elements) {
    syncElement(child, sceneManager);
  }
}

export function createElementRenderer(sceneManager: SceneManager): ElementRendererApi {
  const renderedIds = new Set<string>();
  const highlight: SelectionHighlightApi = createSelectionHighlight();
  let currentSelectedId: string | undefined;

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
    setSelected(id: string | undefined): void {
      if (currentSelectedId !== undefined) {
        highlight.clear(sceneManager, currentSelectedId);
      }
      currentSelectedId = id;
      if (id !== undefined) {
        const mesh = sceneManager.getObject(id);
        if (mesh instanceof THREE.Mesh) highlight.attach(mesh as THREE.Mesh);
      }
    },
  };
}
