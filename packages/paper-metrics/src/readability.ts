/**
 * @fileoverview The readability formulas of textstat (Python) / text-readability
 * (npm), with the same names, defaults and edge cases: each returns the raw,
 * unrounded score, and 0 for text with no words (or, for SMOG, fewer than
 * three sentences).
 *
 * Every function counts its text once with {@link countText}; pass the counts
 * to the `*FromCounts` helpers to score one text many ways without recounting.
 *
 * Deviations from textstat, all because this package carries no
 * pronunciation dictionary or NLP model:
 *
 * - syllables come from the rules in `syllables.ts`, not the CMU dictionary;
 * - sentences come from `sentenceCount`, which does not split on
 *   abbreviations, decimals or ellipses, and does not drop short sentences.
 *
 * @module readability
 */
import { easyWords } from "./easy-words.js"
import { countWordSyllables } from "./syllables.js"
import { charCount, letterCount, lexiconCount, listWords, sentenceCount } from "./text.js"

/** Words of three or more syllables are "polysyllables" (SMOG) and, unless easy, "difficult" (Gunning Fog). */
const POLYSYLLABLE = 3

/** Everything the formulas need, counted in one pass. */
export interface TextCounts {
  /** Words (tokens with a letter or digit). */
  words: number
  /** Whitespace-separated tokens, punctuation included (ARI's word count). */
  tokens: number
  /** Characters other than whitespace (ARI). */
  characters: number
  /** Letters and digits (Coleman-Liau). */
  letters: number
  syllables: number
  /** Words of 3+ syllables (SMOG). */
  polysyllables: number
  sentences: number
  /** Words of 3+ syllables not on the Dale-Chall easy list (Gunning Fog). */
  hardWords: number
  /** Words not on the Dale-Chall easy list, however short (Dale-Chall). */
  unfamiliarWords: number
}

const normalize = (word: string) => word.toLowerCase().replace(/’/g, "'")

/** Count `text` once for every formula. */
export function countText(text: string): TextCounts {
  const easy = easyWords()
  let syllables = 0
  let polysyllables = 0
  let hardWords = 0
  let unfamiliarWords = 0
  const words = listWords(text)
  for (const word of words) {
    const count = countWordSyllables(word)
    syllables += count
    const familiar = easy.has(normalize(word))
    if (count >= POLYSYLLABLE) polysyllables++
    if (!familiar) unfamiliarWords++
    if (!familiar && count >= POLYSYLLABLE) hardWords++
  }
  return {
    words: words.length,
    tokens: lexiconCount(text, false),
    characters: charCount(text),
    letters: letterCount(text),
    syllables,
    polysyllables,
    sentences: sentenceCount(text),
    hardWords,
    unfamiliarWords,
  }
}

const wordsPerSentence = (c: TextCounts) => (c.sentences ? c.words / c.sentences : 0)
const syllablesPerWord = (c: TextCounts) => (c.words ? c.syllables / c.words : 0)

/** Total syllables in `text` (a single word works too). */
export function syllableCount(text: string): number {
  let total = 0
  for (const word of listWords(text)) total += countWordSyllables(word)
  return total
}

/** Words of three or more syllables. */
export function polysyllableCount(text: string): number {
  return listWords(text).filter((word) => countWordSyllables(word) >= POLYSYLLABLE).length
}

/** Flesch Reading Ease: 206.835 − 1.015 × words/sentence − 84.6 × syllables/word. Higher is easier. */
export function fleschReadingEaseFromCounts(c: TextCounts): number {
  const wps = wordsPerSentence(c)
  const spw = syllablesPerWord(c)
  if (wps === 0 || spw === 0) return 0
  return 206.835 - 1.015 * wps - 84.6 * spw
}

