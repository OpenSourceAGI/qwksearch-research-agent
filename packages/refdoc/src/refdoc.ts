/**
 * @fileoverview The refdoc format: one shareable `.refdoc.html` file that
 * holds the whole document and opens as a full Fumadocs docs site.
 *
 * The file carries every page as plain HTML (`<article data-refdoc-page>`),
 * a little metadata JSON, and two tags that load the runtime from a CDN:
 *
 * ```html
 * <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/refdoc@0/dist/refdoc.css">
 * <script defer src="https://cdn.jsdelivr.net/npm/refdoc@0/dist/refdoc.js"></script>
 * ```
 *
 * The runtime (`runtime/main.tsx`, built to `dist/refdoc.js`) reads the
 * pages out of the file and boots Fumadocs UI in the browser: sidebar,
 * table of contents, ⌘K search, previous/next, light and dark, plus the
 * Reader mode / Underlining / Voice bar and linked references. With no
 * network the file still reads as one long page. `runtime: "inline"` (or
 * `{ js, css }`) embeds the runtime itself for a file that works fully
 * offline, at the cost of size.
 *
 * `paperToRefdoc(paper)` is the converter from a `Paper` (any PDF, link,
 * DOI or text, via `convertToPaper`); `renderRefdocHtml(doc)` writes any
 * `RefdocDocument`, so other sources can produce refdocs too; and
 * `parseRefdoc(html)` reads one back.
 *
 * @module refdoc
 */
import { parseHTML } from "linkedom"
import { figureHtml, paragraphsHtml } from "./html"
import { escapeHtml, markdownInlineToHtml, markdownToPlainText } from "./markdown"
import { sectionSlug, slugify } from "./mdx"
import { readRefdocFromDocument, REFDOC_VERSION, type RefdocDocument, type RefdocMeta, type RefdocPage } from "./refdoc-read"
import type { Paper } from "./types"

export { readRefdocFromDocument, REFDOC_VERSION, type RefdocDocument, type RefdocHeading, type RefdocMeta, type RefdocPage } from "./refdoc-read"

/** This package's version, written into each file's `generator`. */
export const REFDOC_PACKAGE_VERSION = "0.2.0"

/** Where the runtime is served from: the npm package on jsDelivr, any 0.x. */
export const REFDOC_CDN = "https://cdn.jsdelivr.net/npm/refdoc@0/dist"

/** The id of the overview page's `<article>` (its slug is ""). */
export const OVERVIEW_ID = "overview"

/** How the file gets its runtime. */
export type RefdocRuntime =
  /** Load `refdoc.js` and `refdoc.css` from `REFDOC_CDN` (the default). */
  | "cdn"
  /** Load them from another base URL, e.g. "./" next to the file, or a pinned version. */
  | { base: string }
  /** Embed them, for a file that works offline. */
  | { js: string; css: string }

export interface RenderRefdocOptions {
  runtime?: RefdocRuntime
}

function escapeJsonForScript(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
}

function escapeInlineScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script")
}

/** Readable styles for the file before (or without) the runtime. */
const FALLBACK_CSS = `#refdoc-root{max-width:46rem;margin:0 auto;padding:1.5rem 1rem 4rem;font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1917}
#refdoc-root article{border-bottom:1px solid #e7e5e4;padding-bottom:2rem;margin-bottom:2rem}
#refdoc-root img{max-width:100%;height:auto}#refdoc-root a{color:#2563eb}
#refdoc-root mark.debate-hl{background:#fef08a}
@media (prefers-color-scheme:dark){body{background:#0c0a09}#refdoc-root{color:#e7e5e4}#refdoc-root article{border-color:#292524}#refdoc-root a{color:#60a5fa}#refdoc-root mark.debate-hl{background:#854d0e;color:inherit}}
html.refdoc-booting #refdoc-root{visibility:hidden}`

