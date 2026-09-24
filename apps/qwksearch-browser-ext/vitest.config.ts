import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app's tsconfig.json extends `.wxt/tsconfig.json`, which only exists
  // after `wxt prepare` has run. Supplying the compiler options inline keeps
  // the suite runnable straight after a plain `bun install --ignore-scripts`.
  oxc: {
    tsconfigRaw: {
      compilerOptions: {
        target: 'es2020',
        useDefineForClassFields: true,
        jsx: 'react-jsx',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    globals: true,
    // The modules under test manipulate DOM strings and page content.
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['lib/**/*.ts', 'content/**/*.ts'],
      exclude: [
        'node_modules/**',
        '.output/**',
        '.wxt/**',
        '**/*.d.ts',
        '**/*.test.ts',
        // These wire themselves into the live `chrome.*` extension APIs.
        'content/read-mode-view.ts',
        'content/shortcut-search.ts',
        'content/shortcut-search-web.ts',
      ],
    },
  },
});
