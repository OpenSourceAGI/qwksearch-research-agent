import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js', 'test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // The Tauri shell is a thin SvelteKit wrapper: the only JS outside the
      // .svelte views and the Rust side is the route + adapter configuration.
      include: ['src/routes/**/*.js', 'svelte.config.js'],
      exclude: ['node_modules/**', 'build/**', '.svelte-kit/**', 'src-tauri/**'],
    },
  },
});
