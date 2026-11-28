import {
  PENDING_TTL_MS,
  resolveOpenRequest,
  type ClaimResponse,
  type OpenResponse,
  type PendingHandoff
} from "@/content/chat-handoff/handoff"
import { getProvider } from "@/content/chat-handoff/providers"

const KEY_PREFIX = "chatHandoff:"
const memory = new Map<string, PendingHandoff>()

async function savePending(tabId: number, pending: PendingHandoff) {
  const key = KEY_PREFIX + tabId
  memory.set(key, pending)
  // Session storage survives the service worker being suspended but never touches disk.
  await chrome.storage.session?.set({ [key]: pending }).catch(() => undefined)
}

async function takePending(tabId: number): Promise<PendingHandoff | undefined> {
  const key = KEY_PREFIX + tabId
  let pending = memory.get(key)
  if (!pending && chrome.storage.session) {
    pending = (await chrome.storage.session.get(key).catch(() => ({})))[key]
  }
  memory.delete(key)
  await chrome.storage.session?.remove(key).catch(() => undefined)
  return pending
}

/**
 * Opens the chosen chat provider in a new tab and hands the transcript to
 * that tab's content script. The destination URL is always built here from
 * the provider registry, never taken from the page that asked.
 */
export function setupChatHandoff() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.type === "chatHandoff:open") {
      const resolved = resolveOpenRequest(request)
      if (!resolved || !sender.tab) {
        sendResponse({ ok: false, error: "Unknown provider or empty transcript" } satisfies OpenResponse)
        return
      }
      chrome.tabs
        .create({ url: resolved.plan.url, active: true, openerTabId: sender.tab.id })
        .then(async (tab) => {
          await savePending(tab.id!, resolved.pending)
          sendResponse({ ok: true, mode: resolved.plan.mode } satisfies OpenResponse)
        })
        .catch((error) => sendResponse({ ok: false, error: String(error) } satisfies OpenResponse))
      return true
    }

    if (request?.type === "chatHandoff:claim") {
      const tabId = sender.tab?.id
      const host = sender.url ? new URL(sender.url).hostname : ""
      if (tabId === undefined) {
        sendResponse({ pending: null } satisfies ClaimResponse)
        return
      }
      takePending(tabId).then((pending) => {
        const provider = pending ? getProvider(pending.providerId) : undefined
        const fresh = pending && Date.now() - pending.createdAt < PENDING_TTL_MS
        const onProvider = provider?.hosts.includes(host)
        sendResponse({
          pending: pending && fresh && onProvider
            ? { providerId: pending.providerId, mode: pending.mode, text: pending.text }
            : null
        } satisfies ClaimResponse)
      })
      return true
    }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    memory.delete(KEY_PREFIX + tabId)
    chrome.storage.session?.remove(KEY_PREFIX + tabId).catch(() => undefined)
  })
}
