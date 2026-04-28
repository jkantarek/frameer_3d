import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    exclude: ['opencascade.js'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer / WASM threading
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
});
