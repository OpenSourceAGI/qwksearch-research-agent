const MIN_KEYPHRASE_LENGTH = 3

const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "all", "along", "also",
  "always", "among", "and", "any", "are", "around", "because", "before",
  "below", "between", "both", "but", "can", "cannot", "could", "does",
  "doing", "down", "during", "each", "either", "every", "first", "for",
  "from", "further", "has", "have", "having", "her", "here", "his", "how",
  "into", "its", "just", "more", "most", "not", "now", "once", "only",
  "other", "our", "out", "over", "same", "shall", "she", "should", "since",
  "some", "such", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "those", "through", "under", "until", "use",
  "very", "was", "were", "what", "when", "where", "which", "while", "who",
  "why", "will", "with", "would", "yet", "you", "your",
])

/**
 * Extracts significant lower-cased keyphrases (single words) from page
 * content, ranked by frequency (ties broken by first appearance).
 */
export function extractKeyphrases(content: string, maxKeyphrases = 50): string[] {
  const words = content.toLowerCase().match(/[a-z0-9]+/g) ?? []
  const counts = new Map<string, number>()

  for (const word of words) {
    if (word.length < MIN_KEYPHRASE_LENGTH || STOPWORDS.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeyphrases)
    .map(([word]) => word)
}

/**
 * Filters a frequency-ranked keyphrase list to those completing the last
 * word of the current search query, for an autocomplete dropdown.
 */
export function filterKeyphraseCompletions(
  keyphrases: string[],
  query: string,
  maxResults = 8
): string[] {
  const words = query.toLowerCase().split(/\s+/)
  const prefix = words[words.length - 1]
  if (!prefix) return []

  const results: string[] = []
  for (const keyphrase of keyphrases) {
    if (keyphrase === prefix) continue
    if (keyphrase.startsWith(prefix)) results.push(keyphrase)
    if (results.length >= maxResults) break
  }
  return results
}
