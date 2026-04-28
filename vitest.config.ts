import { defineConfig } from 'vitest/config';
import { doctest } from 'vite-plugin-doctest';

export default defineConfig({
  plugins: [doctest()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Standard unit/integration tests
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // In-source doctests embedded in @example @import.meta.vitest blocks
    includeSource: ['src/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/main.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
