import { defineConfig } from 'vitest/config';

import { helpDocsMdxPlugin } from './src/vite.ts';

export default defineConfig({
  // The docs are compiled by the bundler, not per request, so the suite has to
  // resolve `content/docs` the same way the host app's build does.
  plugins: [helpDocsMdxPlugin()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Compiling every page through MDX + Shiki is slower than a unit test.
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
});
