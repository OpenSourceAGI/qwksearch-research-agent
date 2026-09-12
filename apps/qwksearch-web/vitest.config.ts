import { defineConfig } from 'vitest/config'
import { helpDocsMdxPlugin } from 'user-help-docs/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // Same MDX pipeline the build uses, so `app/docs` tests see real page bodies.
  plugins: [helpDocsMdxPlugin()],
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/__tests__/**/*.test.ts', 'app/**/__tests__/**/*.test.ts'],
    // Breadcrumbs are on by default in the app (see lib/debug/ssr-trace.ts);
    // in a suite they are just noise between the assertions. The tracer's own
    // tests stub this back on.
    env: { QS_SSR_TRACE: 'off' },
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-report.junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'chat-agent-toolkit': resolve(__dirname, '../../packages/chat-agent-toolkit/src'),
      'extract-webpage': resolve(__dirname, '../../packages/extract-webpage/src'),
      'research-agent-ui/api': resolve(__dirname, '../../packages/research-agent-ui/src/api/index.ts'),
      'research-agent-ui/settings': resolve(__dirname, '../../packages/research-agent-ui/src/settings/index.ts'),
      'research-agent-ui/workspace': resolve(__dirname, '../../packages/research-agent-ui/src/workspace.ts'),
      'research-agent-ui': resolve(__dirname, '../../packages/research-agent-ui/src/index.ts'),
      'domain-rank': resolve(__dirname, '../../packages/domain-rank'),
      'search-web-api': resolve(__dirname, '../../packages/search-web-api/src'),
      // Subpath exports resolve through the package's built `dist`, which CI
      // does not build before running these tests — point them at the source.
      'trending-news-api/server': resolve(__dirname, '../../packages/trending-news-api/src/server/index.ts'),
      'write-language': resolve(__dirname, '../../packages/write-language/src'),
      'chat-agent-toolkit/models/registry': resolve(__dirname, '../../packages/chat-agent-toolkit/src/models/registry.ts'),
    },
  },
})
