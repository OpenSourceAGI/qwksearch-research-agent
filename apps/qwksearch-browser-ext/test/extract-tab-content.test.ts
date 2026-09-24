import { afterEach, describe, expect, it, vi } from "vitest"
import extractTabContent from "../lib/extract-tab-content"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("extractTabContent", () => {
  it("returns the extracted text on success", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: "Page body text" }])
    vi.stubGlobal("chrome", { scripting: { executeScript } })

    const content = await extractTabContent(42)

    expect(content).toBe("Page body text")
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42 } })
    )
  })

  it("returns undefined when the injection result has no result", async () => {
    const executeScript = vi.fn().mockResolvedValue([{}])
    vi.stubGlobal("chrome", { scripting: { executeScript } })

    expect(await extractTabContent(1)).toBeUndefined()
  })

  it("returns undefined when there are no injection results", async () => {
    const executeScript = vi.fn().mockResolvedValue([])
    vi.stubGlobal("chrome", { scripting: { executeScript } })

    expect(await extractTabContent(1)).toBeUndefined()
  })

  it("returns undefined when executeScript rejects (e.g. a restricted page)", async () => {
    const executeScript = vi.fn().mockRejectedValue(new Error("Cannot access contents"))
    vi.stubGlobal("chrome", { scripting: { executeScript } })

    expect(await extractTabContent(1)).toBeUndefined()
  })
})
