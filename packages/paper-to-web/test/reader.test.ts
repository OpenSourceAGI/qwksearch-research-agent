// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { paperToHtml, renderPaperReader } from "../src/html"
import { mountPaperReader } from "../src/reader-runtime"
import { PaperReader } from "../src/widget"
import type { Paper } from "../src/types"

const paper: Paper = {
  title: "Reader Test",
  abstract: "An ==abstract claim== here.",
  sections: [
    {
      title: "First",
      figure: { src: "https://i.imgur.com/x.png", caption: "A figure" },
      summary: [{ label: "Point", text: "Summary text." }],
      paragraphs: ["Before ==the marked words== after ==and more==.", "### Sub", "No marks in this one."],
    },
  ],
  references: ["Ref one."],
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = renderPaperReader(paper)
})

describe("reader runtime", () => {
  it("toggles underlining and reader mode, remembering the choice", () => {
    const root = document.querySelector(".ptw-paper")!
    const handle = mountPaperReader(root)
    expect(root.getAttribute("data-underline")).toBe("on")
    ;(root.querySelector('[data-ptw="underline"]') as HTMLButtonElement).click()
    expect(root.getAttribute("data-underline")).toBe("off")
    expect(root.querySelector('[data-ptw="underline"] [data-ptw-label]')!.textContent).toBe("Underlining off")
    ;(root.querySelector('[data-ptw="reader"]') as HTMLButtonElement).click()
    expect(root.getAttribute("data-reader")).toBe("on")
    handle.destroy()
    document.body.innerHTML = renderPaperReader(paper)
    mountPaperReader(document.querySelector(".ptw-paper")!)
    expect(document.querySelector(".ptw-paper")!.getAttribute("data-underline")).toBe("off")
    expect(document.querySelector(".ptw-paper")!.getAttribute("data-reader")).toBe("on")
  })

  it("Voice reads only underlined words with Underlining on, and skips figures", () => {
    const handle = mountPaperReader(document.querySelector(".ptw-paper")!)
    expect(handle.collectBlocks(true).map((b) => b.text)).toEqual(["abstract claim", "the marked words and more"])
    const all = handle.collectBlocks(false).map((b) => b.text)
    expect(all).toContain("Before the marked words after and more.")
    expect(all).toContain("Point: Summary text.")
    expect(all.join(" ")).not.toContain("A figure")
  })

  it("Voice speaks each block in order through a custom speaker and stops on Escape", async () => {
    const spoken: string[] = []
    const speak = vi.fn(async (text: string, _rate: number) => {
      spoken.push(text)
    })
    const root = document.querySelector(".ptw-paper")!
    const handle = mountPaperReader(root, { speak, cancelSpeech: () => {} })
    ;(root.querySelector('[data-ptw="voice"]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(spoken).toEqual(["abstract claim", "the marked words and more"]))
    expect(speak.mock.calls[0][1]).toBe(1.2)
    ;(root.querySelector('[data-ptw="voice"]') as HTMLButtonElement).click()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(root.querySelector("[data-voice-reading]")).toBeNull()
    handle.destroy()
  })
})

describe("paperToHtml", () => {
  it("is one self-contained page with the runtime inlined", () => {
    const html = paperToHtml(paper)
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain("<title>Reader Test</title>")
    expect(html).toContain("function mountPaperReader(root, options)")
    expect(html).toContain('<mark class="debate-hl">the marked words</mark>')
    expect(html).toContain("<figcaption>Figure 1: A figure</figcaption>")
    expect(html).toContain('<ol class="ptw-paragraphs" start="2">')
    expect(html).not.toMatch(/<script[^>]+src=/)
  })
})

describe("<PaperReader>", () => {
  it("renders the toolbar and the paper", () => {
    const html = renderToStaticMarkup(createElement(PaperReader, { paper }))
    expect(html).toContain("Underlining on")
    expect(html).toContain("Reader Test")
    expect(html).toContain(".ptw-paper")
  })
})
