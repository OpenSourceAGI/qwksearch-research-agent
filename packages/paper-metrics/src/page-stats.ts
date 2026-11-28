/**
 * @fileoverview Page stats from Markdown/MDX: words, reading time,
 * sections, links, figures, citations, highlights and so on, plus the
 * readability metrics of the page's running prose — what a docs page's
 * "Page stats" panel shows (see `format.ts` for its rows).
 *
 * @module page-stats
 */
import { getTextMetrics, readingMinutes, type TextMetrics } from "./metrics.js"
import { listWords } from "./text.js"

export interface PageStats {
  words: number
  characters: number
  readingMinutes: number
  /** Sentences of the running prose. */
  sentences: number
  paragraphs: number
  /** Top-level sections (`##` headings). */
  sections: number
  /** Every heading in the table of contents. */
  headings: number
  links: number
  /** Images (Markdown `![]()` and `<img>`). */
  figures: number
  tables: number
  codeBlocks: number
  /** Author-date citations, `(Smith 2004)` or `Smith (2004)`, and `[^n]` footnote marks. */
  citations: number
  /** `==highlighted==` passages. */
  highlights: number
  /** Readability of the page's running prose (see {@link readableProse}). */
  metrics: TextMetrics
}

const HAS_WORD = /[\p{L}\p{N}]/u
/**
 * Author-date citations: each part of `(Smith 2004, 12; Jones and Lee 1999a)`,
 * or a narrative `Smith (2004)` / `Smith et al. (2004)`.
 */
const AUTHOR_DATE =
  /(?:\((?:cf\. |see )?|; )\p{Lu}[\p{L}'’.-]+(?: (?:et al\.|and|&) \p{Lu}[\p{L}'’.-]*)?,? \d{4}[a-z]?(?=[;,:)])|\p{Lu}[\p{L}'’.-]+(?: et al\.)?(?:'s|’s)? \(\d{4}[a-z]?[,)]/gu
const FENCE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm

/** Number of author-date citations in `text`, `(Smith 2004; Lee 1999)` counting as two. */
export function countAuthorDateCitations(text: string): number {
  return text.match(AUTHOR_DATE)?.length ?? 0
}

/** Strips Markdown/MDX syntax down to the words a reader sees. */
function proseOf(markdown: string): string {
  return markdown
    .replace(FENCE, " ")
    .replace(/^---\n[\s\S]*?\n---\n/, " ")
    .replace(/^\s*(import|export)\s.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/==|[*_#>|~]/g, " ")
}

/**
 * A page's running prose for the readability scores: no frontmatter, code,
 * headings, tables, links' URLs, citations or highlight marks. Each paragraph
 * ends up on its own line so a paragraph break also ends a sentence.
 */
export function readableProse(markdown: string): string {
  return markdown
    .replace(FENCE, "\n\n")
    .replace(/^---\n[\s\S]*?\n---\n/, "\n\n")
    .replace(/^\s*(import|export)\s.*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s.*$/gm, "\n")
    .replace(/^\s*\|.*$/gm, "")
    .replace(/^\s*[-*+]\s+|^\s*\d+[.)]\s+|^\s*>\s?/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\^[^\]]+\]:?/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(AUTHOR_DATE, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/==|[*_~]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
}

/**
 * Stats for one Markdown/MDX page.
 *
 * @param markdown - The page's Markdown (e.g. Fumadocs' `page.data.getText('processed')`).
 * @param toc - The page's table of contents (each heading's `depth`).
 */
export function pageStats(markdown: string, toc: ReadonlyArray<{ depth: number }> = []): PageStats {
  const prose = proseOf(markdown)
  const words = listWords(prose).length
  const withoutCode = markdown.replace(FENCE, "")
  const paragraphs = withoutCode
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|\||import\s|export\s|<\/?[A-Za-z]|!\[|---)/.test(block) && HAS_WORD.test(block)).length
  const metrics = getTextMetrics(readableProse(markdown))

  return {
    words,
    characters: prose.replace(/\s+/g, " ").trim().length,
    readingMinutes: readingMinutes(words),
    sentences: metrics.sentences,
    paragraphs,
    sections: toc.filter((item) => item.depth === 2).length,
    headings: toc.length,
    links: withoutCode.match(/(?<!!)\[[^\]]+\]\([^)]+\)/g)?.length ?? 0,
    figures: (withoutCode.match(/!\[[^\]]*\]\([^)]+\)/g)?.length ?? 0) + (withoutCode.match(/<img\b/gi)?.length ?? 0),
    tables: withoutCode.match(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm)?.length ?? 0,
    codeBlocks: markdown.match(FENCE)?.length ?? 0,
    citations: countAuthorDateCitations(withoutCode) + (withoutCode.match(/\[\^[^\]]+\](?!:)/g)?.length ?? 0),
    highlights: withoutCode.match(/==(?=\S)[\s\S]*?\S==/g)?.length ?? 0,
    metrics,
  }
}
