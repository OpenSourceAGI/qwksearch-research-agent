/**
 * Pure helpers for rendering `chrome.downloads.DownloadItem`-shaped objects
 * in the side panel's Downloads tab, kept free of the `chrome` global so
 * they're directly unit-testable.
 */
export interface DownloadItemLike {
  filename: string
  state: "in_progress" | "interrupted" | "complete"
  paused?: boolean
  bytesReceived?: number
  totalBytes?: number
  error?: string
}

/**
 * Extracts the last path segment from an absolute local path, handling both
 * `/`- and `\`-separated paths (Chrome reports Windows-style paths on
 * Windows regardless of the host OS running these tests).
 */
export function basenameFromPath(path: string): string {
  if (!path) return ""
  const segments = path.replace(/\\/g, "/").split("/")
  return segments[segments.length - 1] || path
}

/** Renders a short human-readable status label for a download item. */
export function formatDownloadStatus(item: DownloadItemLike): string {
  if (item.state === "interrupted") {
    return item.error ? `Failed: ${item.error}` : "Failed"
  }

  if (item.state === "complete") {
    return "Complete"
  }

  if (item.paused) return "Paused"

  const total = item.totalBytes ?? -1
  const received = item.bytesReceived ?? 0
  if (total > 0) {
    const pct = Math.min(100, Math.round((received / total) * 100))
    return `Downloading ${pct}%`
  }

  return "Downloading"
}
