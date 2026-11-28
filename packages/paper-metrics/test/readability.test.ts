import { describe, expect, it } from "vitest"
import {
  automatedReadabilityIndex,
  charCount,
  colemanLiauIndex,
  countWordSyllables,
  daleChallReadabilityScore,
  difficultWords,
  difficultWordsList,
  easyWords,
  fleschKincaidGrade,
  fleschReadingEase,
  formatTextStandard,
  gunningFog,
  letterCount,
  lexiconCount,
  linsearWriteFormula,
  polysyllableCount,
  readingTime,
  sentenceCount,
  smogIndex,
  syllableCount,
  textStandard,
} from "../src/index"
import { SAMPLE } from "./sample"

// textstat 0.7.13 on SAMPLE (`textstat.flesch_reading_ease(SAMPLE)` etc.).
const TEXTSTAT = {
  syllable_count: 130,
  lexicon_count: 82,
  sentence_count: 3,
  char_count: 404,
  letter_count: 396,
  polysyllabcount: 11,
  flesch_reading_ease: 44.96971544715447,
  flesch_kincaid_grade: 13.777317073170735,
  gunning_fog: 13.372357723577236,
  smog_index: 14.06817628641468,
  automated_readability_index: 15.4420325203252,
  coleman_liau_index: 11.126829268292685,
  linsear_write_formula: 17.333333333333332,
  dale_chall_readability_score: 8.265769918699187,
  text_standard: "13th and 14th grade",
}

describe("textstat reference values (the games sample)", () => {
  it("counts like textstat", () => {
    expect(syllableCount(SAMPLE)).toBe(TEXTSTAT.syllable_count)
    expect(lexiconCount(SAMPLE)).toBe(TEXTSTAT.lexicon_count)
    expect(sentenceCount(SAMPLE)).toBe(TEXTSTAT.sentence_count)
    expect(charCount(SAMPLE)).toBe(TEXTSTAT.char_count)
    expect(letterCount(SAMPLE)).toBe(TEXTSTAT.letter_count)
    expect(polysyllableCount(SAMPLE)).toBe(TEXTSTAT.polysyllabcount)
  })

  it.each([
    ["fleschReadingEase", fleschReadingEase, TEXTSTAT.flesch_reading_ease],
    ["fleschKincaidGrade", fleschKincaidGrade, TEXTSTAT.flesch_kincaid_grade],
    ["gunningFog", gunningFog, TEXTSTAT.gunning_fog],
    ["smogIndex", smogIndex, TEXTSTAT.smog_index],
    ["automatedReadabilityIndex", automatedReadabilityIndex, TEXTSTAT.automated_readability_index],
    ["colemanLiauIndex", colemanLiauIndex, TEXTSTAT.coleman_liau_index],
    ["linsearWriteFormula", linsearWriteFormula, TEXTSTAT.linsear_write_formula],
    ["daleChallReadabilityScore", daleChallReadabilityScore, TEXTSTAT.dale_chall_readability_score],
  ] as const)("%s matches textstat", (_name, fn, expected) => {
    expect(fn(SAMPLE)).toBeCloseTo(expected, 6)
  })

  it("gives textstat's text standard", () => {
    expect(textStandard(SAMPLE)).toBe(TEXTSTAT.text_standard)
    expect(textStandard(SAMPLE, true)).toBe(14)
  })

  it("counts difficult words case-insensitively (textstat counts Playing and playing twice: 12)", () => {
    expect(difficultWords(SAMPLE)).toBe(11)
    expect(difficultWordsList(SAMPLE)).toContain("interpersonal")
    expect(difficultWordsList(SAMPLE)).not.toContain("important")
    expect(difficultWords(SAMPLE, 2, false)).toBeGreaterThan(11)
  })

  it("estimates reading time like textstat (14.69 ms per character)", () => {
    expect(readingTime(SAMPLE)).toBeCloseTo((14.69 * 404) / 1000, 6)
  })
})

describe("countWordSyllables", () => {
  it.each([
    ["the", 1],
    ["games", 1],
    ["always", 2],
    ["table", 2],
    ["little", 2],
    ["created", 3],
    ["important", 3],
    ["development", 4],
    ["interpersonal", 5],
    ["relationships", 4],
    ["tension", 2],
    ["boxes", 2],
    ["conversations", 4],
    ["basement", 2],
    ["couldn't", 2],
    ["going", 2],
    ["fire", 2],
    ["equal", 2],
    ["league", 1],
    ["killed", 1],
    ["2026", 1],
    ["—", 0],
  ])("%s has %i syllables", (word, expected) => {
    expect(countWordSyllables(word)).toBe(expected)
  })
})

describe("edge cases", () => {
  it("returns 0, never NaN, for empty text", () => {
    for (const fn of [fleschReadingEase, fleschKincaidGrade, gunningFog, smogIndex, automatedReadabilityIndex, colemanLiauIndex, linsearWriteFormula, daleChallReadabilityScore]) {
      expect(fn("")).toBe(0)
    }
    expect(syllableCount("")).toBe(0)
    expect(sentenceCount("")).toBe(0)
  })

  it("needs three sentences for SMOG", () => {
    expect(smogIndex("Playing games is important for creative children. I believe that adults should play too.")).toBe(0)
    expect(smogIndex(SAMPLE)).toBeGreaterThan(0)
  })

  it("counts punctuation tokens only when asked", () => {
    expect(lexiconCount("Hello — world !")).toBe(2)
    expect(lexiconCount("Hello — world !", false)).toBe(4)
  })

  it("formats text-standard ranges with ordinal suffixes", () => {
    expect(formatTextStandard(2)).toBe("1st and 2nd grade")
    expect(formatTextStandard(4)).toBe("3rd and 4th grade")
    expect(formatTextStandard(12)).toBe("11th and 12th grade")
    expect(formatTextStandard(22)).toBe("21st and 22nd grade")
  })

  it("ships the ~3,000-word Dale-Chall list", () => {
    const words = easyWords()
    expect(words.size).toBeGreaterThan(2900)
    expect(words.has("important")).toBe(true)
    expect(words.has("interpersonal")).toBe(false)
  })
})
