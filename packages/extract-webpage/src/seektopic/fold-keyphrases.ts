/**
 * @fileoverview Utility for grouping and merging similar keyphrases.
 * Handles normalization and score aggregation for related terms.
 */
import type { KeyphraseEntry } from "./types";

/**
 * Folds smaller keyphrases that are near-subsets of larger ones, merging their
 * weights and sentence lists upward.
 *
 * Two phrases are considered overlapping when they share all-but-one word
 * (i.e., the number of words in the smaller phrase that do **not** appear in
 * the larger phrase is fewer than 2). When a merge occurs:
 * - The larger phrase absorbs a fraction of the smaller one's weight
 *   (`smallWeight / largerWordCount`).
 * - Sentence indices are union-merged.
 * - If the smaller phrase actually outweighs the larger at that point, the
 *   larger entry adopts the smaller phrase's text (best representative wins).
 *
 * Phrases are processed largest-first so that supersets are always evaluated
 * before their constituent sub-phrases.
 *
 * @param keyphrases - Raw scored keyphrases, any order.
 * @returns Deduplicated, folded array \u2014 larger representative phrases only.
 *
 * @example
 * const folded = foldSubphrases([
 *   { keyphrase: "machine learning", words: 2, weight: 10, sentences: [0, 1] },
 *   { keyphrase: "machine",          words: 1, weight:  4, sentences: [0, 2] },
 * ]);
 * // "machine" is absorbed into "machine learning"
 */
export function foldSubphrases(keyphrases: KeyphraseEntry[]): KeyphraseEntry[] {
  // Largest n-grams first so supersets are already in `folded` when we check
  const sorted = keyphrases.slice().sort((a, b) => b.words - a.words);
  const folded: KeyphraseEntry[] = [];

  outer: for (const curr of sorted) {
    const currWords = curr.keyphrase.split(" ");

    for (const existing of folded) {
      const existingWords = existing.keyphrase.split(" ");

      // Count how many words in curr are absent from existing
      let diff = 0;
      for (const w of currWords) {
        if (!existingWords.includes(w) && ++diff >= 2) break;
      }

      if (diff < 2) {
        // Absorb curr's weight (proportionally discounted by target word count)
        existing.weight += curr.weight / existingWords.length;

        // Union of sentence indices
        const existingSentences = Array.isArray(existing.sentences)
          ? existing.sentences
          : typeof existing.sentences === "string"
            ? existing.sentences.split(",").map(Number).filter((n) => !isNaN(n))
            : [];
        const currSentences = Array.isArray(curr.sentences)
          ? curr.sentences
          : typeof curr.sentences === "string"
            ? curr.sentences.split(",").map(Number).filter((n) => !isNaN(n))
            : [];

        const sentSet = new Set<number>(existingSentences);
        for (const s of currSentences) sentSet.add(s);
        existing.sentences = Array.from(sentSet);

        // Promote curr as the representative if it now outweighs existing
        if (existing.weight < curr.weight) {
          existing.keyphrase = curr.keyphrase;
          existing.words = curr.words;
        }

        continue outer; // merged \u2014 skip push
      }
    }

    // No compatible existing phrase found \u2014 add as new entry
    if (curr.sentences.length >= 1) {
      folded.push({ ...curr });
    }
  }

  return folded;
}
