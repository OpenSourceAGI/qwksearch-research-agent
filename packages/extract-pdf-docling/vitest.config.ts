import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // test/manual-client-example.js is a hand-run script against a live
    // server, not a suite, so the glob deliberately only picks up *.test.js.
    include: ['test/**/*.test.js', 'test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/schemas.js', 'src/routes.js'],
      exclude: ['node_modules/**', '**/*.test.js'],
    },
  },
});
