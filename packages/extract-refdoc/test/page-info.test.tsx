// @vitest-environment jsdom
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import { getTextMetrics } from "paper-metrics"
import { PageInfoButton } from "../runtime/page-info"
import { refdocPageInfo } from "../src/page-info"

const SAMPLE =
  "Playing games has always been thought to be important to the development of well-balanced and creative children; however, what part, if any, they should play in the lives of adults has never been researched that deeply. I believe that playing games is every bit as important for adults as for children. Not only is taking time out to play games with our children and other adults valuable to building interpersonal relationships but is also a wonderful way to release built up tension."

const PAGE = `
  <div class="refdoc-toolbar"><button>Voice</button></div>
  <div class="ptw-content">
    <h2 id="s-intro">Introduction</h2>
    <figure><img src="x.png" alt=""><figcaption>Figure 1: A chart.</figcaption></figure>
    <ol class="ptw-paragraphs">
      <li><p>${SAMPLE} As shown <a class="refdoc-cite" href="#ref-1">1</a>, <mark class="debate-hl">play matters</mark>.</p></li>
      <li><p>Smith (2004) found <mark class="debate-hl">the same</mark> in Dr. Lee's 3.5-year study <a class="refdoc-cite" href="#ref-2">2</a>.</p></li>
    </ol>
    <img src="inline.png" alt="">
  </div>`

afterEach(() => {
  document.body.innerHTML = ""
})

describe("refdocPageInfo", () => {
  it("counts the page structure from the DOM and the text through paper-metrics", () => {
    document.body.innerHTML = PAGE
    const { stats, metrics, showHighlights } = refdocPageInfo(document.querySelector(".ptw-content")!)
    expect(stats).toMatchObject({ paragraphs: 2, figures: 2, citations: 3, highlights: 2, sentences: 5 })
    expect(showHighlights).toBe(true)
    expect(metrics.sentences).toBe(5)
    expect(stats.words).toBeGreaterThan(metrics.words)
    expect(metrics.readabilityScore).not.toBeNull()
  })

  it("scores only the running prose, not headings, captions or citation numbers", () => {
    document.body.innerHTML = `<div class="ptw-content"><h2>A Heading</h2><figure><figcaption>Caption text.</figcaption></figure><p>${SAMPLE}<a class="refdoc-cite">7</a></p></div>`
    const { metrics, stats } = refdocPageInfo(document.querySelector(".ptw-content")!)
    expect(metrics).toEqual(getTextMetrics(SAMPLE))
    expect(stats.words).toBe(getTextMetrics(SAMPLE).words + 4)
  })

  it("handles an empty page", () => {
    document.body.innerHTML = `<div class="ptw-content"></div>`
    const { stats, metrics, showHighlights } = refdocPageInfo(document.querySelector(".ptw-content")!)
    expect(stats).toMatchObject({ words: 0, readingMinutes: 0, sentences: 0, paragraphs: 0 })
    expect(metrics.readabilityScore).toBeNull()
    expect(showHighlights).toBe(false)
  })
})

describe("PageInfoButton", () => {
  it("opens a Page stats popover with a Sentences row, the readability bar and the grade levels", async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    document.body.innerHTML = `${PAGE}<div id="mount"></div>`
    const root = createRoot(document.getElementById("mount")!)
    await act(async () => {
      root.render(createElement(PageInfoButton, { getContent: () => document.querySelector(".ptw-content"), lastUpdated: "2026-11-26T12:00:00Z" }))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await act(async () => {
      ;(document.querySelector(".refdoc-info button") as HTMLButtonElement).click()
    })

    const dialog = document.querySelector('[role="dialog"][aria-label="Page stats"]')!
    const rows = Array.from(dialog.querySelectorAll(".refdoc-info-row")).map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent])
    expect(rows.map(([label]) => label)).toEqual(["Words", "Reading time", "Characters", "Sentences", "Paragraphs", "Figures", "Citations", "Highlights", "Last updated"])
    expect(rows.find(([label]) => label === "Sentences")![1]).toBe("5")
    expect(rows.find(([label]) => label === "Last updated")![1]).toBe("Nov 26, 2026")
    expect(dialog.querySelectorAll(".refdoc-info-row svg").length).toBe(rows.length)

    const bar = dialog.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute("aria-valuenow")).toMatch(/^\d+$/)
    expect(dialog.textContent).toMatch(/Readability\d+\/100 (Difficult|Fairly Difficult|Standard)/)
    const grades = Array.from(dialog.querySelectorAll(".refdoc-info-grades dt")).map((dt) => dt.textContent)
    expect(grades).toEqual([
      "Flesch Reading Ease",
      "Flesch-Kincaid Grade",
      "Gunning Fog",
      "SMOG Index",
      "Automated Readability Index",
      "Coleman-Liau Index",
      "Linsear Write",
      "Text standard (grade)",
    ])
    expect(dialog.textContent).not.toContain("NaN")

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    root.unmount()
  })
})
