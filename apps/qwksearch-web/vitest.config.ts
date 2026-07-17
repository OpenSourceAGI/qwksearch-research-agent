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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'chat-agent-toolkit': resolve(__dirname, '../../packages/agent-toolkit/src'),
      'extract-webpage': resolve(__dirname, '../../packages/extract-webpage/src'),
      'grab-url': resolve(__dirname, './lib/api/grab.ts'),
    },
  },
})
