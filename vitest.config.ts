import { defineConfig } from 'vitest/config';

/**
 * Root Vitest project registry.
 *
 * Replaces the old `vitest.workspace.ts`: Vitest 4 dropped support for the
 * workspace file, so that config was silently ignored and a root `vitest run`
 * fell back to globbing every test file with no per-package settings.
 *
 * Each entry points at a package's own `vitest.config.*`, which owns its
 * environment, include globs and coverage scope. Packages that use a
 * different runner are intentionally absent and run from their own scripts:
 * `domain-rank` and `extract-pdf` (bun test), `extract-youtube` (jest) and
 * `language-model-training` (pytest).
 */
export default defineConfig({
  test: {
    projects: [
      'apps/qwk-vscode-ext',
      'apps/qwksearch-desktop',
      'apps/qwksearch-ext',
      'apps/qwksearch-web',
      'packages/chat-agent-toolkit',
      'packages/extract-pdf-docling',
      'packages/extract-webpage',
      'packages/html-renderer-api',
      'packages/notebooklm-api-client',
      'packages/qwksearch-api-client',
      'packages/qwksearch-mcp-server',
      'packages/react-weather-forecast',
      'packages/reason-editor',
      'packages/render-url-to-html/scraper-jsdom',
      'packages/render-url-to-html/scraper-puppeteer',
      'packages/research-agent-ui',
      'packages/search-web-api',
      'packages/shadcn-app-dock',
      'packages/shadcn-settings',
      'packages/trending-news-api',
      'packages/use-voice-control',
      'packages/write-language',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Reported per package by each project's own `include`; anything not
      // claimed by a project is build output or config and stays out.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.output/**',
        '**/.wxt/**',
        '**/.svelte-kit/**',
        '**/coverage/**',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
});
