/**
 * @fileoverview Stats for the Info → Page stats panel of one rendered refdoc
 * page: the page structure (paragraphs, figures, citations, highlights) is
 * counted from the DOM, and every text metric (words, sentences, reading
 * time, readability) comes from `paper-metrics`. DOM only, so it runs in
 * the browser runtime and in Node with linkedom/jsdom.
 *
 * Words and characters count everything a reader sees, headings and
 * captions included; sentences and the readability scores use the running
 * prose only (no headings, captions or citation markers).
 *
 * @module page-info
 */
import { countAuthorDateCitations, getTextMetrics, type PageInfo, type TextMetrics } from "paper-metrics"

/** Not part of the page's text. */
const SKIP = 'script, style, noscript, template, svg, button, select, nav, .refdoc-toolbar, .ptw-toolbar, [aria-hidden="true"], [data-refdoc-fallback]'
const PROSE = "p, li, blockquote, dd, td, th, summary"
const TEXT = `h1, h2, h3, h4, h5, h6, figcaption, ${PROSE}`
const HAS_WORD = /[\p{L}\p{N}]/u

export interface RefdocPageInfo {
  /** The panel's counts (see `pageInfoRows` in paper-metrics). */
  stats: PageInfo
  /** Readability of the page's running prose. */
  metrics: TextMetrics
  /** Whether the page has card underlining, so the Highlights row applies. */
  showHighlights: boolean
}

const textOf = (el: Element) => (el.textContent || "").replace(/\s+/g, " ").trim()

/** The innermost `selector` blocks under `root` (a list item holding paragraphs yields the paragraphs). */
function leafBlocks(root: Element, selector: string): Element[] {
  return Array.from(root.querySelectorAll(selector)).filter((el) => !el.querySelector(selector))
}

/** Page stats for the rendered page content under `content` (e.g. the `.ptw-content` element). */
export function refdocPageInfo(content: Element): RefdocPageInfo {
  const clone = content.cloneNode(true) as Element
  for (const el of Array.from(clone.querySelectorAll(SKIP))) el.remove()

  const highlights = clone.querySelectorAll("mark.debate-hl").length
  const linkedCitations = clone.querySelectorAll("a.refdoc-cite").length
  const figures = clone.querySelectorAll("figure").length + Array.from(clone.querySelectorAll("img")).filter((img) => !img.closest("figure")).length
  const paragraphs =
    leafBlocks(clone, "p").filter((p) => HAS_WORD.test(textOf(p))).length +
    Array.from(clone.querySelectorAll("ul, ol")).filter((list) => !list.parentElement?.closest("ul, ol") && !list.querySelector("p") && HAS_WORD.test(textOf(list))).length

  for (const el of Array.from(clone.querySelectorAll("a.refdoc-cite"))) el.remove()
  const allText = leafBlocks(clone, TEXT).map(textOf).filter(Boolean).join("\n\n")
  for (const el of Array.from(clone.querySelectorAll("figure, figcaption"))) el.remove()
  const prose = leafBlocks(clone, PROSE).map(textOf).filter(Boolean).join("\n\n")

  const all = getTextMetrics(allText)
  const metrics = getTextMetrics(prose)
  return {
    stats: {
      words: all.words,
      readingMinutes: all.readingMinutes,
      characters: all.characters,
      sentences: metrics.sentences,
      paragraphs,
      figures,
      citations: linkedCitations + countAuthorDateCitations(prose),
      highlights,
    },
    metrics,
    showHighlights: highlights > 0,
  }
}
