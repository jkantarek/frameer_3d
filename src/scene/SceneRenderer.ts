import type { PerspectiveCamera, Scene } from 'three';

/**
 * @example
 * ```ts @import.meta.vitest
 * const renderer: SceneRenderer = {
 *   render: (_scene, _camera) => {},
 *   setSize: (_w, _h) => {},
 * };
 * expect(typeof renderer.render).toBe('function');
 * expect(typeof renderer.setSize).toBe('function');
 * ```
 */
export interface SceneRenderer {
  render(scene: Scene, camera: PerspectiveCamera): void;
  setSize(width: number, height: number): void;
}
