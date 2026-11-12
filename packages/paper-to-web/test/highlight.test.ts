import { describe, expect, it } from "vitest"
import { applyUnderlines, autoUnderline, coreClause, splitSentences, stripUnderlines, underlinedRuns } from "../src/highlight"

describe("applyUnderlines", () => {
  it("marks only phrases that occur verbatim and never changes the prose", () => {
    const text = "Judges want a precedent for proper burdens to meet in every round."
    const marked = applyUnderlines(text, ["Judges want a precedent", "burdens to meet", "not in the text"])
    expect(marked).toBe("==Judges want a precedent== for proper ==burdens to meet== in every round.")
    expect(stripUnderlines(marked)).toBe(text)
  })

  it("skips overlapping phrases and phrases inside links or existing marks", () => {
    const text = "==Already marked== text with [a link here](https://x.org) and more words."
    expect(applyUnderlines(text, ["marked", "link here", "more words", "more"])).toBe(
      "==Already marked== text with [a link here](https://x.org) and ==more words==.",
    )
  })
})

describe("autoUnderline", () => {
  it("marks the topic clause and the strongest claim sentence", () => {
    const paragraph =
      "Every case quote comparison already questions the underlying assumptions, so a separate gateway is redundant. Some teams still read one. Therefore judges should weigh critiques as ordinary solvency turns against the plan."
    const marked = autoUnderline(paragraph)
    expect(underlinedRuns(marked)).toEqual([
      "Every case quote comparison already questions the underlying assumptions",
      "Therefore judges should weigh critiques as ordinary solvency turns against the plan",
    ])
    expect(stripUnderlines(marked)).toBe(paragraph)
  })

  it("leaves short paragraphs and already-marked paragraphs alone", () => {
    expect(autoUnderline("Too short to be a card.")).toBe("Too short to be a card.")
    expect(autoUnderline("==Marked== already and long enough to count as a real paragraph of text here.")).toContain("==Marked==")
  })
})

describe("coreClause", () => {
  it("does not end on a dangling function word", () => {
    expect(coreClause("Self-attention is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence")).toBe(
      "Self-attention is an attention mechanism relating different positions of a single sequence in order to compute a representation",
    )
  })
})

describe("splitSentences", () => {
  it("keeps abbreviations inside their sentence", () => {
    expect(splitSentences("Smith et al. found this. It holds, e.g. in rounds. Done!")).toEqual([
      "Smith et al. found this.",
      "It holds, e.g. in rounds.",
      "Done!",
    ])
  })
})
