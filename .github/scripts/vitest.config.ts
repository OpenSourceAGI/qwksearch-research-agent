import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // plain Node scripts run by CI, no DOM involved
    include: ['test/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['*.mjs'],
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
});
