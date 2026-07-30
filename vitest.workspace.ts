import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/qwksearch-web',
  'packages/chat-agent-toolkit',
  'packages/extract-webpage',
  'packages/qwksearch-api-client',
  'packages/render-url-to-html-cloudflare',
  'packages/research-agent-ui',
  'packages/search-web-api',
  'packages/shadcn-app-dock',
  'packages/shadcn-settings',
  'packages/write-language',
])
