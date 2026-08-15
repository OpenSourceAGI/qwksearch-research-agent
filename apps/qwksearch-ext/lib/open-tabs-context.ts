/**
 * Pure helpers for turning the user's currently open browser tabs into a
 * chat message, kept free of the `chrome` global so they're directly
 * unit-testable.
 */
import { hostnameFromUrl } from "./history"

export interface OpenTabLike {
  title?: string
  url?: string
}

const CONTEXTABLE_URL_PATTERN = /^https?:\/\//i

/** True when a tab has a real http(s) URL (excludes chrome://, about:, etc). */
export function isContextableTab(tab: OpenTabLike): boolean {
  return !!tab.url && CONTEXTABLE_URL_PATTERN.test(tab.url)
}

/**
 * Formats the user's open tabs as a chat message, or `undefined` when none
 * of them are contextable.
 */
export function formatOpenTabsMessage(tabs: OpenTabLike[]): string | undefined {
  const contextable = tabs.filter(isContextableTab)
  if (contextable.length === 0) return undefined

  const lines = contextable.map((tab, index) => {
    const title = tab.title?.trim() || hostnameFromUrl(tab.url!)
    return `${index + 1}. ${title} — ${tab.url}`
  })

  return [
    "Here are my currently open browser tabs:",
    ...lines,
    "",
    "Please use these as context for my next questions.",
  ].join("\n")
}
