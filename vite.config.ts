import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer / WASM threading
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
