import { describe, expect, it } from "vitest"
import { extractKeyphrases, filterKeyphraseCompletions } from "../lib/keyphrase-completions"

describe("extractKeyphrases", () => {
  it("ranks words by frequency, most frequent first", () => {
    const content = "apple banana apple cherry apple banana"
    expect(extractKeyphrases(content)).toEqual(["apple", "banana", "cherry"])
  })

  it("excludes stopwords", () => {
    const content = "there should be about this and that"
    expect(extractKeyphrases(content)).toEqual([])
  })

  it("excludes words shorter than the minimum length", () => {
    const content = "an ok id apple"
    expect(extractKeyphrases(content)).toEqual(["apple"])
  })

  it("lower-cases and dedupes case-variant words", () => {
    const content = "Apple APPLE apple Banana"
    expect(extractKeyphrases(content)).toEqual(["apple", "banana"])
  })

  it("returns an empty array for empty content", () => {
    expect(extractKeyphrases("")).toEqual([])
  })

  it("breaks frequency ties by first-appearance order", () => {
    const content = "zebra apple mango"
    expect(extractKeyphrases(content)).toEqual(["zebra", "apple", "mango"])
  })

  it("truncates to maxKeyphrases", () => {
    const content = "apple banana cherry date"
    expect(extractKeyphrases(content, 2)).toEqual(["apple", "banana"])
  })
})

describe("filterKeyphraseCompletions", () => {
  const keyphrases = ["apple", "application", "banana", "apricot"]

  it("returns keyphrases starting with the query's last word", () => {
    expect(filterKeyphraseCompletions(keyphrases, "ap")).toEqual([
      "apple",
      "application",
      "apricot",
    ])
  })

  it("uses only the last whitespace-separated word of a multi-word query", () => {
    expect(filterKeyphraseCompletions(keyphrases, "red ba")).toEqual(["banana"])
  })

  it("is case-insensitive", () => {
    expect(filterKeyphraseCompletions(keyphrases, "AP")).toEqual([
      "apple",
      "application",
      "apricot",
    ])
  })

  it("excludes a keyphrase that exactly matches the query, but keeps other prefix matches", () => {
    const withExactMatch = ["app", "apple", "application"]
    expect(filterKeyphraseCompletions(withExactMatch, "app")).toEqual([
      "apple",
      "application",
    ])
  })

  it("returns an empty array for a blank query", () => {
    expect(filterKeyphraseCompletions(keyphrases, "")).toEqual([])
  })

  it("returns an empty array when the query ends in a space", () => {
    expect(filterKeyphraseCompletions(keyphrases, "apple ")).toEqual([])
  })

  it("returns an empty array when nothing matches the prefix", () => {
    expect(filterKeyphraseCompletions(keyphrases, "zzz")).toEqual([])
  })

  it("truncates to maxResults", () => {
    expect(filterKeyphraseCompletions(keyphrases, "ap", 1)).toEqual(["apple"])
  })
})
