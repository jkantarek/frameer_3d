import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneRenderer } from '../scene/SceneRenderer.js';
import { SceneManager } from '../scene/SceneManager.js';

export interface ViewportApi {
  getCamera(): THREE.PerspectiveCamera;
  getSceneManager(): SceneManager;
  dispose(): void;
}

export function createViewport(
  canvas: HTMLCanvasElement,
  rendererOverride?: SceneRenderer,
): ViewportApi {
  /* v8 ignore start */
  const renderer: SceneRenderer =
    rendererOverride ??
    ((): THREE.WebGLRenderer => {
      const r = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      r.setPixelRatio(window.devicePixelRatio);
      return r;
    })();
  /* v8 ignore stop */

  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
  camera.position.set(3, 3, 5);
  camera.lookAt(0, 0, 0);
  const sceneManager = new SceneManager(renderer, camera);
  const controls = new OrbitControls(camera, canvas);

  canvas.role = 'img';
  canvas.setAttribute('aria-label', '3D viewport');

  let rafId = 0;
  let paused = false;

  function loop(): void {
    if (!paused) sceneManager.renderFrame();
    rafId = requestAnimationFrame(loop);
  }

  function onVisibilityChange(): void {
    paused = document.visibilityState === 'hidden';
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  rafId = requestAnimationFrame(loop);

  const container = canvas.parentElement ?? canvas;
  const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    const entry = entries[0];
    if (entry === undefined) return;
    const { width, height } = entry.contentRect;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  function dispose(): void {
    cancelAnimationFrame(rafId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    resizeObserver.disconnect();
    controls.dispose();
  }

  return {
    getCamera(): THREE.PerspectiveCamera {
      return camera;
    },
    getSceneManager(): SceneManager {
      return sceneManager;
    },
    dispose,
  };
}
