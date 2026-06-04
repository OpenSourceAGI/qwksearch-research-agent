/**
 * @fileoverview Implementation of TextRank algorithm for ranking sentences based on keyphrase centrality.
 * Uses random walk simulations to identify the most relevant sentences in a document.
 */
import type { SentenceEntry, RankOptions } from "./types";

/**
 * Selects the next vertex in a random walk using weighted sampling.
 *
 * Instead of building a distribution array (O(totalWeight) space per step),
 * this scans the adjacency map once with a single random draw \u2014 O(degree) time
 * and O(1) additional space.
 *
 * @param adjacent - Map of neighbour key \u2192 edge weight.
 * @returns The selected neighbour key.
 */
function weightedRandom(adjacent: Map<string, number>): string {
  let total = 0;
  for (const w of adjacent.values()) total += w;

  let r = Math.random() * total;
  for (const [key, w] of adjacent) {
    r -= w;
    if (r <= 0) return key;
  }

  // Floating-point rounding safety: return the last entry
  return [...adjacent.keys()][adjacent.size - 1];
}

/**
 * ### TextRank: Rank Sentences by Centrality to Shared Keyphrases
 *
 * Builds a weighted undirected graph where each node is a sentence and edges
 * connect sentences that share keyphrases. Sentence importance is estimated by
 * a random-walk simulation (analogous to PageRank): nodes visited more often
 * during the walk are considered more central to the document's key concepts.
 *
 * **Key optimisations vs. na\u00efve implementation:**
 * - Weighted sampling via a single O(degree) scan instead of an O(weight) array.
 * - `Set`-based keyphrase intersection (O(1) lookup) instead of `Array.includes`.
 * - `Map<text, index>` for O(1) weight increment instead of O(n) linear scan.
 * - Flat `Map<string, Map<string, number>>` graph \u2014 no object-method overhead.
 * - Periodic forced reset prevents the walk from getting stuck in dense clusters.
 *
 * **References:**
 * 1. Zhao & Xie (2021) \u2014 "An Improved TextRank Multi-feature Fusion Algorithm"
 *    https://iopscience.iop.org/article/10.1088/1742-6596/2078/1/012021/pdf
 * 2. Pan et al. (2019) \u2014 "An improved TextRank keywords extraction algorithm"
 *    https://dl.acm.org/doi/10.1145/3321408.3326659
 *
 * @param sentencesWithKeyphrases - Sentences with pre-attached keyphrase lists.
 * @param options - Walk parameters.
 * @returns The same array with `weight` set on each sentence, or `undefined`
 *          if no edges exist (no shared keyphrases between any pair).
 */
export function rankSentencesCentralToKeyphrase(
  sentencesWithKeyphrases: SentenceEntry[],
  options: RankOptions = {},
): SentenceEntry[] | undefined {
  const { iterations = 1000, resetInterval = 100 } = options;

  // \u2500\u2500 Build graph \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // graph: sentence text \u2192 { neighbour text \u2192 edge weight }
  const graph = new Map<string, Map<string, number>>();

  // text \u2192 array index for O(1) weight increments during the walk
  const textToIndex = new Map<string, number>();

  const sentences: SentenceEntry[] = sentencesWithKeyphrases.map((s, i) => {
    textToIndex.set(s.text, i);
    return { ...s, weight: 0 };
  });

  for (let i = 0; i < sentences.length; i++) {
    const kp1 = sentences[i].keyphrases;

    for (let j = i + 1; j < sentences.length; j++) {
      const kp2 = sentences[j].keyphrases;

      // Compare shorter list against a Set built from the longer list
      let longerList = kp1;
      let shorterList = kp2;
      if (kp2.length > kp1.length) { longerList = kp2; shorterList = kp1; }

      const shorterSet = new Set(shorterList.map(k => k.keyphrase));

      let edgeWeight = 0;
      for (const k of longerList) {
        if (shorterSet.has(k.keyphrase)) edgeWeight += k.weight / 100;
      }

      if (edgeWeight > 0) {
        const ti = sentences[i].text;
        const tj = sentences[j].text;

        if (!graph.has(ti)) graph.set(ti, new Map());
        if (!graph.has(tj)) graph.set(tj, new Map());
        graph.get(ti)!.set(tj, edgeWeight);
        graph.get(tj)!.set(ti, edgeWeight);
      }
    }
  }

  const allVertices = [...graph.keys()];
  if (allVertices.length === 0) return undefined;

  // \u2500\u2500 Random walk \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let currentKey = allVertices[Math.floor(Math.random() * allVertices.length)];

  for (let i = 0; i < iterations; i++) {
    // Periodic reset \u2014 escape dense clusters and improve global coverage
    if (i % resetInterval === 0) {
      currentKey = allVertices[Math.floor(Math.random() * allVertices.length)];
    }

    const adjacent = graph.get(currentKey);
    if (!adjacent || adjacent.size === 0) {
      currentKey = allVertices[Math.floor(Math.random() * allVertices.length)];
      continue;
    }

    const nextKey = weightedRandom(adjacent);

    const idx = textToIndex.get(nextKey);
    if (idx !== undefined) sentences[idx].weight++;

    currentKey = nextKey;
  }

  return sentences;
}