/** Flesch-Kincaid Grade: 0.39 × words/sentence + 11.8 × syllables/word − 15.59. */
export function fleschKincaidGradeFromCounts(c: TextCounts): number {
  const wps = wordsPerSentence(c)
  const spw = syllablesPerWord(c)
  if (wps === 0 || spw === 0) return 0
  return 0.39 * wps + 11.8 * spw - 15.59
}

/** Gunning Fog: 0.4 × (words/sentence + 100 × hard words/words), hard = 3+ syllables and not on the easy list. */
export function gunningFogFromCounts(c: TextCounts): number {
  if (c.words === 0) return 0
  return 0.4 * (wordsPerSentence(c) + (100 * c.hardWords) / c.words)
}

/** SMOG: 1.043 × √(30 × polysyllables/sentences) + 3.1291; 0 below three sentences. */
export function smogIndexFromCounts(c: TextCounts): number {
  if (c.sentences < 3) return 0
  return 1.043 * Math.sqrt(30 * (c.polysyllables / c.sentences)) + 3.1291
}

/** Automated Readability Index: 4.71 × characters/word + 0.5 × words/sentence − 21.43. */
export function automatedReadabilityIndexFromCounts(c: TextCounts): number {
  const cpw = c.tokens ? c.characters / c.tokens : 0
  const wps = wordsPerSentence(c)
  if (cpw === 0 || wps === 0) return 0
  return 4.71 * cpw + 0.5 * wps - 21.43
}

/** Coleman-Liau: 0.058 × letters per 100 words − 0.296 × sentences per 100 words − 15.8. */
export function colemanLiauIndexFromCounts(c: TextCounts): number {
  if (c.words === 0) return 0
  const letters = (c.letters / c.words) * 100
  const sentences = (c.sentences / c.words) * 100
  if (letters === 0 || sentences === 0) return 0
  return 0.058 * letters - 0.296 * sentences - 15.8
}

/** Dale-Chall: 0.1579 × % unfamiliar words + 0.0496 × words/sentence, + 3.6365 when over 5% are unfamiliar. */
export function daleChallReadabilityScoreFromCounts(c: TextCounts): number {
  if (c.words === 0) return 0
  const percent = (100 * c.unfamiliarWords) / c.words
  const score = 0.1579 * percent + 0.0496 * wordsPerSentence(c)
  return percent > 5 ? score + 3.6365 : score
}

export function fleschReadingEase(text: string): number {
  return fleschReadingEaseFromCounts(countText(text))
}
export function fleschKincaidGrade(text: string): number {
  return fleschKincaidGradeFromCounts(countText(text))
}
export function gunningFog(text: string): number {
  return gunningFogFromCounts(countText(text))
}
/** SMOG index; needs at least three sentences, else 0. */
export function smogIndex(text: string): number {
  return smogIndexFromCounts(countText(text))
}
export function automatedReadabilityIndex(text: string): number {
  return automatedReadabilityIndexFromCounts(countText(text))
}
export function colemanLiauIndex(text: string): number {
  return colemanLiauIndexFromCounts(countText(text))
}
export function daleChallReadabilityScore(text: string): number {
  return daleChallReadabilityScoreFromCounts(countText(text))
}

/**
 * Linsear Write on the first 100 words: (easy + 3 × hard words) / sentences,
 * where hard words have 3+ syllables; then halved, after subtracting 2 when
 * 20 or less.
 */
export function linsearWriteFormula(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean)
  let easy = 0
  let hard = 0
  let used = 0
  for (const token of tokens) {
    if (easy + hard === 100) break
    used++
    const syllables = syllableCount(token)
    if (syllables >= POLYSYLLABLE) hard++
    else if (syllables > 0) easy++
  }
  const sentences = sentenceCount(tokens.slice(0, used).join(" "))
  if (sentences === 0) return 0
  const score = (easy + hard * 3) / sentences
  return (score <= 20 ? score - 2 : score) / 2
}

