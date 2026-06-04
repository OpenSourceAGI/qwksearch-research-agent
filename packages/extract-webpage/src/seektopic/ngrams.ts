/**
 * @fileoverview Utility for extracting noun-anchored n-grams from tokenized text.
 * Implements logic to find high-quality candidate phrases.
 */
import type { NgramMap, TopicToken } from "./types";
import { isWordCommonIgnored } from "../tokenize/word-is-ignored";

/** POS tag values that qualify as topic-worthy terms (noun=1, wiki-entity=5) */
const TOPIC_TAGS = new Set([1, 5]);

/**
 * Extracts noun-anchored edge-grams from a token array and accumulates them into `nGrams`.
 *
 * An edge-gram is a contiguous slice of `nGramSize` tokens where:
 * - The **first** and **last** tokens are topic entities (noun or wiki title).
 * - Every token is either a topic entity or a common stop word (e.g. "of", "the").
 * - Every token meets the `minWordLength` character threshold.
 *
 * This allows natural multi-word keyphrases like "state of the art" or
 * "machine learning" while ignoring pure function-word sequences.
 *
 * @param nGramSize - Number of tokens in the slice to evaluate.
 * @param terms - Full token array for the current sentence.
 * @param index - Start position for this slice within `terms`.
 * @param nGrams - Accumulator map mutated in-place: `nGrams[size][phrase] = [sentenceIdx, ...]`.
 * @param minWordLength - Minimum character length for any word to be included.
 * @param sentenceIndex - Index of the originating sentence, appended to the phrase's entry.
 * @returns The same `nGrams` reference (mutated).
 *
 * @example
 * const terms: TopicToken[] = [["machine", 1, 4, ""], ["learning", 1, 5, ""]];
 * const nGrams: NgramMap = {};
 * extractNounEdgeGrams(2, terms, 0, nGrams, 3, 0);
 * // nGrams[2]["machine learning"] === [0]
 */
export function extractNounEdgeGrams(
  nGramSize: number,
  terms: TopicToken[],
  index: number,
  nGrams: NgramMap,
  minWordLength: number,
  sentenceIndex: number,
): NgramMap {
  // Bail early if the slice would extend past the end of the array
  if (index + nGramSize - 1 >= terms.length) return nGrams;

  const slice = terms.slice(index, index + nGramSize);

  // Edge tokens must be topic entities
  if (!TOPIC_TAGS.has(slice[0][1]) || !TOPIC_TAGS.has(slice[nGramSize - 1][1])) return nGrams;

  // Every token must meet length + category requirements
  for (let i = 0; i < slice.length; i++) {
    const [word, tag] = slice[i];
    if (word.length < minWordLength) return nGrams;
    if (!TOPIC_TAGS.has(tag) && !isWordCommonIgnored(word)) return nGrams;
  }

  const bucket = nGrams[nGramSize] ?? (nGrams[nGramSize] = {});
  const phrase = slice.map(t => t[0]).join(" ");
  (bucket[phrase] ?? (bucket[phrase] = [])).push(sentenceIndex);

  return nGrams;
}
