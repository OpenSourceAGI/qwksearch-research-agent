/**
 * Extracts a tab's visible page text via `chrome.scripting.executeScript`,
 * mirroring the pattern already used by `TabSearch.tsx` for in-tab content
 * search. Kept as its own small module so the `chrome` call is mockable in
 * isolation, per this codebase's per-feature pure-helper-module convention.
 */
export default async function extractTabContent(tabId: number): Promise<string | undefined> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.body.innerText,
    })
    const content = results[0]?.result
    return typeof content === "string" ? content : undefined
  } catch {
    // Restricted pages (Chrome Web Store, other extensions' pages, etc.)
    // reject script injection — treat as "no content" rather than failing.
    return undefined
  }
}
