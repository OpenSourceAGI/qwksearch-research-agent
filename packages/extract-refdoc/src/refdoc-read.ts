/**
 * @fileoverview Reading a `.refdoc.html` file back into its pages. Shared by
 * the browser runtime (which boots the docs UI from it) and `parseRefdoc` in
 * Node (via linkedom), so both see the same document. DOM only, no imports.
 *
 * The file layout (written by `renderRefdocHtml` in `refdoc.ts`):
 *
 * ```html
 * <script type="application/refdoc+json" id="refdoc-meta">{ "format": "refdoc", "version": 1, "title": … }</script>
 * <div id="refdoc-root">
 *   <article data-refdoc-page="" data-title="…">…overview html…</article>
 *   <article data-refdoc-page="01-introduction" data-title="Introduction" data-part="…">…</article>
 *   <article data-refdoc-page="references" data-title="References">…</article>
 * </div>
 * ```
 *
 * The pages are plain HTML, so the file reads fine with no script at all,
 * and the content exists exactly once. Each article's id is its slug (the
 * overview's is `overview`) and every heading id is prefixed with its page
 * slug, so one `#id` names a page or a place on it, with or without the
 * runtime. Elements marked `data-refdoc-fallback` (the title block) are
 * dropped by the runtime, which renders its own.
 *
 * @module refdoc-read
 */

/** The refdoc format version this package writes and reads. */
export const REFDOC_VERSION = 1

/** Document-level metadata, stored as JSON in `#refdoc-meta`. */
export interface RefdocMeta {
  format: "refdoc"
  version: number
  title: string
  description?: string
  author?: string
  date?: string
  sourceUrl?: string
  cite?: string
  keywords?: string[]
  /** What wrote the file, e.g. "refdoc 0.2.0". */
  generator?: string
}

/** One heading inside a page, for the table of contents and search. */
export interface RefdocHeading {
  id: string
  title: string
  /** 2 for `<h2>`, 3 for `<h3>`, … */
  depth: number
}

/** One page: an `<article data-refdoc-page>`. */
export interface RefdocPage {
  /** "" for the overview page, else the URL slug. */
  slug: string
  title: string
  description?: string
  /** A part heading this page opens (a separator in the sidebar). */
  part?: string
  html: string
  headings: RefdocHeading[]
}

/** A whole refdoc. */
export interface RefdocDocument extends RefdocMeta {
  pages: RefdocPage[]
}

/** Read the meta JSON and every page from a parsed document. Throws when it is not a refdoc. */
export function readRefdocFromDocument(doc: Document): RefdocDocument {
  const metaEl = doc.getElementById("refdoc-meta")
  if (!metaEl) throw new Error("Not a refdoc: no <script id=\"refdoc-meta\">")
  const meta = JSON.parse(metaEl.textContent || "{}") as RefdocMeta
  if (meta.format !== "refdoc") throw new Error("Not a refdoc: #refdoc-meta has no format \"refdoc\"")

  const pages: RefdocPage[] = []
  for (const original of Array.from(doc.querySelectorAll("article[data-refdoc-page]"))) {
    // The title block is only for reading the file without the runtime, which shows its own.
    const article = original.cloneNode(true) as Element
    for (const el of Array.from(article.querySelectorAll("[data-refdoc-fallback]"))) el.remove()
    const headings: RefdocHeading[] = []
    for (const h of Array.from(article.querySelectorAll("h2[id], h3[id], h4[id]"))) {
      headings.push({ id: h.getAttribute("id")!, title: (h.textContent || "").replace(/\s+/g, " ").trim(), depth: Number(h.tagName.slice(1)) })
    }
    pages.push({
      slug: article.getAttribute("data-refdoc-page") || "",
      title: article.getAttribute("data-title") || meta.title,
      description: article.getAttribute("data-description") || undefined,
      part: article.getAttribute("data-part") || undefined,
      html: article.innerHTML,
      headings,
    })
  }
  return { ...meta, pages }
}
