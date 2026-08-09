import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The extension host modules import the `vscode` module, which only
      // exists inside a running VS Code instance.
      vscode: resolve(import.meta.dirname, 'test/stubs/vscode.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // webview-ui-editor is a nested package with its own package.json and
      // its own dependencies (marked, turndown, tiptap); it is not part of the
      // root workspace, so its modules are not resolvable from here.
      include: ['src/**/*.ts', 'webview-ui/src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        // Activation and webview wiring need a live extension host.
        'src/extension.ts',
        'src/panel.ts',
        'src/reasonEditorProvider.ts',
        // React entry points and views.
        '**/main.tsx',
        '**/*.tsx',
      ],
    },
  },
});
