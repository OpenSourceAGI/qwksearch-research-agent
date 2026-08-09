import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Both of these only resolve inside workerd; test/stubs supplies the
      // small slice of their surface that src/index.ts actually touches.
      'cloudflare:workers': resolve(dir, 'test/stubs/cloudflare-workers.ts'),
      '@cloudflare/puppeteer': resolve(dir, 'test/stubs/puppeteer.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.ts'],
    },
  },
});
