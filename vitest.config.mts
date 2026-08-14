import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/qwk-vscode-ext/webview-ui',
      'apps/qwksearch-web',
      'packages/chat-agent-toolkit',
      'packages/extract-webpage',
      'packages/html-renderer-api',
      'packages/qwksearch-api-client',
      'packages/react-reason-editor',
      'packages/research-agent-ui',
      'packages/search-web-api',
      'packages/shadcn-app-dock',
      'packages/shadcn-settings',
      'packages/write-language',
    ],
  },
})
