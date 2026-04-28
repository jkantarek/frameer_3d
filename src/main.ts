export function main(): void {
  const canvas = document.getElementById('app');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No canvas element with id="app" found');
  }
  // TODO: initialise WebGL/WASM renderer
  console.warn('Frameer 3D renderer not yet initialised', canvas);
}

main();
