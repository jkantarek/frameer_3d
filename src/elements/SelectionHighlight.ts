import * as THREE from 'three';
import type { SceneManager } from '../scene/SceneManager.js';

const OUTLINE_NAME = '__selection-outline__';

export interface SelectionHighlightApi {
  attach(mesh: THREE.Mesh): void;
  detach(mesh: THREE.Mesh): void;
  clear(sceneManager: SceneManager, id: string): void;
}

export function createSelectionHighlight(): SelectionHighlightApi {
  function attach(mesh: THREE.Mesh): void {
    if (mesh.getObjectByName(OUTLINE_NAME)) return;
    const outline = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, side: THREE.BackSide }),
    );
    outline.name = OUTLINE_NAME;
    outline.scale.setScalar(1.015);
    mesh.add(outline);
  }

  function detach(mesh: THREE.Mesh): void {
    const child = mesh.getObjectByName(OUTLINE_NAME);
    if (child) mesh.remove(child);
  }

  function clear(sceneManager: SceneManager, id: string): void {
    const obj = sceneManager.getObject(id);
    if (obj instanceof THREE.Mesh) detach(obj as THREE.Mesh);
  }

  return { attach, detach, clear };
}
