/**
 * @fileoverview `getTextMetrics`: every count and readability score for a
 * text in one call and one counting pass, shaped for JSON (API responses)
 * and for the Page stats panel (`format.ts`).
 *
 * Scores are null, never NaN, when there are fewer than {@link MIN_WORDS}
 * words, and SMOG is null below {@link SMOG_MIN_SENTENCES} sentences.
 *
 * @module metrics
 */
import {
  automatedReadabilityIndexFromCounts,
  colemanLiauIndexFromCounts,
  countText,
  daleChallReadabilityScoreFromCounts,
  difficultWords,
  fleschKincaidGradeFromCounts,
  fleschReadingEaseFromCounts,
  formatTextStandard,
  gunningFogFromCounts,
  linsearWriteFormula,
  smogIndexFromCounts,
  textStandardFromCounts,
} from "./readability.js"
import { paragraphCount } from "./text.js"

/** Below this many words the scores are too noisy to show. */
export const MIN_WORDS = 10
/** SMOG is defined on samples of at least three sentences. */
export const SMOG_MIN_SENTENCES = 3
/** Words a minute for the reading-time estimate (adult silent reading). */
export const WORDS_PER_MINUTE = 238

/** The Flesch Reading Ease bands. */
export type ReadabilityLabel =
  | "Very Easy"
  | "Easy"
  | "Fairly Easy"
  | "Standard"
  | "Fairly Difficult"
  | "Difficult"
  | "Very Confusing"

/**
 * The label for a Flesch Reading Ease score (clamped to 0-100 and rounded):
 * 90-100 Very Easy, 80-89 Easy, 70-79 Fairly Easy, 60-69 Standard, 50-59
 * Fairly Difficult, 30-49 Difficult, 0-29 Very Confusing.
 */
export function readabilityLabel(score: number): ReadabilityLabel {
  const value = Math.round(Math.min(100, Math.max(0, score)))
  if (value >= 90) return "Very Easy"
  if (value >= 80) return "Easy"
  if (value >= 70) return "Fairly Easy"
  if (value >= 60) return "Standard"
  if (value >= 50) return "Fairly Difficult"
  if (value >= 30) return "Difficult"
  return "Very Confusing"
}

/** Whole minutes to read `words` words at {@link WORDS_PER_MINUTE}: 0 for none, else at least 1. */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/** Everything `getTextMetrics` returns. Scores are rounded to one decimal. */
export interface TextMetrics {
  words: number
  /** Characters with runs of whitespace collapsed to one space. */
  characters: number
  /** Letters and digits only. */
  letters: number
  syllables: number
  /** Words of three or more syllables. */
  polysyllables: number
  sentences: number
  /** Blank-line separated blocks. */
  paragraphs: number
  /** Unique words of 2+ syllables not on the Dale-Chall easy list. */
  difficultWords: number
  /** Estimated reading time in whole minutes. */
  readingMinutes: number
  fleschReadingEase: number | null
  fleschKincaidGrade: number | null
  gunningFog: number | null
  smogIndex: number | null
  automatedReadabilityIndex: number | null
  colemanLiauIndex: number | null
  linsearWriteFormula: number | null
  daleChallReadabilityScore: number | null
  /** The grade most formulas agree on (1-18). */
  textStandard: number | null
  /** `textStandard` as a range, e.g. "13th and 14th grade". */
  textStandardLabel: string | null
  /** Flesch Reading Ease clamped to 0-100 and rounded: the headline score. */
  readabilityScore: number | null
  readabilityLabel: ReadabilityLabel | null
}

const round = (value: number, digits = 1) => {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

/**
 * Every count and score for `text` (plain prose: strip Markdown or HTML
 * first, e.g. with `htmlToText`).
 *
 * @example
 * const m = getTextMetrics(article)
 * `${m.words} words, ${m.readingMinutes} min, ${m.readabilityScore}/100 ${m.readabilityLabel}`
 */
export function getTextMetrics(text: string): TextMetrics {
  const counts = countText(text)
  const base = {
    words: counts.words,
    characters: text.replace(/\s+/g, " ").trim().length,
    letters: counts.letters,
    syllables: counts.syllables,
    polysyllables: counts.polysyllables,
    sentences: counts.sentences,
    paragraphs: paragraphCount(text),
    difficultWords: difficultWords(text),
    readingMinutes: readingMinutes(counts.words),
  }
  if (counts.words < MIN_WORDS || counts.sentences === 0) {
    return {
      ...base,
      fleschReadingEase: null,
      fleschKincaidGrade: null,
      gunningFog: null,
      smogIndex: null,
      automatedReadabilityIndex: null,
      colemanLiauIndex: null,
      linsearWriteFormula: null,
      daleChallReadabilityScore: null,
      textStandard: null,
      textStandardLabel: null,
      readabilityScore: null,
      readabilityLabel: null,
    }
  }

  const ease = fleschReadingEaseFromCounts(counts)
  const linsear = linsearWriteFormula(text)
  const grade = textStandardFromCounts(counts, linsear)
  const score = Math.round(Math.min(100, Math.max(0, ease)))
  return {
    ...base,
    fleschReadingEase: round(ease),
    fleschKincaidGrade: round(fleschKincaidGradeFromCounts(counts)),
    gunningFog: round(gunningFogFromCounts(counts)),
    smogIndex: counts.sentences >= SMOG_MIN_SENTENCES ? round(smogIndexFromCounts(counts)) : null,
    automatedReadabilityIndex: round(automatedReadabilityIndexFromCounts(counts)),
    colemanLiauIndex: round(colemanLiauIndexFromCounts(counts)),
    linsearWriteFormula: round(linsear),
    daleChallReadabilityScore: round(daleChallReadabilityScoreFromCounts(counts)),
    textStandard: grade,
    textStandardLabel: formatTextStandard(grade),
    readabilityScore: score,
    readabilityLabel: readabilityLabel(score),
  }
}

/** Alias of {@link getTextMetrics}. */
export const computeMetrics = getTextMetrics
