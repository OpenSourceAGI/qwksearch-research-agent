/**
 * @fileoverview Is the card's quoted text all there? A debate card pasted
 * from a source can be whole, cut down to "[...]" fragments, cut off in the
 * middle of a word, or missing altogether. The citation card shows that as a
 * status icon, and a missing text is the one a reader can offer to fill in.
 *
 * - `missing`: no quoted text at all.
 * - `partial`: only ellipsis fragments ("[...]"), a stub of a few words, text
 *   that is mostly short fragments between ellipses, or text that stops short
 *   (ends in an ellipsis or with no closing punctuation, e.g. "currently consi").
 * - `full`: enough unbroken words that end the way a sentence ends. `underlined`
 *   says whether it carries `==underlining==`, the way a read-aloud card does.
 *
 * Pure string logic, no DOM.
 *
 * @module card-text-status
 */

/** Whether a card's quoted text is complete. */
export type CardTextStatus = "full" | "partial" | "missing"

export interface CardTextAnalysis {
  status: CardTextStatus
  /** Words of real text, ellipses and underline marks not counted. */
  words: number
  /** The text carries `==underlined==` runs. */
  underlined: boolean
  /** The text stops short: it ends in an ellipsis or with no closing punctuation. */
  truncated: boolean
  /** Number of `[...]` / `…` markers in the text. */
  ellipses: number
}

/** A text with fewer words than this is a stub, whatever it says. */
export const MIN_FULL_WORDS = 8

/** Between ellipses, fragments average at least this many words for the text to count as whole. */
export const MIN_FRAGMENT_WORDS = 8

const ELLIPSIS = /\[\s*(?:\.{3}|…)\s*\]|\(\s*(?:\.{3}|…)\s*\)|\.{3,}|…/g
const ENDS_LIKE_A_SENTENCE = /[.!?:;]["”’')\]*_=]*$/

/** Read the quoted text of a card (one string or its paragraphs) and say whether it is complete. */
export function analyzeCardText(cardText: string | readonly string[] | null | undefined): CardTextAnalysis {
  const raw = (Array.isArray(cardText) ? cardText.join("\n") : (cardText ?? "")) as string
  const underlined = /==[^=\s](?:[^=]*[^=\s])?==/.test(raw)
  const text = raw.replace(/==/g, "").replace(/\s+/g, " ").trim()
  if (!text) return { status: "missing", words: 0, underlined: false, truncated: false, ellipses: 0 }

  const ellipses = (text.match(ELLIPSIS) ?? []).length
  const fragments = text
    .split(ELLIPSIS)
    .map((part) => part.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0)
    .filter((count) => count > 0)
  const words = fragments.reduce((sum, count) => sum + count, 0)

  const endsWithEllipsis = /(?:\[\s*(?:\.{3}|…)\s*\]|\.{3,}|…)["”’')\]*_=]*$/.test(text)
  const truncated = endsWithEllipsis || !ENDS_LIKE_A_SENTENCE.test(text)
  const choppy = ellipses > 0 && fragments.length > 0 && words / fragments.length < MIN_FRAGMENT_WORDS

  if (words === 0) return { status: "partial", words, underlined, truncated: true, ellipses }
  const status: CardTextStatus = words < MIN_FULL_WORDS || truncated || choppy ? "partial" : "full"
  return { status, words, underlined, truncated, ellipses }
}

/** Shorthand for `analyzeCardText(text).status`. */
export function cardTextStatus(cardText: string | readonly string[] | null | undefined): CardTextStatus {
  return analyzeCardText(cardText).status
}
