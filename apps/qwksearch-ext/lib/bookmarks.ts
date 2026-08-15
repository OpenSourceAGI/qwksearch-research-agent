/**
 * Pure helpers for rendering `chrome.bookmarks.BookmarkTreeNode`-shaped
 * objects in the side panel's Favorites tab, kept free of the `chrome`
 * global so they're directly unit-testable.
 */
export interface BookmarkNodeLike {
  title?: string
  url?: string
}

/** Extracts the hostname from a URL, falling back to the raw string if it doesn't parse. */
export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Returns the bookmark's title, falling back to its URL's hostname when blank. */
export function titleOrHostname(item: BookmarkNodeLike): string {
  const title = item.title?.trim()
  if (title) return title
  return item.url ? hostnameFromUrl(item.url) : ""
}

/** True for an actual bookmark (has a URL), false for a folder node. */
export function isBookmarkNode(node: BookmarkNodeLike): boolean {
  return !!node.url
}

/** Trims a proposed new bookmark title before saving via `chrome.bookmarks.update`. */
export function sanitizeBookmarkTitle(input: string): string {
  return input.trim()
}

/**
 * Trims a proposed new bookmark URL and validates it before saving via
 * `chrome.bookmarks.update`. Returns `null` when the trimmed result is empty
 * or doesn't parse as a URL (a bookmark must have a valid URL).
 */
export function sanitizeBookmarkUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return null
  }
}
