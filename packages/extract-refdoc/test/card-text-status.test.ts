import { describe, expect, it } from "vitest"
import { analyzeCardText, cardTextStatus } from "../src/card-text-status"

const SENTENCE = "the states counterplan thrives by distorting the literature base to answer it and that is the problem with fiat in every debate round."
const FULL = `${SENTENCE} ${SENTENCE}`

describe("cardTextStatus", () => {
  it("is missing with no text at all", () => {
    expect(cardTextStatus("")).toBe("missing")
    expect(cardTextStatus("   \n ")).toBe("missing")
    expect(cardTextStatus([])).toBe("missing")
    expect(cardTextStatus(undefined)).toBe("missing")
    expect(cardTextStatus(null)).toBe("missing")
    expect(cardTextStatus(["", "  "])).toBe("missing")
  })

  it("is full for whole text, underlined or not", () => {
    expect(cardTextStatus(FULL)).toBe("full")
    expect(analyzeCardText(FULL).underlined).toBe(false)
    const marked = FULL.replace("distorting the literature base", "==distorting the literature base==")
    expect(analyzeCardText(marked)).toMatchObject({ status: "full", underlined: true, truncated: false })
    expect(cardTextStatus([FULL, FULL])).toBe("full")
  })

  it("stays full when ellipses sit between long passages", () => {
    const text = `${SENTENCE} [...] ${SENTENCE} [...] ${SENTENCE}`
    expect(analyzeCardText(text)).toMatchObject({ status: "full", ellipses: 2 })
  })

  it("is partial when only ellipses are there", () => {
    for (const text of ["[...]", "[…]", "[...] [...]", "...", "…", "[ ... ]"]) {
      expect(analyzeCardText(text), text).toMatchObject({ status: "partial", words: 0 })
    }
  })

  it("is partial when the text is cut off mid-word", () => {
    const cut = `${FULL} [N]ot even the notion that something is currently consi`
    expect(analyzeCardText(cut)).toMatchObject({ status: "partial", truncated: true })
  })

  it("is partial when it ends in an ellipsis", () => {
    expect(cardTextStatus(`${FULL} [...]`)).toBe("partial")
    expect(cardTextStatus(`${FULL} ...`)).toBe("partial")
    expect(cardTextStatus(`${FULL} …`)).toBe("partial")
  })

  it("is partial for a stub or for short fragments between ellipses", () => {
    expect(cardTextStatus("the states counterplan")).toBe("partial")
    expect(cardTextStatus("the states counterplan thrives [...] by distorting the literature [...] to answer it.")).toBe("partial")
  })

  it("counts words without ellipses or marks, and reads the repeated excerpt as partial", () => {
    const excerpt = "the states counterplan thrives by distorting the literature base to answer it [...] [N]ot even the notion that something is currently consi"
    expect(analyzeCardText(excerpt)).toMatchObject({ status: "partial", truncated: true })
    expect(analyzeCardText("==one two three four five six seven eight nine==.").words).toBe(9)
  })

  it("accepts a complete text that ends in a closing quote or bracket", () => {
    expect(cardTextStatus(`${SENTENCE} (Galloway 2020)`)).toBe("partial")
    expect(cardTextStatus(`“${SENTENCE}”`)).toBe("full")
    expect(cardTextStatus(`${SENTENCE} [see above.]`)).toBe("full")
  })
})
