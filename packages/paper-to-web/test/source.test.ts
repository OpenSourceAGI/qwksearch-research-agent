import { describe, expect, it, vi } from "vitest"
import { isLinkInput, isPdfBuffer, loadPaper, normalizeSourceUrl, type Extractor } from "../src/source"

const ARTICLE = `<h1>Title</h1><h2>One</h2><p>${"Evidence matters in every round of debate. ".repeat(8)}</p><h2>Two</h2><p>${"Judges weigh the comparison. ".repeat(8)}</p>`

describe("normalizeSourceUrl", () => {
  it("sends arXiv links to the HTML render first, then the PDF", () => {
    expect(normalizeSourceUrl("https://arxiv.org/abs/1706.03762")).toEqual(["https://arxiv.org/html/1706.03762", "https://arxiv.org/pdf/1706.03762"])
    expect(normalizeSourceUrl("arxiv.org/pdf/1706.03762v7.pdf")).toEqual(["https://arxiv.org/html/1706.03762v7", "https://arxiv.org/pdf/1706.03762v7"])
  })

  it("resolves DOIs and passes other links through", () => {
    expect(normalizeSourceUrl("10.5281/zenodo.20320435")).toEqual(["https://doi.org/10.5281/zenodo.20320435"])
    expect(normalizeSourceUrl("doi:10.1000/xyz")).toEqual(["https://doi.org/10.1000/xyz"])
    expect(normalizeSourceUrl("https://archive.org/details/foo")).toEqual(["https://archive.org/details/foo"])
  })
})

describe("isLinkInput / isPdfBuffer", () => {
  it("tells links from pasted text", () => {
    expect(isLinkInput("https://example.org/a.pdf")).toBe(true)
    expect(isLinkInput("example.org/paper")).toBe(true)
    expect(isLinkInput("10.1000/xyz")).toBe(true)
    expect(isLinkInput("The status quo fails")).toBe(false)
  })

  it("detects PDF bytes", () => {
    expect(isPdfBuffer(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true)
    expect(isPdfBuffer(new TextEncoder().encode("PK\u0003\u0004"))).toBe(false)
  })
})

describe("loadPaper", () => {
  it("extracts a link and carries the citation fields", async () => {
    const extract: Extractor = vi.fn(async () => ({ html: ARTICLE, author: "Doe, J.", cite: "<b>Doe</b> 2024. Title. Example Press." }))
    const paper = await loadPaper("https://example.org/a", { extract })
    expect(paper.title).toBe("Title")
    expect(paper.author).toBe("Doe, J.")
    expect(paper.cite).toBe("Doe 2024. Title. Example Press.")
    expect(paper.sourceUrl).toBe("https://example.org/a")
    expect(paper.sections.map((s) => s.title)).toEqual(["One", "Two"])
  })

  it("falls back to the next URL when the first has no article", async () => {
    const extract: Extractor = vi.fn(async (input) => (String(input).includes("/html/") ? { error: 404 } : { html: ARTICLE }))
    await loadPaper("https://arxiv.org/abs/1", { extract })
    expect(vi.mocked(extract).mock.calls.map(([url]) => url)).toEqual(["https://arxiv.org/html/1", "https://arxiv.org/pdf/1"])
  })

  it("reports every URL it tried when none works", async () => {
    const extract: Extractor = async () => ({ error: "blocked" })
    await expect(loadPaper("https://arxiv.org/abs/1", { extract })).rejects.toThrow(/arxiv.org\/html\/1: blocked; https:\/\/arxiv.org\/pdf\/1: blocked/)
  })

  it("extracts file bytes, using the file name as a title fallback", async () => {
    const extract: Extractor = vi.fn(async (_input, options) => ({ html: options.isPdf ? ARTICLE.replace("<h1>Title</h1>", "") : "" }))
    const paper = await loadPaper(new TextEncoder().encode("%PDF-1.4"), { extract, fileName: "my-paper.pdf" })
    expect(paper.title).toBe("my-paper")
  })

  it("reads pasted text without calling the extractor", async () => {
    const extract = vi.fn()
    const paper = await loadPaper("## A\n\nSome argument text here.", { extract })
    expect(extract).not.toHaveBeenCalled()
    expect(paper.sections[0].title).toBe("A")
  })
})
