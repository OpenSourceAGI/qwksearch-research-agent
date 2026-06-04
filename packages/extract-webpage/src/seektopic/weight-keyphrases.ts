/**
 * @fileoverview Scoring logic for keyphrases based on Wiki-entities, specificity, and query bias.
 * Implements the ranking refinement steps of the SEEKTOPIC pipeline.
 */
import type { KeyphraseEntry, PhrasesModel } from "./types";
import { convertTextToTokens } from "../tokenize/text-to-topic-tokens";

/**
 * Applies two weighting passes to a keyphrase list:
 *
 * 1. **Wiki-entity bonus** \u2014 if any token in the phrase is a Wikipedia-linked
 *    entity (POS tag 5), the keyphrase weight is doubled and `wiki` is set.
 * 2. **IDF domain-specificity** \u2014 weight is multiplied by the average POS
 *    uniqueness score across the phrase's tokens. Rare, domain-specific terms
 *    (high uniqueness) receive a larger multiplier than common nouns.
 * 3. **Heavy-query bias** (optional) \u2014 if `heavyWeightQuery` is set, keyphrases
 *    that closely match the query words receive a large additive bonus, allowing
 *    dynamic re-ranking when a user clicks a term or arrives via a search query.
 *
 * @param keyphrases - Keyphrases to weight; mutated in-place for efficiency.
 * @param phrasesModel - Trie model passed to the tokenizer (may be undefined).
 * @param heavyWeightQuery - Space-separated query string to bias ranking toward.
 * @returns The same array with updated `weight` and `wiki` fields.
 *
 * @example
 * const weighted = weightKeyphrasesBySpecificity(keyphrases, model, "self attention");
 */
export function weightKeyphrasesBySpecificity(
  keyphrases: KeyphraseEntry[],
  phrasesModel: PhrasesModel | undefined,
  heavyWeightQuery: string,
): KeyphraseEntry[] {
  const querySplit = heavyWeightQuery ? heavyWeightQuery.split(" ") : [];

  for (const kp of keyphrases) {
    const tokens = convertTextToTokens(kp.keyphrase, { phrasesModel });

    // Wiki-entity bonus: any token with category 5 doubles the weight
    if (tokens.some(t => t[1] === 5)) {
      kp.wiki = true;
      kp.weight *= 2;
    }

    // IDF domain-specificity: scale by average token uniqueness score (index [1])
    // Tokens without a score default to 4 (mid-range common noun)
    const idfAvg = tokens.reduce((sum, t) => sum + (t[1] ?? 4), 0) / tokens.length;
    kp.weight = Math.floor(kp.weight * idfAvg);

    // Heavy-query bias: boost phrases that closely match the query
    if (querySplit.length) {
      const diffWords = querySplit.filter(w => !kp.keyphrase.includes(w)).length;
      if (diffWords < 4 && diffWords < querySplit.length - 1) {
        kp.weight += 4000 - diffWords * 1000;
      }
    }
  }

  return keyphrases;
}
