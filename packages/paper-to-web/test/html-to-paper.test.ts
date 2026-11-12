import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { htmlToPaper, mergeBrokenParagraphs, stripSectionNumber, textToPaper } from "../src/html-to-paper"

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8")

describe("htmlToPaper on arXiv-style HTML", () => {
  const paper = htmlToPaper(fixture("arxiv-like.html"), { sourceUrl: "https://arxiv.org/abs/1" })

  it("takes the title and abstract, and drops the page chrome above the title", () => {
    expect(paper.title).toBe("Debate Is Testing")
    expect(paper.abstract).toMatch(/^We argue that comparative testing/)
    expect(JSON.stringify(paper)).not.toMatch(/Report GitHub Issue|Content selection saved|Back to arXiv/)
  })

  it("splits sections at the top-level heading and strips their numbers", () => {
    expect(paper.sections.map((s) => s.title)).toEqual(["Introduction", "Method"])
  })

  it("keeps deeper headings as subheadings and skips acknowledgements and site footers", () => {
    const method = paper.sections[1]
    expect(method.paragraphs[0]).toBe("### 2.1 Data")
    expect(method.paragraphs.join(" ")).not.toMatch(/Thanks to the coaches|reporting errors|continuing to improve/)
  })

  it("attaches the figure with the caption written after it, and ignores icons", () => {
    expect(paper.sections[1].figure).toEqual({ src: "https://arxiv.org/html/1/Figures/flow.png", caption: "The comparison flow." })
    expect(paper.figure).toBeUndefined()
  })

  it("cleans math and citation anchors in the prose", () => {
    expect(paper.sections[0].paragraphs[1]).toContain("positions ht and the layer stack has N=6 identical")
    expect(paper.sections[0].paragraphs[0]).toMatch(/mistake 5\.$/)
  })

  it("collects references without their [n] numbers", () => {
    expect(paper.references).toEqual([
      "Shanahan, William. 1993. Kritik of Thinking. Debater's Research Guide.",
      "Bodnick, Marc. 2023. High School Debate Is Broken.",
    ])
  })
})

describe("htmlToPaper on PDF-style HTML", () => {
  const paper = htmlToPaper(fixture("pdf-like.html"))

  it("promotes numbered heading lines, finds the inline abstract and the title above it", () => {
    expect(paper.title).toBe("Peer Review of Evidence: A Model for Debate")
    expect(paper.abstract).toMatch(/^A shared evidence library/)
    expect(paper.sections.map((s) => s.title)).toEqual(["Introduction", "Review Queue"])
  })

  it("drops diagram scraps and page numbers, and rejoins broken paragraphs", () => {
    expect(paper.sections[1].paragraphs).toEqual([
      "Each card enters a queue where two reviewers check the citation independently and the card is published only when both reviewers agree that the quote matches the source.",
    ])
    expect(paper.sections[0].paragraphs.join(" ")).not.toContain("Hash0")
  })
})

describe("htmlToPaper without headings", () => {
  it("cuts the body into sections of a few paragraphs", () => {
    const html = Array.from({ length: 8 }, (_, i) => `<p>Paragraph number ${i + 1} makes a complete point about debate evidence.</p>`).join("")
    const paper = htmlToPaper(html, { title: "Loose" })
    expect(paper.sections).toHaveLength(2)
    expect(paper.sections[0].paragraphs).toHaveLength(6)
  })
})

describe("textToPaper", () => {
  it("reads markdown headings, paragraphs, lists and marks", () => {
    const paper = textToPaper("# My Case\n\n## 1. Harms\n\nThe ==status quo fails== every student who debates.\n\n- first point here\n- second point here\n\n## 2. Solvency\n\nThe plan solves by funding coaches.")
    expect(paper.title).toBe("My Case")
    expect(paper.sections.map((s) => s.title)).toEqual(["Harms", "Solvency"])
    expect(paper.sections[0].paragraphs).toEqual(["The ==status quo fails== every student who debates.", "first point here", "second point here"])
  })
})

describe("helpers", () => {
  it("stripSectionNumber", () => {
    expect(stripSectionNumber("2. Original Sin")).toBe("Original Sin")
    expect(stripSectionNumber("IV. Conclusion")).toBe("Conclusion")
    expect(stripSectionNumber("3.2 Attention")).toBe("Attention")
    expect(stripSectionNumber("Section 4: Results")).toBe("Results")
    expect(stripSectionNumber("2024 Was a Year")).toBe("2024 Was a Year")
  })

  it("mergeBrokenParagraphs rejoins lines and hyphenated words", () => {
    expect(mergeBrokenParagraphs(["The card is published only when the two", "reviewers agree on the quote.", "Next point."])).toEqual([
      "The card is published only when the two reviewers agree on the quote.",
      "Next point.",
    ])
    expect(mergeBrokenParagraphs(["The card is pub-", "lished today."])).toEqual(["The card is published today."])
    expect(mergeBrokenParagraphs(["first point", "second point"])).toEqual(["first point", "second point"])
  })
})
