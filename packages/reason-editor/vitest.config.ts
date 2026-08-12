import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirrors the `@` alias in vite.config.ts; without it the untested utils
    // that import through `@/…` cannot be transformed for the coverage report.
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      // `react-tweet`'s published ESM imports CSS modules, which Node cannot
      // load once Vitest externalizes the package. It reaches the module graph
      // through both this package's Twitter extension and Novel's own bundle,
      // and nothing under test renders a tweet, so it is stubbed out.
      // Third-party ESM (e.g. `@platejs/math`) imports stylesheets as a side
      // effect; Node cannot load a `.css` specifier once Vitest externalizes
      // the package, and nothing under test renders styled output.
      {
        find: /^katex\/dist\/katex(\.min)?\.css$/,
        replacement: path.resolve(import.meta.dirname, 'test/helpers/empty-module.ts'),
      },
      {
        find: /^react-tweet$/,
        replacement: path.resolve(import.meta.dirname, 'test/helpers/react-tweet-stub.tsx'),
      },
    ],
  },
  css: {
    // Components under test (the Novel editor shell, RichTextProvider) import
    // `src/styles/index.scss`. An inline postcss config stops Vite from
    // discovering the repo's `postcss.config.js`, whose `tailwindcss/nesting`
    // entry no longer resolves under Tailwind v4. Vitest does not apply the
    // resulting CSS anyway (`test.css` is off), so an empty plugin list is
    // enough to let the import through.
    postcss: { plugins: [] },
  },
  test: {
    globals: true,
    server: {
      deps: {
        // Novel must go through Vite rather than Node's ESM loader: its
        // bundle imports `react-tweet`, whose published ESM imports CSS
        // modules that Node cannot load. Inlined, Vite resolves that import
        // through the `react-tweet` alias below instead.
        // Plate packages import stylesheets as a side effect; inlined, Vite
        // resolves those through the aliases above instead of Node's loader.
        inline: ['novel', 'react-tweet', /@platejs\//, /katex/],
      },
    },
    // The utilities under test touch localStorage, navigator and Blob/File.
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    // Keeps a destroyed editor's last ProseMirror flush from outliving its own
    // jsdom environment — see the file for the full story.
    setupFiles: ['./test/helpers/vitest.setup.ts'],
    testTimeout: 20000,
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