/**
 * Number of difficult words: not on the Dale-Chall easy list and at least
 * `syllableThreshold` syllables long (textstat's default threshold of 2, and
 * unique words only, by default).
 */
export function difficultWords(text: string, syllableThreshold = 2, unique = true): number {
  return difficultWordsList(text, syllableThreshold, unique).length
}

/** The difficult words themselves (lowercase), see {@link difficultWords}. */
export function difficultWordsList(text: string, syllableThreshold = 2, unique = true): string[] {
  const easy = easyWords()
  const found = listWords(text)
    .map(normalize)
    .filter((word) => !easy.has(word) && countWordSyllables(word) >= syllableThreshold)
  return unique ? [...new Set(found)] : found
}

/** Python's `round()`: halves go to the even neighbour. */
function roundHalfEven(value: number): number {
  const floor = Math.floor(value)
  const diff = value - floor
  if (Math.abs(diff - 0.5) > 1e-9) return Math.round(value)
  return floor % 2 === 0 ? floor : floor + 1
}

/** The grade textstat reads off a Flesch Reading Ease score. */
function gradesFromEase(ease: number): number[] {
  if (ease < 100 && ease >= 90) return [5]
  if (ease < 90 && ease >= 80) return [6]
  if (ease < 80 && ease >= 70) return [7]
  if (ease < 70 && ease >= 60) return [8, 9]
  if (ease < 60 && ease >= 50) return [10]
  if (ease < 50 && ease >= 40) return [11]
  if (ease < 40 && ease >= 30) return [12]
  return [13]
}

/** English ordinal suffix: 1st, 2nd, 3rd, 4th, 11th, 21st. */
export function gradeSuffix(grade: number): string {
  const teen = grade % 100
  if (teen >= 11 && teen <= 13) return "th"
  return { 1: "st", 2: "nd", 3: "rd" }[grade % 10] ?? "th"
}

/** The grade most formulas agree on, clamped to 1-18, from counted text and its Linsear Write score. */
export function textStandardFromCounts(c: TextCounts, linsearWrite: number): number {
  const grades: number[] = []
  const vote = (score: number) => grades.push(Math.floor(score), Math.ceil(score), roundHalfEven(score))
  vote(fleschKincaidGradeFromCounts(c))
  grades.push(...gradesFromEase(fleschReadingEaseFromCounts(c)))
  vote(smogIndexFromCounts(c))
  vote(colemanLiauIndexFromCounts(c))
  vote(automatedReadabilityIndexFromCounts(c))
  vote(daleChallReadabilityScoreFromCounts(c))
  vote(linsearWrite)
  vote(gunningFogFromCounts(c))
  const tally = new Map<number, number>()
  for (const grade of grades) tally.set(grade, (tally.get(grade) ?? 0) + 1)
  let best = grades[0]!
  for (const [grade, votes] of tally) if (votes > tally.get(best)!) best = grade
  return Math.max(1, Math.min(18, best))
}

/** Text standard as a grade range, e.g. "13th and 14th grade". */
export function formatTextStandard(grade: number): string {
  const lower = Math.trunc(grade) - 1
  const upper = lower + 1
  return `${lower}${gradeSuffix(lower)} and ${upper}${gradeSuffix(upper)} grade`
}

/**
 * The US school grade most of the formulas agree on (textstat's
 * `text_standard`): "13th and 14th grade", or the number 14 with
 * `floatOutput`.
 */
export function textStandard(text: string, floatOutput?: false): string
export function textStandard(text: string, floatOutput: true): number
export function textStandard(text: string, floatOutput = false): string | number {
  const grade = textStandardFromCounts(countText(text), linsearWriteFormula(text))
  return floatOutput ? grade : formatTextStandard(grade)
}

/** Seconds to read `text` at `msPerChar` milliseconds per non-space character (textstat's `reading_time`). */
export function readingTime(text: string, msPerChar = 14.69): number {
  return (msPerChar * charCount(text)) / 1000
}
