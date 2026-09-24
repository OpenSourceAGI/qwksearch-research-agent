// Offscreen document: fetches a URL's HTML and parses it with DOMParser.
// Runs invisibly (no tab, no window) — this is why it only sees the
// server-rendered HTML, not DOM produced by the target page's own JS.
interface ScrapeMessage {
  target: "offscreen"
  type: "scrapeURL"
  url: string
}

interface ScrapeResult {
  success: boolean
  html?: string
  error?: string
}

chrome.runtime.onMessage.addListener((message: ScrapeMessage, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message.type !== "scrapeURL") return

  scrapeURL(message.url)
    .then((html) => sendResponse({ success: true, html } satisfies ScrapeResult))
    .catch((error) =>
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      } satisfies ScrapeResult)
    )

  return true // keep the message channel open for the async response
})

async function scrapeURL(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.documentElement.outerHTML
}
