/**
 * Pure helpers for turning the user's currently open browser tabs into a
 * chat message, kept free of the `chrome` global so they're directly
 * unit-testable.
 */
import { hostnameFromUrl } from "./history"

export interface OpenTabLike {
  title?: string
  url?: string
  content?: string
}

const CONTEXTABLE_URL_PATTERN = /^https?:\/\//i
export const MAX_TAB_CONTENT_CHARS = 2000

/** True when a tab has a real http(s) URL (excludes chrome://, about:, etc). */
export function isContextableTab(tab: OpenTabLike): boolean {
  return !!tab.url && CONTEXTABLE_URL_PATTERN.test(tab.url)
}

/**
 * Trims and truncates page content to a bounded length, so a chat message
 * built from many tabs' content stays a reasonable size. Appends an
 * ellipsis when truncation happens.
 */
export function truncateTabContent(content: string, maxChars: number = MAX_TAB_CONTENT_CHARS): string {
  const trimmed = content.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}…`
}

/**
 * Formats the user's open tabs as a chat message, or `undefined` when none
 * of them are contextable. When a tab has `content`, a truncated excerpt is
 * included indented under its title/URL line.
 */
export function formatOpenTabsMessage(tabs: OpenTabLike[]): string | undefined {
  const contextable = tabs.filter(isContextableTab)
  if (contextable.length === 0) return undefined

  const lines = contextable.flatMap((tab, index) => {
    const title = tab.title?.trim() || hostnameFromUrl(tab.url!)
    const header = `${index + 1}. ${title} — ${tab.url}`
    const content = tab.content?.trim()
    if (!content) return [header]
    return [header, `   ${truncateTabContent(content)}`]
  })

  return [
    "Here are my currently open browser tabs:",
    ...lines,
    "",
    "Please use these as context for my next questions.",
  ].join("\n")
}
