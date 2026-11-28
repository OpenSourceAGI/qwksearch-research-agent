import { describe, expect, it } from "vitest"
import {
  computeMetrics,
  getHtmlMetrics,
  getTextMetrics,
  htmlToText,
  MIN_WORDS,
  readabilityLabel,
  readingMinutes,
} from "../src/index"
import { SAMPLE } from "./sample"

describe("getTextMetrics", () => {
  const m = getTextMetrics(SAMPLE)

  it("returns every count and score, rounded to one decimal", () => {
    expect(m).toMatchObject({
      words: 82,
      letters: 396,
      syllables: 130,
      polysyllables: 11,
      sentences: 3,
      paragraphs: 1,
      difficultWords: 11,
      readingMinutes: 1,
      fleschReadingEase: 45,
      fleschKincaidGrade: 13.8,
      gunningFog: 13.4,
      smogIndex: 14.1,
      automatedReadabilityIndex: 15.4,
      colemanLiauIndex: 11.1,
      linsearWriteFormula: 17.3,
      daleChallReadabilityScore: 8.3,
      textStandard: 14,
      textStandardLabel: "13th and 14th grade",
      readabilityScore: 45,
      readabilityLabel: "Difficult",
    })
    expect(m.characters).toBe(SAMPLE.length)
  })

  it("is aliased as computeMetrics", () => {
    expect(computeMetrics(SAMPLE)).toEqual(m)
  })

  it("scores plain short sentences as easy", () => {
    const easy = getTextMetrics("The cat sat on the mat. The dog ran to the park. We like to play. It is a sunny day.")
    expect(easy.readabilityScore).toBeGreaterThan(90)
    expect(easy.readabilityLabel).toBe("Very Easy")
    expect(easy.fleschKincaidGrade!).toBeLessThan(3)
    expect(easy.textStandard!).toBeLessThanOrEqual(5)
  })

  it("clamps the headline score to 0-100", () => {
    const dense = getTextMetrics(
      "Notwithstanding institutionalization's incontrovertible interconnectedness, characteristically incomprehensible epistemological reconceptualizations proliferate indefinitely, unquestionably.",
    )
    expect(dense.fleschReadingEase!).toBeLessThan(0)
    expect(dense.readabilityScore).toBe(0)
    expect(dense.readabilityLabel).toBe("Very Confusing")
  })

  it("returns null scores, never NaN, for empty or very short text", () => {
    for (const text of ["", "   ", "One word.", "Too short to score."]) {
      const short = getTextMetrics(text)
      expect(short.words).toBeLessThan(MIN_WORDS)
      for (const key of ["fleschReadingEase", "smogIndex", "daleChallReadabilityScore", "textStandard", "textStandardLabel", "readabilityScore", "readabilityLabel"] as const) {
        expect(short[key]).toBeNull()
      }
      expect(JSON.stringify(short)).not.toContain("NaN")
    }
    expect(getTextMetrics("").readingMinutes).toBe(0)
  })

  it("leaves SMOG out below three sentences but scores the rest", () => {
    const two = getTextMetrics("Playing games has always been thought to be important to the development of creative children. I believe that playing games is important for adults.")
    expect(two.sentences).toBe(2)
    expect(two.smogIndex).toBeNull()
    expect(two.fleschReadingEase).not.toBeNull()
  })
})

describe("readabilityLabel", () => {
  it.each([
    [100, "Very Easy"],
    [90, "Very Easy"],
    [89, "Easy"],
    [80, "Easy"],
    [79, "Fairly Easy"],
    [70, "Fairly Easy"],
    [69, "Standard"],
    [60, "Standard"],
    [59, "Fairly Difficult"],
    [50, "Fairly Difficult"],
    [49, "Difficult"],
    [30, "Difficult"],
    [29, "Very Confusing"],
    [0, "Very Confusing"],
    [-40, "Very Confusing"],
    [130, "Very Easy"],
  ])("%i is %s", (score, label) => {
    expect(readabilityLabel(score)).toBe(label)
  })
})

describe("readingMinutes", () => {
  it("rounds at 238 words a minute with a one-minute floor", () => {
    expect(readingMinutes(0)).toBe(0)
    expect(readingMinutes(10)).toBe(1)
    expect(readingMinutes(1807)).toBe(8)
  })
})

describe("htmlToText / getHtmlMetrics", () => {
  const html = `<html><head><title>T</title><style>p{color:red}</style></head><body>
    <h1>Heading</h1><p>First &amp; <b>bold</b> sentence.<br>Same paragraph.</p>
    <script>var x = "not prose."</script><ul><li>Item one</li><li>Item&nbsp;two &#8212; done</li></ul>
    <!-- a comment --></body></html>`

  it("keeps the prose, one block per paragraph, and decodes entities", () => {
    expect(htmlToText(html)).toBe("Heading\n\nFirst & bold sentence.\nSame paragraph.\n\nItem one\n\nItem two — done")
  })

  it("scores the extracted text", () => {
    const m = getHtmlMetrics(`<article>${SAMPLE.split(". ").map((s) => `<p>${s}.</p>`).join("")}</article>`)
    expect(m.words).toBe(82)
    expect(m.paragraphs).toBe(3)
    expect(m.sentences).toBe(3)
  })
})
