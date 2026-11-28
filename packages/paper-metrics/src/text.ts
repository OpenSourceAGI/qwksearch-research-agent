/**
 * @fileoverview Splitting text into words, sentences and paragraphs, and the
 * plain counts (words, characters, letters) the readability formulas use.
 *
 * Sentence splitting is the part textstat does crudely (any run of text up to
 * `.`, `!` or `?`); here a sentence ends at terminal punctuation followed by
 * whitespace, or at a blank line, except where that punctuation is plainly
 * not the end of a sentence:
 *
 * - decimals, versions and URLs (`3.5`, `v1.2`, `example.com`) — no space
 *   follows the dot;
 * - titles and Latin abbreviations (`Dr. Smith`, `e.g. this`, `Smith et al.
 *   (2004)`), single-letter initials (`J. R. Tolkien`) and numbered labels
 *   (`Fig. 3`, `No. 5`, `pp. 12`);
 * - ellipses and other punctuation followed by a lowercase word (`wait...
 *   then`, `"Why?" she asked`).
 *
 * @module text
 */

/** A word: letters or digits, with inner apostrophes or hyphens (`don't`, `well-balanced`). */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu
const HAS_WORD = /[\p{L}\p{N}]/u

/** Abbreviations that end with a dot but (almost) never end a sentence. */
const ABBREVIATIONS = new Set(
  [
    "mr", "mrs", "ms", "mx", "dr", "prof", "sr", "jr", "st", "mt", "rev", "fr", "gen", "col", "lt", "sgt", "capt",
    "gov", "sen", "rep", "hon", "pres", "messrs", "vs", "cf", "viz", "al", "approx", "ca", "dept", "esp", "ibid",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  ].map((a) => a.toLowerCase()),
)
/** Labels that end with a dot when a number follows (`Fig. 3`, `No. 5`). */
const NUMBERED = new Set(["fig", "figs", "eq", "eqs", "no", "nos", "vol", "vols", "pp", "p", "ch", "sec", "art", "op", "ed", "eds", "nr", "pt"])

const BOUNDARY = /[.!?…]+["'”’)\]]*(?=\s)/gu
const PARAGRAPH_BREAK = /\n[ \t]*\n\s*/

/** The words of `text`, in order. */
export function listWords(text: string): string[] {
  return text.match(WORD) ?? []
}

/**
 * Number of words in `text`, like textstat's `lexicon_count`.
 *
 * @param removePunctuation - true (default) counts only tokens with a letter
 *   or digit; false counts every whitespace-separated token, punctuation too.
 */
export function lexiconCount(text: string, removePunctuation = true): number {
  if (removePunctuation) return listWords(text).length
  return text.split(/\s+/).filter(Boolean).length
}

/** Number of characters, like textstat's `char_count` (whitespace ignored by default). */
export function charCount(text: string, ignoreSpaces = true): number {
  return ignoreSpaces ? text.replace(/\s/gu, "").length : text.length
}

/** Number of letters and digits (no whitespace or punctuation), like textstat's `letter_count`. */
export function letterCount(text: string): number {
  return text.match(/[\p{L}\p{N}]/gu)?.length ?? 0
}

/** The text's paragraphs: blocks separated by a blank line that contain a word. */
export function listParagraphs(text: string): string[] {
  return text
    .split(PARAGRAPH_BREAK)
    .map((block) => block.trim())
    .filter((block) => HAS_WORD.test(block))
}

/** Number of paragraphs (blank-line separated blocks with a word). */
export function paragraphCount(text: string): number {
  return listParagraphs(text).length
}

/** Whether the punctuation ending at `end` in `text` really ends a sentence. */
function endsSentence(text: string, start: number, end: number): boolean {
  const next = text.slice(end).match(/\S/u)?.[0] ?? ""
  if (!next) return true
  if (/\p{Ll}/u.test(next)) return false
  const mark = text.slice(start, end)
  if (!mark.startsWith(".") || mark.startsWith("..")) return true
  const token = text.slice(0, start).match(/[\p{L}\p{N}.]+$/u)?.[0] ?? ""
  const lower = token.toLowerCase()
  if (ABBREVIATIONS.has(lower)) return false
  if (/^\p{Lu}$/u.test(token)) return false
  if (/^(?:\p{Ll}\.)+\p{Ll}$/u.test(token)) return false
  if (/[\d(\[]/u.test(next) && NUMBERED.has(lower)) return false
  return true
}

/**
 * The sentences of `text`. A blank line always ends a sentence, so headings
 * and list items on their own paragraph count as sentences of their own.
 */
export function listSentences(text: string): string[] {
  const sentences: string[] = []
  for (const paragraph of listParagraphs(text)) {
    let from = 0
    for (const match of paragraph.matchAll(BOUNDARY)) {
      const start = match.index
      const end = start + match[0].length
      if (!endsSentence(paragraph, start, end)) continue
      sentences.push(paragraph.slice(from, end).trim())
      from = end
    }
    sentences.push(paragraph.slice(from).trim())
  }
  return sentences.filter((sentence) => HAS_WORD.test(sentence))
}

/**
 * Number of sentences in `text`: 0 for text with no words, otherwise at
 * least 1. Handles abbreviations, initials, decimals and ellipses (see the
 * module doc).
 *
 * @example
 * sentenceCount("Dr. Smith measured 3.5 cm... then left. It rained.") // 2
 */
export function sentenceCount(text: string): number {
  return listSentences(text).length
}
