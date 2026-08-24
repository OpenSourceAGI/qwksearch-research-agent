/**
 * @fileoverview Share-an-article decision logic, decoupled from the browser
 * Web Share/Clipboard APIs so it stays trivially testable.
 *
 * Prefers the OS-native share sheet (`navigator.share`) when the caller
 * provides it — that sheet already lists Mail and installed social apps as
 * targets on supporting browsers/devices. Falls back to copying the URL to
 * the clipboard when native sharing isn't available, or when it fails for a
 * reason other than the user dismissing the share sheet.
 */

export interface ShareableArticle {
  title?: string;
  text?: string;
  url: string;
}

export interface ShareArticleDeps {
  /** Bound `navigator.share`, or `undefined` when the API is unsupported. */
  share?: (data: ShareableArticle) => Promise<void>;
  /** Bound `navigator.clipboard.writeText`. */
  writeText: (text: string) => Promise<void>;
}

export type ShareArticleResult = "shared" | "copied" | "cancelled";

/** Whether an error represents the user dismissing the native share sheet. */
function isShareCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function shareArticle(
  article: ShareableArticle,
  deps: ShareArticleDeps,
): Promise<ShareArticleResult> {
  if (deps.share) {
    try {
      await deps.share(article);
      return "shared";
    } catch (error) {
      if (isShareCancellation(error)) return "cancelled";
      // Fall through to the clipboard fallback below.
    }
  }

  await deps.writeText(article.url);
  return "copied";
}
