import * as THREE from 'three';
import './style.css';
import { createViewport } from './viewport/Viewport.js';
import { createControlPane } from './controls/ControlPane.js';
import { loadLayoutState } from './layout/LayoutState.js';
import { loadOcct } from './occt/OccKernel.js';

export function main(): void {
  const canvas = document.getElementById('viewport');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No canvas element with id="viewport" found');
  }
  const controlsContainer = document.getElementById('scene-controls');
  if (!(controlsContainer instanceof HTMLElement)) {
    throw new Error('No element with id="scene-controls" found');
  }

  const layoutState = loadLayoutState();

  const viewport = createViewport(canvas);
  const sceneManager = viewport.getSceneManager();
  sceneManager.setBackground('#1a1a2e');
  sceneManager.addObject('axes', new THREE.AxesHelper(2));

  createControlPane(controlsContainer, layoutState);

  void loadOcct().catch((err: unknown) => {
    console.warn('OCCT load failed:', err);
  });
}

main();
