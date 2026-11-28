import { describe, expect, it } from "vitest"
import {
  countAuthorDateCitations,
  DASH,
  formatReadability,
  getTextMetrics,
  pageInfoRows,
  pageStats,
  readabilityRows,
  readableProse,
} from "../src/index"
import { SAMPLE } from "./sample"

const MARKDOWN = `---
title: Sample
---

import { Card } from 'fumadocs-ui/components/card';

## 1. First section

Debaters ==read the marked words== of a card, as Shanahan (1993) argues. See [the guide](/docs/learn) now.

![A figure](https://example.com/a.png)

\`\`\`ts
const notProse = "code"
\`\`\`

| a | b |
| --- | --- |

The evidence (Alinsky 1971, 66; Hitchens 1999) is clear.[^1]
`

describe("readableProse", () => {
  it("keeps running prose and drops frontmatter, headings, code, tables, URLs and citations", () => {
    const prose = readableProse(MARKDOWN)
    expect(prose).toContain("Debaters read the marked words of a card")
    expect(prose).toContain("See the guide now.")
    expect(prose).not.toMatch(/First section|title:|import|notProse|example\.com|docs\/learn|Alinsky|Hitchens|\[\^1\]|==/)
  })
})

describe("pageStats", () => {
  const stats = pageStats(MARKDOWN, [{ depth: 2 }, { depth: 3 }])

  it("counts the page's structure", () => {
    expect(stats).toMatchObject({ sections: 1, headings: 2, links: 1, figures: 1, tables: 1, codeBlocks: 1, highlights: 1 })
    expect(stats.citations).toBe(4)
    expect(stats.paragraphs).toBe(2)
    expect(stats.sentences).toBe(stats.metrics.sentences)
  })

  it("feeds the readability metrics from the prose only", () => {
    expect(stats.metrics.words).toBeLessThan(25)
    expect(pageStats(`${SAMPLE}\n`).metrics.readabilityScore).not.toBeNull()
    expect(pageStats("").metrics.readabilityScore).toBeNull()
  })

  it("counts author-date citations", () => {
    expect(countAuthorDateCitations("As Smith (2004) and (Jones and Lee 1999a; Park 2001) show.")).toBe(3)
  })
})

describe("pageInfoRows", () => {
  const stats = { words: 1807, readingMinutes: 8, characters: 11525, sentences: 96, paragraphs: 4, figures: 1, citations: 2, highlights: 123, links: 0 }

  it("lists the stats in the panel's order with Sentences after Characters", () => {
    expect(pageInfoRows({ stats, lastUpdated: "2026-11-26T12:00:00Z", showHighlights: true })).toEqual([
      ["Words", "1,807"],
      ["Reading time", "8 min"],
      ["Characters", "11,525"],
      ["Sentences", "96"],
      ["Paragraphs", "4"],
      ["Figures", "1"],
      ["Citations", "2"],
      ["Highlights", "123"],
      ["Last updated", "Nov 26, 2026"],
    ])
  })

  it("hides zero counts, highlights unless asked, and invalid dates", () => {
    const labels = pageInfoRows({ stats: { ...stats, readingMinutes: 0 }, lastUpdated: "not a date" }).map(([label]) => label)
    expect(labels).not.toContain("Highlights")
    expect(labels).not.toContain("Links")
    expect(labels).not.toContain("Last updated")
    expect(pageInfoRows({ stats: { ...stats, readingMinutes: 0 } })[1]).toEqual(["Reading time", "under a minute"])
  })
})

describe("readabilityRows / formatReadability", () => {
  it("formats every grade level to one decimal and the text standard as a whole grade", () => {
    const m = getTextMetrics(SAMPLE)
    expect(readabilityRows(m)).toEqual([
      ["Flesch Reading Ease", "45.0"],
      ["Flesch-Kincaid Grade", "13.8"],
      ["Gunning Fog", "13.4"],
      ["SMOG Index", "14.1"],
      ["Automated Readability Index", "15.4"],
      ["Coleman-Liau Index", "11.1"],
      ["Linsear Write", "17.3"],
      ["Text standard (grade)", "14"],
    ])
    expect(formatReadability(m)).toBe("45/100 Difficult")
  })

  it("uses em dashes where a score is missing", () => {
    const empty = getTextMetrics("")
    expect(readabilityRows(empty).every(([, value]) => value === DASH)).toBe(true)
    expect(formatReadability(empty)).toBe(DASH)
  })
})