/** Write any `RefdocDocument` as one `.refdoc.html` file (see the module doc). */
export function renderRefdocHtml(doc: RefdocDocument, options: RenderRefdocOptions = {}): string {
  const { pages, ...rest } = doc
  const meta: RefdocMeta = { ...rest, format: "refdoc", version: REFDOC_VERSION, generator: rest.generator ?? `refdoc ${REFDOC_PACKAGE_VERSION}` }
  const runtime = options.runtime ?? "cdn"

  let head: string
  let tail: string
  if (typeof runtime === "object" && "js" in runtime) {
    head = `<style id="refdoc-runtime-css">${runtime.css.replace(/<\/style/gi, "<\\/style")}</style>`
    tail = `<script id="refdoc-runtime">${escapeInlineScript(runtime.js)}</script>`
  } else {
    const base = (runtime === "cdn" ? REFDOC_CDN : runtime.base).replace(/\/+$/, "")
    head = `<link rel="stylesheet" href="${escapeHtml(base)}/refdoc.css" />`
    tail = `<script defer src="${escapeHtml(base)}/refdoc.js"></script>`
  }

  const articles = pages.map((page) => {
    const attrs = [
      `id="${escapeHtml(page.slug || OVERVIEW_ID)}"`,
      `data-refdoc-page="${escapeHtml(page.slug)}"`,
      `data-title="${escapeHtml(page.title)}"`,
      page.description ? `data-description="${escapeHtml(page.description)}"` : "",
      page.part ? `data-part="${escapeHtml(page.part)}"` : "",
    ].filter(Boolean)
    const heading = page.slug === "" ? "h1" : "h2"
    const fallback = `<header data-refdoc-fallback>${page.part ? `<p><small>${escapeHtml(page.part)}</small></p>` : ""}<${heading}>${escapeHtml(page.title)}</${heading}>${page.description ? `<p><em>${escapeHtml(page.description)}</em></p>` : ""}</header>`
    return `<article ${attrs.join(" ")}>\n${fallback}\n${page.html}\n</article>`
  })

  return `<!doctype html>
<html lang="en" class="refdoc-booting">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="${escapeHtml(meta.generator!)}" />
<title>${escapeHtml(meta.title)}</title>
${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}" />\n` : ""}${meta.author ? `<meta name="author" content="${escapeHtml(meta.author)}" />\n` : ""}<script>setTimeout(function(){document.documentElement.classList.remove("refdoc-booting")},2500)</script>
<style>${FALLBACK_CSS}</style>
${head}
<script type="application/refdoc+json" id="refdoc-meta">${escapeJsonForScript(JSON.stringify(meta))}</script>
</head>
<body>
<div id="refdoc-root">
${articles.join("\n")}
</div>
${tail}
</body>
</html>
`
}

/** Read a `.refdoc.html` file back (Node or any runtime; uses linkedom). */
export function parseRefdoc(html: string): RefdocDocument {
  const { document } = parseHTML(html)
  return readRefdocFromDocument(document as unknown as Document)
}

/**
 * Link numeric citations — `[3]`, `[3, 5]`, `[3–5]` — to their entries on
 * the references page, with the reference text as a tooltip.
 */
export function linkCitations(html: string, references: string[]): string {
  if (references.length === 0) return html
  const titles = references.map((ref) => escapeHtml(markdownToPlainText(ref).slice(0, 300)))
  const link = (n: number) => `<a class="refdoc-cite" href="#ref-${n}" title="${titles[n - 1]}">${n}</a>`
  // Only in text, never inside a tag.
  return html.replace(/(<[^>]*>)|\[(\d{1,4}(?:\s*[,–-]\s*\d{1,4})*)\]/g, (match, tag: string | undefined, list: string | undefined) => {
    if (tag || !list) return match
    const parts = list.split(/(\s*[,–-]\s*)/)
    const numbers = parts.filter((_, i) => i % 2 === 0).map(Number)
    if (numbers.some((n) => !(n >= 1 && n <= references.length))) return match
    return `[${parts.map((part, i) => (i % 2 === 0 ? link(Number(part)) : part)).join("")}]`
  })
}

/** The `Paper` → refdoc pages: an overview, one page per section, and the references. */
export function paperToRefdocDocument(paper: Paper): RefdocDocument {
  const pages: RefdocPage[] = []
  const cite = (html: string) => linkCitations(html, paper.references)

  // Overview: byline, figure, abstract, keywords, citation, contents.
  const overview: string[] = []
  const byline = [paper.author, paper.date].filter(Boolean).map((part) => escapeHtml(part!))
  if (paper.sourceUrl) {
    byline.push(`<a href="${escapeHtml(paper.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.sourceUrl.replace(/^https?:\/\//, ""))}</a>`)
  }
  if (byline.length > 0) overview.push(`<p class="refdoc-byline">${byline.join(" · ")}</p>`)
  if (paper.figure) overview.push(figureHtml(paper.figure, 1))
  if (paper.abstract) overview.push(`<h2 id="${OVERVIEW_ID}-abstract">Abstract</h2>`, `<p class="refdoc-abstract">${cite(markdownInlineToHtml(paper.abstract))}</p>`)
  if (paper.keywords?.length) overview.push(`<p class="refdoc-keywords"><strong>Keywords:</strong> ${escapeHtml(paper.keywords.join(", "))}</p>`)
  if (paper.cite) overview.push(`<h2 id="${OVERVIEW_ID}-cite">Cite</h2>`, `<blockquote class="refdoc-citation">${markdownInlineToHtml(paper.cite)}</blockquote>`)
  if (paper.sections.length > 0 || paper.references.length > 0) {
    const items = paper.sections.map((section, i) => `<li><a href="#${sectionSlug(section, i)}">${escapeHtml(section.title)}</a>${section.description ? ` — ${markdownInlineToHtml(section.description)}` : ""}</li>`)
    if (paper.references.length > 0) items.push(`<li><a href="#references">References</a></li>`)
    overview.push(`<h2 id="${OVERVIEW_ID}-contents">Contents</h2>`, `<ol class="refdoc-contents">${items.join("")}</ol>`)
  }
  pages.push({
    slug: "",
    title: paper.title,
    description: paper.description ? markdownToPlainText(paper.description) : undefined,
    html: overview.join("\n"),
    headings: [],
  })

  let figureNumber = paper.figure ? 1 : 0
  paper.sections.forEach((section, i) => {
    const slug = sectionSlug(section, i)
    const used = new Set<string>()
    const headingId = (text: string) => {
      let id = `${slug}-${slugify(text)}`
      for (let n = 2; used.has(id); n++) id = `${slug}-${slugify(text)}-${n}`
      used.add(id)
      return id
    }
    const html: string[] = []
    if (section.figure) {
      figureNumber += 1
      html.push(figureHtml(section.figure, figureNumber))
    }
    if (section.summary.length > 0) {
      used.add(`${slug}-summary`)
      html.push(
        `<h2 id="${slug}-summary">Section Summary</h2>`,
        `<ol class="refdoc-summary">${section.summary.map((point) => `<li><strong>${markdownInlineToHtml(point.label)}:</strong> ${cite(markdownInlineToHtml(point.text))}</li>`).join("")}</ol>`,
      )
    }
    if (section.paragraphs.length > 0) {
      if (section.summary.length > 0) {
        used.add(`${slug}-text`)
        html.push(`<h2 id="${slug}-text">Text</h2>`)
      }
      html.push(cite(paragraphsHtml(section.paragraphs, headingId)))
    }
    pages.push({
      slug,
      title: `${i + 1}. ${section.title}`,
      description: section.description ? markdownToPlainText(section.description) : undefined,
      part: section.part,
      html: html.join("\n"),
      headings: [],
    })
  })

  if (paper.references.length > 0) {
    pages.push({
      slug: "references",
      title: "References",
      html: `<ol class="refdoc-references">${paper.references.map((ref, i) => `<li id="ref-${i + 1}">${markdownInlineToHtml(ref)}</li>`).join("")}</ol>`,
      headings: [],
    })
  }

  return {
    format: "refdoc",
    version: REFDOC_VERSION,
    title: paper.title,
    description: paper.description ? markdownToPlainText(paper.description) : undefined,
    author: paper.author,
    date: paper.date,
    sourceUrl: paper.sourceUrl,
    cite: paper.cite,
    keywords: paper.keywords,
    pages,
  }
}

/** A `Paper` as one `.refdoc.html` file. */
export function paperToRefdoc(paper: Paper, options: RenderRefdocOptions = {}): string {
  return renderRefdocHtml(paperToRefdocDocument(paper), options)
}

/** The file name for a paper's refdoc: "<title-slug>.refdoc.html". */
export function refdocFileName(title: string): string {
  return `${slugify(title)}.refdoc.html`
}
