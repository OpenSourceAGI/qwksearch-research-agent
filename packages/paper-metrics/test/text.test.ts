import { describe, expect, it } from "vitest"
import { listParagraphs, listSentences, paragraphCount, sentenceCount } from "../src/index"

describe("sentenceCount", () => {
  it.each([
    ["One. Two! Three?", 3],
    ["Studies, e.g. Smith et al. found a rise of 3.5 percent in scores across many schools. Teachers noted the change.", 2],
    ["Dr. Smith and Mrs. Jones met Prof. Lee at St. Mark's. They talked.", 2],
    ["J. R. R. Tolkien wrote it. Then he slept.", 2],
    ["See Fig. 3 and No. 5 on pp. 12-14. Then stop.", 2],
    ["Version 2.1.4 costs $3.50 at example.com today. It sold out.", 2],
    ["I waited... then it rang. Nothing else happened.", 2],
    ["I waited... Then it rang.", 2],
    ['"Why?" she asked. "Because," he said.', 2],
    ["It ended (finally). Next came more.", 2],
    ["Is this the end?! Yes.", 2],
    ["Word", 1],
    ["", 0],
    ["  ... !!! ", 0],
  ])("%j has %i sentences", (text, expected) => {
    expect(sentenceCount(text)).toBe(expected)
  })

  it("ends a sentence at a blank line even without punctuation", () => {
    expect(listSentences("Introduction\n\nThe study began in May. It ended in June.")).toEqual([
      "Introduction",
      "The study began in May.",
      "It ended in June.",
    ])
  })

  it("keeps single newlines inside a sentence", () => {
    expect(sentenceCount("This sentence wraps\nonto a second line. Done.")).toBe(2)
  })
})

describe("paragraphs", () => {
  it("splits on blank lines and skips empty blocks", () => {
    expect(paragraphCount("One.\n\n  \n\nTwo.\n \nThree.\n\n---")).toBe(3)
    expect(listParagraphs("a\nb\n\nc")).toEqual(["a\nb", "c"])
    expect(paragraphCount("")).toBe(0)
  })
})
