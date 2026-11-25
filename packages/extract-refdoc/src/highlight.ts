/**
 * @fileoverview Card underlining: the `==text==` marks the Underlining toggle
 * shows, written so the marked words read on their own as a sentence, the way
 * a debater reads only the underlined part of a card.
 *
 * Two ways to get them:
 * - `applyUnderlines` wraps phrases chosen elsewhere (the AI pass in
 *   `ai.ts`) — only phrases that occur verbatim in the paragraph are marked,
 *   so the prose itself is never changed.
 * - `autoUnderline` is the offline fallback: it marks the core clause of the
 *   paragraph's topic sentence and of its strongest claim sentence.
 *
 * @module highlight
 */

/** Remove every `==` marker, leaving the prose. */
export function stripUnderlines(markdown: string): string {
  return markdown.replace(/==/g, "")
}

/** True when the paragraph already carries underlining. */
export function hasUnderlines(markdown: string): boolean {
  return /==[^=]+==/.test(markdown)
}

/** The underlined runs of a paragraph, in order. */
export function underlinedRuns(markdown: string): string[] {
  return Array.from(markdown.matchAll(/==([^=]+)==/g), (match) => match[1].trim()).filter(Boolean)
}

/**
 * Wrap each phrase that occurs verbatim in `paragraph` with `==…==`. Phrases
 * that are missing, overlap an earlier one, or would split a link or other
 * markdown token are skipped. Existing marks are kept.
 */
export function applyUnderlines(paragraph: string, phrases: string[]): string {
  const ranges: Array<[number, number]> = []
  // Positions already inside marks, links or images stay untouched.
  const blocked: Array<[number, number]> = []
  for (const match of paragraph.matchAll(/==[^=]+==|!?\[[^\]]*\]\([^)]*\)|`[^`]*`/g)) {
    blocked.push([match.index ?? 0, (match.index ?? 0) + match[0].length])
  }
  const overlaps = (start: number, end: number, list: Array<[number, number]>) =>
    list.some(([s, e]) => start < e && end > s)

  for (const raw of phrases) {
    const phrase = raw.trim().replace(/^==|==$/g, "")
    if (phrase.length < 2) continue
    let from = 0
    while (from < paragraph.length) {
      const start = paragraph.indexOf(phrase, from)
      if (start < 0) break
      const end = start + phrase.length
      if (!overlaps(start, end, blocked) && !overlaps(start, end, ranges)) {
        ranges.push([start, end])
        break
      }
      from = start + 1
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  let out = ""
  let cursor = 0
  for (const [start, end] of ranges) {
    out += `${paragraph.slice(cursor, start)}==${paragraph.slice(start, end)}==`
    cursor = end
  }
  return out + paragraph.slice(cursor)
}

/** Split text into sentences, keeping common abbreviations together. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/g) ?? []
  const sentences: string[] = []
  for (const part of parts) {
    const previous = sentences[sentences.length - 1]
    // "e.g." / "et al." / "U.S." / a single initial: glue to the previous fragment.
    if (previous && /(?:\b(?:e\.g|i\.e|et al|vs|cf|Dr|Mr|Ms|Mrs|No|Fig|U\.S|[a-zA-Z]))\.$/.test(previous.trim())) {
      sentences[sentences.length - 1] = previous + part
    } else if (part.trim()) {
      sentences.push(part)
    }
  }
  return sentences.map((s) => s.trim()).filter(Boolean)
}

/** Words that signal the sentence carries the paragraph's claim. */
const CLAIM_SIGNAL =
  /\b(therefore|thus|hence|so that|because|must|should|cannot|can't|shows?|proves?|means|we argue|this paper|in short|the point|key|critical|crucial|instead|rather than|outweighs?)\b/i

const TRAILING_FUNCTION_WORD = /^(of|the|a|an|to|in|and|or|but|for|with|by|on|at|from|as|that|which|who|is|are|was|were|be|its|their|this|these|than)$/i

/** The core clause of a sentence: up to its first clause break, else its first dozen words. */
export function coreClause(sentence: string): string {
  const clean = sentence.replace(/==/g, "").trim()
  const breakAt = clean.search(/[,;:—–(]|\s-\s/)
  const head = breakAt > 0 ? clean.slice(0, breakAt) : clean
  const words = head.split(/\s+/).filter(Boolean)
  const picked = words.length >= 4 ? words.slice(0, 18) : clean.split(/\s+/).slice(0, 12)
  // Don't end a marked run on a dangling function word ("…positions of").
  while (picked.length > 4 && TRAILING_FUNCTION_WORD.test(picked[picked.length - 1])) picked.pop()
  return picked
    .join(" ")
    .replace(/[\s.,;:!?"'“”‘’)\]]+$/, "")
    .replace(/^[\s"'“”‘’([]+/, "")
}

/**
 * Offline underlining: marks the core clause of the topic (first) sentence
 * and of the strongest claim sentence after it. Paragraphs that already carry
 * marks, or are too short to be a card, are returned unchanged.
 */
export function autoUnderline(paragraph: string): string {
  if (hasUnderlines(paragraph)) return paragraph
  // Mark against the paragraph without link/image syntax in the way.
  const sentences = splitSentences(paragraph.replace(/!?\[[^\]]*\]\([^)]*\)/g, " "))
  if (sentences.length === 0 || paragraph.split(/\s+/).length < 12) return paragraph
  const phrases = [coreClause(sentences[0])]
  const claim = sentences.slice(1).find((sentence) => CLAIM_SIGNAL.test(sentence))
  if (claim) phrases.push(coreClause(claim))
  return applyUnderlines(
    paragraph,
    phrases.filter((phrase) => phrase.split(/\s+/).length >= 3 && !/[*`[\]]/.test(phrase)),
  )
}
