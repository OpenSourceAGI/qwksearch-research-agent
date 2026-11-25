import { describe, expect, it } from "vitest"
import { finishPaper, readOnlyUnderlined, summarizeSection } from "../src/finish"
import type { Paper } from "../src/types"

const paper: Paper = {
  title: "T",
  abstract: "A shared evidence library lets every team check a card's source before the round begins. It works.",
  sections: [
    {
      title: "Queue",
      summary: [],
      paragraphs: [
        "### Setup",
        "Each card enters a queue where two reviewers check the citation independently before anyone reads it. Therefore cards must clear review before they are published to the library.",
      ],
    },
  ],
  references: [],
}

describe("finishPaper", () => {
  const finished = finishPaper(paper)

  it("underlines paragraphs but not subheadings", () => {
    expect(finished.sections[0].paragraphs[0]).toBe("### Setup")
    expect(finished.sections[0].paragraphs[1]).toContain("==Each card enters a queue where two reviewers check the citation independently before anyone reads it==")
  })

  it("adds a description, a Section Summary and the paper description", () => {
    expect(finished.sections[0].description).toBe("Each card enters a queue where two reviewers check the citation independently before anyone reads it.")
    expect(finished.sections[0].summary).toEqual([
      {
        label: "Each card enters a queue where",
        text: "Each card enters a queue where two reviewers check the citation independently before anyone reads it.",
      },
    ])
    expect(finished.description).toBe("A shared evidence library lets every team check a card's source before the round begins.")
  })

  it("keeps summaries and descriptions it was given", () => {
    const given = finishPaper({ ...paper, sections: [{ ...paper.sections[0], description: "Mine", summary: [{ label: "L", text: "T" }] }] })
    expect(given.sections[0].description).toBe("Mine")
    expect(given.sections[0].summary).toEqual([{ label: "L", text: "T" }])
  })

  it("can leave underlining off", () => {
    expect(finishPaper(paper, { underline: false }).sections[0].paragraphs[1]).not.toContain("==")
  })
})

describe("readOnlyUnderlined", () => {
  it("cuts each paragraph down to its underlined words", () => {
    const outline = readOnlyUnderlined(finishPaper(paper))
    expect(outline.sections[0].paragraphs).toEqual([
      "### Setup",
      "==Each card enters a queue where two reviewers check the citation independently before anyone reads it … Therefore cards must clear review before they are published to the library==",
    ])
  })
})

describe("summarizeSection", () => {
  it("skips short paragraphs and caps the points at four", () => {
    const long = "This paragraph is long enough to count as a real point in the summary list for sure."
    expect(summarizeSection({ title: "x", summary: [], paragraphs: ["Short one.", long, long, long, long, long] })).toHaveLength(4)
  })
})
