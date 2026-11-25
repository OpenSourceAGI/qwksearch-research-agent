// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  linkCitations,
  paperToRefdoc,
  paperToRefdocDocument,
  parseRefdoc,
  readRefdocFromDocument,
  REFDOC_CDN,
  refdocFileName,
  renderRefdocHtml,
} from "../src/refdoc"
import type { Paper } from "../src/types"

const paper: Paper = {
  title: "Debate Is Testing",
  description: "Comparative testing already scrutinizes every assumption.",
  author: "A. Author",
  date: "2024",
  sourceUrl: "https://arxiv.org/abs/1234.5678",
  abstract: "We argue that ==testing is enough== [1].",
  keywords: ["debate", "critique"],
  sections: [
    {
      title: "Introduction",
      description: "Why the gateway framing fails.",
      summary: [{ label: "Claim", text: "Gateway framing is a mistake [2]." }],
      paragraphs: ["Debaters often treat ==critiques as a gateway== question [1, 2].", "### Scope", "Only policy rounds are studied."],
    },
    {
      title: "Method",
      part: "Evidence",
      summary: [],
      paragraphs: ["We coded ==four hundred rounds== [9]."],
    },
  ],
  references: ["Shanahan, William. 1993. *Kritik of Thinking*.", "Bodnick, Marc. 2023. High School Debate Is Broken."],
}

describe("paperToRefdoc", () => {
  const html = paperToRefdoc(paper)

  it("writes one HTML file that loads the runtime from the CDN", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true)
    expect(html).toContain(`<script defer src="${REFDOC_CDN}/refdoc.js"></script>`)
    expect(html).toContain(`<link rel="stylesheet" href="${REFDOC_CDN}/refdoc.css" />`)
    expect(html).toContain('<script type="application/refdoc+json" id="refdoc-meta">')
    expect(html).toContain("<title>Debate Is Testing</title>")
  })

  it("holds every page as plain HTML, readable without the runtime", () => {
    expect(html).toContain('<article id="overview" data-refdoc-page=""')
    expect(html).toContain('<article id="01-introduction" data-refdoc-page="01-introduction" data-title="1. Introduction"')
    expect(html).toContain('data-part="Evidence"')
    expect(html).toContain('<article id="references" data-refdoc-page="references"')
    expect(html).toContain('<mark class="debate-hl">critiques as a gateway</mark>')
  })

  it("reads back into the same pages, headings and metadata", () => {
    const doc = parseRefdoc(html)
    expect(doc.format).toBe("refdoc")
    expect(doc.version).toBe(1)
    expect(doc.title).toBe("Debate Is Testing")
    expect(doc.author).toBe("A. Author")
    expect(doc.generator).toMatch(/^extract-refdoc \d/)
    expect(doc.pages.map((p) => p.slug)).toEqual(["", "01-introduction", "02-method", "references"])
    expect(doc.pages[1].title).toBe("1. Introduction")
    expect(doc.pages[1].description).toBe("Why the gateway framing fails.")
    expect(doc.pages[2].part).toBe("Evidence")
    expect(doc.pages[1].headings).toEqual([
      { id: "01-introduction-summary", title: "Section Summary", depth: 2 },
      { id: "01-introduction-text", title: "Text", depth: 2 },
      { id: "01-introduction-scope", title: "Scope", depth: 3 },
    ])
    expect(doc.pages[0].headings.map((h) => h.id)).toEqual(["overview-abstract", "overview-contents"])
  })

  it("leaves the fallback title block out of the pages the runtime shows", () => {
    const doc = parseRefdoc(html)
    expect(html).toContain("<header data-refdoc-fallback>")
    for (const page of doc.pages) expect(page.html).not.toContain("data-refdoc-fallback")
  })

  it("links citations to the references page and skips numbers with no reference", () => {
    const intro = parseRefdoc(html).pages[1].html
    expect(intro).toContain('[<a class="refdoc-cite" href="#ref-1" title="Shanahan, William. 1993. Kritik of Thinking.">1</a>, <a class="refdoc-cite" href="#ref-2"')
    const method = parseRefdoc(html).pages[2].html
    expect(method).toContain("[9]")
    expect(method).not.toContain("refdoc-cite")
    expect(parseRefdoc(html).pages[3].html).toContain('<li id="ref-1">')
  })

  it("keeps every element id unique across pages, so one #id routes anywhere", () => {
    const doc = parseRefdoc(html)
    const ids = doc.pages.flatMap((p) => [...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
    ids.push(...doc.pages.map((p) => p.slug || "overview"))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("can embed the runtime for offline use, or load it from another base URL", () => {
    const inline = paperToRefdoc(paper, { runtime: { js: 'console.log("</script>")', css: "a{color:red}" } })
    expect(inline).toContain('<script id="refdoc-runtime">console.log("<\\/script>")</script>')
    expect(inline).toContain('<style id="refdoc-runtime-css">a{color:red}</style>')
    expect(inline).not.toContain(REFDOC_CDN)
    const local = paperToRefdoc(paper, { runtime: { base: "./assets/" } })
    expect(local).toContain('<script defer src="./assets/refdoc.js"></script>')
  })

  it("cannot be broken out of by a title containing </script>", () => {
    const html = renderRefdocHtml({ ...paperToRefdocDocument(paper), title: "</script><script>alert(1)</script>" })
    const meta = html.match(/<script type="application\/refdoc\+json" id="refdoc-meta">(.*?)<\/script>/s)![1]
    expect(meta).not.toContain("<")
    expect(parseRefdoc(html).title).toBe("</script><script>alert(1)</script>")
  })

  it("reads the same in a browser DOM (jsdom) as in linkedom", () => {
    const fromDom = readRefdocFromDocument(new DOMParser().parseFromString(html, "text/html"))
    const fromLinkedom = parseRefdoc(html)
    expect(fromDom.pages.map((p) => [p.slug, p.title, p.headings])).toEqual(fromLinkedom.pages.map((p) => [p.slug, p.title, p.headings]))
  })

  it("rejects files that are not refdocs", () => {
    expect(() => parseRefdoc("<!doctype html><p>hi</p>")).toThrow(/Not a refdoc/)
  })

  it("names files after the title", () => {
    expect(refdocFileName("Attention Is All You Need")).toBe("attention-is-all-you-need.refdoc.html")
  })
})

describe("linkCitations", () => {
  it("links ranges and leaves tags alone", () => {
    const out = linkCitations('<a href="x[1]">see [1–2]</a>', ["One", "Two"])
    expect(out).toContain('href="x[1]"')
    expect(out).toContain('[<a class="refdoc-cite" href="#ref-1" title="One">1</a>–<a class="refdoc-cite" href="#ref-2" title="Two">2</a>]')
  })

  it("does nothing without references", () => {
    expect(linkCitations("see [1]", [])).toBe("see [1]")
  })
})
