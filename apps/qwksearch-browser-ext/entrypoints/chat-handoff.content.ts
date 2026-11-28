import { ChatHandoffController } from "@/content/chat-handoff/inject"
import { completePendingHandoff } from "@/content/chat-handoff/destination"
import { CHAT_MATCHES } from "@/content/chat-handoff/providers"
import { Toast } from "@/content/chat-handoff/ui"

// Only the chat sites listed in content/chat-handoff/providers.ts, so the
// "Ask AI" button and its DOM observer never run on other pages.
export default defineContentScript({
  matches: CHAT_MATCHES,
  runAt: "document_idle",
  main() {
    if (window.top !== window) return
    const toast = new Toast(document)
    ChatHandoffController.forDocument(document, toast)?.start()
    completePendingHandoff(document, toast).catch((error) => console.error(error))
  }
})
