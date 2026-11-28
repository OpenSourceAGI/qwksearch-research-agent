import { describe, expect, it } from "vitest"
import { paperToHtml } from "../src/html"
import { referencesToMdx } from "../src/mdx"
import { paperToRefdocDocument } from "../src/refdoc"
import { cleanReferenceEntry, stripVideoLength } from "../src/reference-meta"
import { parseReferenceEntry, referenceCardHtml, referenceCitationText } from "../src/reference-card"
import type { Paper } from "../src/types"

const URL = "https://d.ebate.app/videos/26-27/vcx/glenbrooks/doubles/peninsula-pc-westwood-gl/2ar/llm"
const TITLE = "2026 Glenbrooks HS Policy Doubles: Peninsula #60 Choe & Pan vs Westwood #5 Gupta & Laxminarasimhan."
const EXPECTED = `Debate AI Institute. "${TITLE}" Video. Posted November 24, 2026. ${URL}.`

const withLength = {
  bracketed: `Debate AI Institute. "${TITLE}" Video (12:34). Posted November 24, 2026. ${URL}.`,
  squareHours: `Debate AI Institute. "${TITLE}" Video [1:02:03]. Posted November 24, 2026. ${URL}.`,
  commaClock: `Debate AI Institute. "${TITLE}" Video, 12:34. Posted November 24, 2026. ${URL}.`,
  labelled: `Debate AI Institute. "${TITLE}" Video. Duration: 12:34. Posted November 24, 2026. ${URL}.`,
  minutes: `Debate AI Institute. "${TITLE}" Video, 12 min. Posted November 24, 2026. ${URL}.`,
  parenMinutes: `Debate AI Institute. "${TITLE}" Video (1 hr 5 min). Posted November 24, 2026. ${URL}.`,
  length: `Debate AI Institute. "${TITLE}" Video. Length: 45 minutes. Posted November 24, 2026. ${URL}.`,
}

describe("stripVideoLength", () => {
  it("leaves the Glenbrooks video citation exactly as written when it has no length", () => {
    expect(stripVideoLength(EXPECTED)).toBe(EXPECTED)
  })

  it.each(Object.entries(withLength))("drops the length: %s", (_name, citation) => {
    expect(stripVideoLength(citation)).toBe(EXPECTED)
  })

  it("keeps the rest of a YouTube citation", () => {
    expect(stripVideoLength('Doe, Jane. "Why Not." YouTube video, 12:04. https://www.youtube.com/watch?v=abc.')).toBe(
      'Doe, Jane. "Why Not." YouTube video. https://www.youtube.com/watch?v=abc.',
    )
  })

  it("does not touch URL timestamps or dates", () => {
    const citation = 'Doe, Jane. "A Talk." YouTube, March 3, 2020. https://youtu.be/abc?t=1:23.'
    expect(stripVideoLength(citation)).toBe(citation)
  })

  it("only changes video citations", () => {
    const article = 'Doe, Jane. "A Piece." *Journal of Things* 4 (2): 12:34. Posted at 10:30 am.'
    expect(stripVideoLength(article)).toBe(article)
  })
})

describe("cleanReferenceEntry", () => {
  it("cleans only the citation line of a multi-line card", () => {
    const entry = `Choe '26 ${withLength.bracketed}\nthe round ran 12:34 before the vote`
    expect(cleanReferenceEntry(entry)).toBe(`Choe '26 ${EXPECTED}\nthe round ran 12:34 before the vote`)
  })
})

describe("video length in rendered references", () => {
  const paper: Paper = {
    title: "Rounds",
    sections: [{ title: "Intro", summary: [], paragraphs: ["The 2AR reframes the round [1]."] }],
    references: [withLength.bracketed],
  }

  it("is gone from the card, its parsed citation and the tooltip text", () => {
    expect(parseReferenceEntry(withLength.commaClock).citation).toBe(EXPECTED)
    expect(referenceCitationText(withLength.commaClock)).toContain('Video. Posted November 24, 2026.')
    const html = referenceCardHtml(withLength.bracketed, "ref-1")
    expect(html).not.toContain("12:34")
    expect(html).toContain('data-ref-type="video"')
  })

  it("is gone from the refdoc references page and citation tooltips", () => {
    const refdoc = paperToRefdocDocument(paper)
    for (const page of refdoc.pages) expect(page.html).not.toContain("12:34")
  })

  it("is gone from MDX and HTML exports", () => {
    expect(referencesToMdx(paper)).toContain(`1. ${EXPECTED}`)
    expect(referencesToMdx(paper)).not.toContain("12:34")
    expect(paperToHtml(paper)).not.toContain("12:34")
  })
})
