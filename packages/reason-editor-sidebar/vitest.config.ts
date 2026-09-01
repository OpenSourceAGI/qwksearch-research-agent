import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(import.meta.dirname, 'src') }],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    testTimeout: 20000,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules/**', 'dist/**', 'src/**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});
