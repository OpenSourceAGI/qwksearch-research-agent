import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/__tests__/**/*.test.ts', 'app/**/__tests__/**/*.test.ts'],
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
      'research-agent-ui': resolve(__dirname, '../../packages/research-agent-ui/src/index.ts'),
      'domain-rank': resolve(__dirname, '../../packages/domain-rank'),
      'search-web-api': resolve(__dirname, '../../packages/search-web-api/src'),
      'write-language': resolve(__dirname, '../../packages/write-language/src'),
      'chat-agent-toolkit/models/registry': resolve(__dirname, '../../packages/chat-agent-toolkit/src/models/registry.ts'),
    },
  },
})
