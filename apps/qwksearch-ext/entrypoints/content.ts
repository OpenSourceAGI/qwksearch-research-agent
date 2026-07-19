import { setupMessageApi } from "@/content/message-api"
import { setupReadModeView } from "@/content/read-mode-view"
import { setupShortcutSearch } from "@/content/shortcut-search"

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    setupMessageApi()
    setupReadModeView()
    setupShortcutSearch()
  },
})
