import './style.css';

export function main(): void {
  const canvas = document.getElementById('viewport');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No canvas element with id="viewport" found');
  }
  // TODO: initialise WebGL/WASM renderer
  console.warn('Frameer 3D renderer not yet initialised', canvas);
}

main();
