// Manages a single offscreen document used to scrape page HTML invisibly
// (no visible tab or window is ever created).
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html"

interface ScrapeResult {
  success: boolean
  html?: string
  error?: string
}

let creatingOffscreenDocument: Promise<void> | null = null

async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  })
  return contexts.length > 0
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return

  // Chrome only allows one in-flight createDocument() call at a time,
  // so concurrent extractURL requests share this promise instead of racing.
  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: "Fetch and parse remote page HTML to extract article content invisibly."
      })
      .finally(() => {
        creatingOffscreenDocument = null
      })
  }

  await creatingOffscreenDocument
}

export async function scrapeURLViaOffscreen(url: string): Promise<ScrapeResult> {
  await ensureOffscreenDocument()

  return chrome.runtime.sendMessage({
    target: "offscreen",
    type: "scrapeURL",
    url
  })
}
