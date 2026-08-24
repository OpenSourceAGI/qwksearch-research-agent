/**
 * Pure helpers for rendering `chrome.history.HistoryItem`-shaped objects in
 * the side panel's History tab, kept free of the `chrome` global so they're
 * directly unit-testable.
 */
export interface HistoryItemLike {
  title?: string
  url?: string
  lastVisitTime?: number
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

/** Extracts the hostname from a URL, falling back to the raw string if it doesn't parse. */
export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Returns the item's title, falling back to its URL's hostname when blank. */
export function titleOrHostname(item: HistoryItemLike): string {
  const title = item.title?.trim()
  if (title) return title
  return item.url ? hostnameFromUrl(item.url) : ""
}

/** Renders a short relative-time label for a history item's last visit. */
export function formatLastVisit(lastVisitTime: number | undefined, now: number): string {
  if (!lastVisitTime) return ""
  const elapsed = now - lastVisitTime
  if (elapsed < MINUTE_MS) return "Just now"
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`
  if (elapsed < WEEK_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`
  return new Date(lastVisitTime).toLocaleDateString()
}
