import * as THREE from 'three';
import type { ColorRepresentation, PerspectiveCamera } from 'three';
import type { SceneRenderer } from './SceneRenderer.js';

export class SceneManager {
  private readonly scene: THREE.Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: SceneRenderer;
  private readonly objects = new Map<string, THREE.Object3D>();

  constructor(renderer: SceneRenderer, camera: PerspectiveCamera) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = new THREE.Scene();
  }

  renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  getCamera(): PerspectiveCamera {
    return this.camera;
  }

  setBackground(color: ColorRepresentation): void {
    this.scene.background = new THREE.Color(color);
  }

  addObject(id: string, object: THREE.Object3D): void {
    if (id === '') throw new Error('SceneManager: id must not be empty');
    const existing = this.objects.get(id);
    if (existing !== undefined) {
      this.scene.remove(existing);
    }
    this.objects.set(id, object);
    this.scene.add(object);
  }

  removeObject(id: string): void {
    const existing = this.objects.get(id);
    if (existing === undefined) return;
    this.scene.remove(existing);
    this.objects.delete(id);
  }

  getObject(id: string): THREE.Object3D | undefined {
    return this.objects.get(id);
  }
}
