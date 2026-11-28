/**
 * @fileoverview HTML → plain prose for the metrics, without a DOM, so it runs
 * the same in Node, Workers and the browser. Block elements become blank
 * lines (so each paragraph, heading and list item is its own paragraph and
 * ends its sentence); scripts, styles and other non-prose are dropped.
 *
 * @module html
 */
import { getTextMetrics, type TextMetrics } from "./metrics.js"

const DROP = /<(script|style|noscript|template|svg|math|head|iframe|object|canvas|button|select)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const BLOCK =
  /<\/?(?:p|div|section|article|aside|header|footer|main|nav|h[1-6]|li|ul|ol|dl|dt|dd|blockquote|pre|figure|figcaption|table|thead|tbody|tfoot|tr|td|th|caption|details|summary|hr|address|form|fieldset)\b[^>]*>/gi
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" }

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED[entity.toLowerCase()] ?? match
  })
}

/** The readable text of an HTML fragment or page, one paragraph per block element. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(DROP, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(BLOCK, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** {@link getTextMetrics} of an HTML fragment or page's text. */
export function getHtmlMetrics(html: string): TextMetrics {
  return getTextMetrics(htmlToText(html))
}
