import { NextRequest, NextResponse } from "next/server"
import { JSDomScraper } from "../../../../src/scraper"

export async function POST(request: NextRequest) {
  try {
    const { url, customScript, timeout = 10000, waitUntil, delayAfterLoad = false } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const resolvedTimeout = Math.min(Math.max(Number(timeout) || 10000, 1000), 60000)

    const scraper = new JSDomScraper({ timeout: resolvedTimeout })

    // Build automation steps from waitUntil and delayAfterLoad options
    const automation: Array<{
      action: "click" | "type" | "waitFor"
      selector: string
      text?: string
      timeout?: number
    }> = []

    if (waitUntil && typeof waitUntil === "string" && waitUntil.trim()) {
      automation.push({
        action: "waitFor",
        selector: waitUntil.trim(),
        timeout: Math.min(resolvedTimeout, 15000),
      })
    }

    let result
    try {
      result = await scraper.scrape(url, {
        customScript: customScript || undefined,
        automation: automation.length > 0 ? automation : undefined,
      })
    } catch (err: unknown) {
      const msg = String(err)
      if (msg.includes("timed out") || msg.includes("AbortError")) {
        return NextResponse.json(
          { error: `Request timed out after ${resolvedTimeout / 1000}s` },
          { status: 408 }
        )
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Separate script errors from script results
    let scriptResult = result.scriptResult
    let scriptError: string | null = null
    if (scriptResult && typeof scriptResult === "object" && "error" in (scriptResult as Record<string, unknown>)) {
      scriptError = (scriptResult as { error: string }).error
      scriptResult = null
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      title: result.title,
      metaDescription: result.metaDescription,
      html: result.html,
      textContent: result.textContent,
      links: result.links,
      scriptResult,
      scriptError,
      waitUntilError: null,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
