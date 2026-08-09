import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirrors the `@` alias in vite.config.ts; without it the untested utils
    // that import through `@/…` cannot be transformed for the coverage report.
    alias: [{ find: '@', replacement: path.resolve(import.meta.dirname, 'src') }],
  },
  test: {
    globals: true,
    // The utilities under test touch localStorage, navigator and Blob/File.
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Scoped to the framework-agnostic helpers. The Tiptap extensions and
      // React views need a full editor instance and are not unit-testable here.
      include: ['src/utils/**/*.ts'],
      exclude: ['node_modules/**', 'dist/**', 'src/**/*.d.ts', '**/*.test.ts'],
    },
  },
});
