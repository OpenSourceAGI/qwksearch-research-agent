/**
 * @fileoverview Extracted reading-mode HTML (or plain text / markdown) →
 * `Paper`.
 *
 * `extract-webpage` hands back basic HTML: headings, paragraphs, lists,
 * figures. This splits it into sections at the heading level the document
 * uses most for its top-level parts, pulls out the abstract and the
 * reference list, strips section numbers from headings ("2. Original Sin",
 * "II. Foo") so the MDX can number them itself, and rejoins paragraphs a PDF
 * broke mid-sentence. Documents with no usable headings are cut into
 * sections of a few paragraphs each.
 *
 * Summaries and underlining are left to `finishPaper` (offline) or the AI
 * pass in `ai.ts`.
 *
 * @module html-to-paper
 */
import { parseHTML } from "linkedom"
import { collapseWhitespace, escapeMdxText, htmlInlineToMarkdown, markdownToPlainText } from "./markdown"
import type { Paper, PaperFigure, PaperSection } from "./types"

/** Metadata the extractor found, carried onto the paper. */
export interface PaperMeta {
  title?: string
  author?: string
  date?: string
  sourceUrl?: string
  cite?: string
}

/** One block in document order. */
type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; markdown: string; listItem?: boolean }
  | { kind: "figure"; figure: PaperFigure }

const REFERENCES_HEADING = /^(references|bibliography|works cited|literature cited|sources|citations|notes and references)$/i
const ABSTRACT_HEADING = /^(abstract|summary|executive summary)$/i
const SKIP_HEADING = /^(table of contents|contents|acknowledg(e)?ments?|footnotes|instructions for reporting errors|report (github )?issue|related articles|share this|comments?)$/i

/** Paragraphs per section when the document has no headings to split on. */
const PARAGRAPHS_PER_SECTION = 6

type El = {
  nodeType: number
  tagName: string
  childNodes: ArrayLike<El>
  children: ArrayLike<El>
  textContent: string | null
  getAttribute(name: string): string | null
  querySelector(selector: string): El | null
}

/** "2. Original Sin" / "II. Foo" / "2 Foo" / "Section 3: Bar" → the title alone. */
export function stripSectionNumber(heading: string): string {
  return heading
    .replace(/^\s*(?:section|chapter|part)\s+[\divxlc]+[.:)]?\s*/i, "")
    .replace(/^\s*(?:\d+(?:\.\d+)*|[IVXLC]+|[A-Z])[.:)]\s+/, "")
    .replace(/^\s*\d{1,2}(?:\.\d+)*\s+(?=[A-Z])/, "")
    .trim()
}

function figureFrom(element: El): PaperFigure | null {
  const img = element.tagName === "IMG" ? element : element.querySelector("img")
  const src = img?.getAttribute("src") ?? ""
  if (!/^(https?:)?\/\//.test(src) && !src.startsWith("data:image/")) return null
  if (NOT_A_FIGURE.test(src)) return null
  const width = Number(img?.getAttribute("width"))
  if (width > 0 && width < 120) return null
  const caption =
    collapseWhitespace(element.querySelector("figcaption")?.textContent ?? "").trim() ||
    collapseWhitespace(img?.getAttribute("alt") ?? img?.getAttribute("title") ?? "").trim()
  return { src: src.startsWith("//") ? `https:${src}` : src, caption: caption.replace(/^(figure|fig\.)\s*\d+[a-z]?\s*[:.–—-]\s*/i, "") }
}

/** Block-level children that end a run of loose inline text. */
const BLOCK_TAGS = /^(P|DIV|H[1-6]|UL|OL|DL|FIGURE|TABLE|BLOCKQUOTE|SECTION|ARTICLE|PRE|HEADER|FOOTER|MAIN|NAV|ASIDE|DETAILS|PICTURE)$/

/** "Figure 3: caption" / "Fig. 3. caption". */
const FIGURE_CAPTION = /^(?:figure|fig\.)\s*\d+[a-z]?\s*[:.–—-]\s*(.*)$/i

/** Site chrome, icons and logos rather than figures. */
const NOT_A_FIGURE = /\.svg(\?|$)|\/(static|icons?|logos?|funders|badges?|avatars?)\/|logo|sprite|spacer|pixel/i

const CONTAINER_TAGS = new Set(["DIV", "SECTION", "ARTICLE", "MAIN", "HEADER", "FOOTER", "BODY", "SPAN", "CENTER", "ASIDE", "NAV", "FORM", "TBODY", "THEAD", "DETAILS"])

/** Walk the extracted HTML into blocks, in document order. */
function collectBlocks(root: El): Block[] {
  const blocks: Block[] = []
  const visit = (element: El) => {
    const tag = element.tagName
    const heading = /^H([1-6])$/.exec(tag)
    if (heading) {
      const text = collapseWhitespace(element.textContent ?? "").trim()
      if (text) blocks.push({ kind: "heading", level: Number(heading[1]), text })
      return
    }
    if (tag === "FIGURE" || tag === "IMG" || tag === "PICTURE") {
      const figure = figureFrom(element)
      if (figure) blocks.push({ kind: "figure", figure })
      return
    }
    if ((tag === "UL" || tag === "OL") && !Array.from(element.children).some((child) => child.tagName === "LI")) {
      // PDF output wraps loose lines in a list with no items.
      pushParagraph(element)
      return
    }
    if (tag === "UL" || tag === "OL") {
      for (const item of Array.from(element.children)) {
        if (item.tagName === "LI") pushParagraph(item, true)
      }
      return
    }
    if (tag === "P" || tag === "BLOCKQUOTE" || tag === "PRE" || tag === "DD" || tag === "DT" || tag === "LI") {
      // A paragraph that is only an image is a figure.
      if (element.querySelector("img") && !(element.textContent ?? "").trim()) {
        const figure = figureFrom(element)
        if (figure) blocks.push({ kind: "figure", figure })
        return
      }
      pushParagraph(element)
      return
    }
    if (tag === "TABLE" || tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "SVG") return
    if (CONTAINER_TAGS.has(tag) || element.children.length > 0) {
      const hasBlockChild = Array.from(element.children).some((child) => BLOCK_TAGS.test(child.tagName))
      if (!hasBlockChild) {
        pushParagraph(element)
        return
      }
      // Mixed content (common in extracted PDF and arXiv HTML): loose text and
      // inline elements between block children are paragraphs of their own.
      let run: El[] = []
      const flush = () => {
        const markdown = run.map((node) => htmlInlineToMarkdown(node as never)).join("").trim()
        if (markdown) pushMarkdown(markdown)
        run = []
      }
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 1 && (BLOCK_TAGS.test(child.tagName) || child.tagName === "IMG")) {
          flush()
          visit(child)
        } else {
          run.push(child)
        }
      }
      flush()
      return
    }
    pushParagraph(element)
  }
  const pushMarkdown = (markdown: string, listItem = false) => {
    // A caption written as loose text right after its image: "Figure 1: …".
    const caption = FIGURE_CAPTION.exec(markdownToPlainText(markdown))
    const previous = blocks[blocks.length - 1]
    if (caption && previous?.kind === "figure" && !previous.figure.caption) {
      previous.figure.caption = caption[1].trim()
      return
    }
    blocks.push({ kind: "paragraph", markdown, listItem })
  }
  const pushParagraph = (element: El, listItem = false) => {
    const markdown = htmlInlineToMarkdown(element as never).trim()
    if (markdown) pushMarkdown(markdown, listItem)
  }
  visit(root)
  return blocks
}

/** Page numbers, running headers, navigation links and other noise. */
export function isNoise(markdown: string): boolean {
  const plain = markdownToPlainText(markdown)
  if (plain.length < 3 || /^(page\s*)?\d+(\s*of\s*\d+)?$/i.test(plain) || !/[\p{L}]/u.test(plain)) return true
  // Navigation: a paragraph that is nothing but links.
  const withoutLinks = markdownToPlainText(markdown.replace(/!?\[[^\]]*\]\([^)]*\)/g, ""))
  return /\]\(/.test(markdown) && withoutLinks.replace(/[\s·|•,;:–—-]/g, "").length < 3
}

/** "1. Introduction", "3.2 Results", "IV. CONCLUSION": a numbered heading line. */
const NUMBERED_HEADING = /^(?:(\d+(?:\.\d+)*)\.?|([IVXLC]+)\.)\s+([A-Z][^.!?]{1,70})$/

/**
 * PDFs come out with no heading tags: section titles are short numbered
 * lines ("1. Introduction"). Promote those to headings (sub-numbers one level
 * deeper), and drop "headings" that are really math (no words).
 */
export function promotePseudoHeadings(blocks: Block[]): Block[] {
  const hasRealHeadings = blocks.filter((b) => b.kind === "heading" && /\p{L}{3}/u.test(b.text)).length >= 2
  const out: Block[] = []
  for (const block of blocks) {
    if (block.kind === "heading") {
      if (/\p{L}/u.test(block.text)) out.push(block)
      continue
    }
    if (!hasRealHeadings && block.kind === "paragraph") {
      const plain = markdownToPlainText(block.markdown)
      const match = NUMBERED_HEADING.exec(plain)
      if (match && plain.split(/\s+/).length <= 10) {
        const depth = match[1] ? match[1].split(".").length : 1
        out.push({ kind: "heading", level: 1 + depth, text: plain })
        continue
      }
    }
    out.push(block)
  }
  return out
}

/** Rejoin paragraphs a PDF broke mid-sentence. */
export function mergeBrokenParagraphs(paragraphs: string[]): string[] {
  const merged: string[] = []
  for (const paragraph of paragraphs) {
    const previous = merged[merged.length - 1]
    // Short lines (list items, labels) stay apart unless a word was hyphenated across them.
    const longEnough = previous !== undefined && (previous.split(/\s+/).length >= 6 || previous.endsWith("-"))
    if (previous !== undefined && longEnough && !/[.!?:"'”’)\]*]$/.test(previous.trim()) && /^[a-z(“"‘']/.test(paragraph.trim())) {
      merged[merged.length - 1] = `${previous.replace(/-$/, "")}${previous.endsWith("-") ? "" : " "}${paragraph}`
    } else {
      merged.push(paragraph)
    }
  }
  return merged
}

/** Pick the heading level that marks top-level sections: the shallowest level used at least twice. */
function sectionLevel(blocks: Block[]): number | null {
  const counts = new Map<number, number>()
  for (const block of blocks) {
    if (block.kind === "heading" && !REFERENCES_HEADING.test(block.text) && !ABSTRACT_HEADING.test(block.text)) {
      counts.set(block.level, (counts.get(block.level) ?? 0) + 1)
    }
  }
  const levels = [...counts.entries()].filter(([, count]) => count >= 2).map(([level]) => level)
  if (levels.length > 0) return Math.min(...levels)
  // One section only: the level below a lone title heading.
  const used = [...counts.keys()].sort((a, b) => a - b)
  if (used.length >= 2) return used[1]
  // A lone <h1> is the title; a lone deeper heading opens the one section.
  return used[0] !== undefined && used[0] > 1 ? used[0] : null
}

function emptySection(title: string): PaperSection {
  return { title, summary: [], paragraphs: [] }
}

/** Build a `Paper` from extracted reading-mode HTML. */
export function htmlToPaper(html: string, meta: PaperMeta = {}): Paper {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
  const blocks = promotePseudoHeadings(collectBlocks(document.body as unknown as El))
  const level = sectionLevel(blocks)

  let title = meta.title?.trim() ?? ""
  // A lone heading above the section level is the paper's title.
  const titleHeading = blocks.find((b) => b.kind === "heading" && (level === null || b.level < level))
  if (!title && titleHeading?.kind === "heading") title = titleHeading.text

  const intro: string[] = []
  const abstract: string[] = []
  const references: string[] = []
  const sections: PaperSection[] = []
  let figure: PaperFigure | undefined
  let mode: "intro" | "abstract" | "references" | "skip" | "section" = "intro"
  let current: PaperSection | null = null

  // Everything above the title heading is page chrome (menus, banners, dialogs).
  const start = titleHeading ? blocks.indexOf(titleHeading) : 0
  for (const block of blocks.slice(start)) {
    if (block.kind === "heading") {
      const plain = stripSectionNumber(block.text).replace(/[.:]$/, "")
      if (REFERENCES_HEADING.test(plain)) {
        mode = "references"
        current = null
        continue
      }
      if (ABSTRACT_HEADING.test(plain)) {
        // Between the title and the abstract is the byline (authors, affiliations, notes).
        if (mode === "intro") intro.length = 0
        mode = "abstract"
        continue
      }
      if (block === titleHeading) continue
      if (level !== null && block.level === level) {
        if (SKIP_HEADING.test(plain)) {
          mode = "skip"
          current = null
          continue
        }
        current = emptySection(plain || block.text)
        sections.push(current)
        mode = "section"
        continue
      }
      if (level !== null && block.level < level) continue
      // A deeper heading: kept as a `### ` subheading inside the section.
      if (SKIP_HEADING.test(plain)) {
        if (mode === "section") mode = "skip"
        continue
      }
      if (mode === "skip" && current) mode = "section"
      if (mode === "section" && current) current.paragraphs.push(`### ${escapeMdxText(block.text)}`)
      continue
    }
    if (block.kind === "figure") {
      if (mode === "section" && current && !current.figure) current.figure = block.figure
      else if (mode === "section" && current) current.paragraphs.push(`![${escapeMdxText(block.figure.caption)}](${block.figure.src})`)
      else if (!figure) figure = block.figure
      continue
    }
    if (isNoise(block.markdown)) continue
    // Diagram labels and table scraps from PDFs: a few words, no sentence.
    const words = markdownToPlainText(block.markdown).split(/\s+/).length
    if (mode !== "references" && !block.listItem && words < 4 && !/[.!?:"”)]$/.test(markdownToPlainText(block.markdown))) continue
    if (mode === "references") references.push(block.markdown)
    else if (mode === "abstract") abstract.push(block.markdown)
    else if (mode === "section" && current) current.paragraphs.push(block.markdown)
    else if (mode === "intro") intro.push(block.markdown)
  }

  // An abstract written inline: "**Abstract.** In this paper…" or "Abstract: …".
  const inlineAbstract = abstract.length === 0 ? intro.findIndex((p) => /^(\*\*)?abstract\b/i.test(p)) : -1
  if (inlineAbstract >= 0) {
    // With no title tag, the first short line above the abstract is the title.
    const firstLine = inlineAbstract > 0 ? markdownToPlainText(intro[0]) : ""
    if (!title && firstLine && firstLine.split(/\s+/).length <= 20) title = firstLine
    abstract.push(intro[inlineAbstract].replace(/^(\*\*)?abstract[.:]?(\*\*)?[.:—–-]?\s*/i, ""))
    // Above the abstract is the title block and byline.
    intro.splice(0, inlineAbstract + 1)
  }

  if (sections.length === 0) {
    // No headings to split on: cut the body into runs of a few paragraphs.
    const body = mergeBrokenParagraphs(intro.splice(0))
    for (let i = 0; i < body.length; i += PARAGRAPHS_PER_SECTION) {
      const chunk = body.slice(i, i + PARAGRAPHS_PER_SECTION)
      sections.push({ ...emptySection(titleFromParagraph(chunk[0]) || `Part ${sections.length + 1}`), paragraphs: chunk })
    }
  } else if (intro.some((p) => markdownToPlainText(p).split(/\s+/).length >= 25)) {
    // Real prose before the first heading; short lines there are a byline.
    sections.unshift({ ...emptySection("Introduction"), paragraphs: intro })
  }
  for (const section of sections) section.paragraphs = mergeBrokenParagraphs(section.paragraphs)

  return {
    title: title || titleFromParagraph(sections[0]?.paragraphs[0] ?? "") || "Untitled paper",
    author: meta.author,
    date: meta.date,
    sourceUrl: meta.sourceUrl,
    cite: meta.cite,
    abstract: abstract.length > 0 ? mergeBrokenParagraphs(abstract).join(" ") : undefined,
    figure,
    sections: sections.filter((section) => section.paragraphs.length > 0 || section.figure),
    references: mergeBrokenParagraphs(references).map((ref) => ref.replace(/^\\?\[\d+\\?\]\s*|^\d+\.\s+/, "")),
  }
}

/** A short title from a paragraph's opening words, for sections that had none. */
export function titleFromParagraph(markdown: string): string {
  const plain = markdownToPlainText(markdown)
  const words = plain.split(/\s+/).slice(0, 7).join(" ").replace(/[.,;:!?]+$/, "")
  return words ? `${words}${plain.split(/\s+/).length > 7 ? "…" : ""}` : ""
}

/**
 * Plain text or markdown → `Paper`. Markdown headings (`#`, `##`) split
 * sections; blank lines split paragraphs. Used for pasted text and `.md`/`.txt`
 * files.
 */
export function textToPaper(text: string, meta: PaperMeta = {}): Paper {
  const html = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => {
      const trimmed = chunk.trim()
      const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
      if (heading) return `<h${heading[1].length}>${escapeForHtml(heading[2])}</h${heading[1].length}>`
      if (/^[-*]\s+/.test(trimmed)) {
        return `<ul>${trimmed
          .split(/\n(?=[-*]\s+)/)
          .map((item) => `<li>${inlineMarkdownToHtml(item.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`
      }
      return trimmed ? `<p>${inlineMarkdownToHtml(trimmed)}</p>` : ""
    })
    .join("\n")
  return htmlToPaper(html, meta)
}

function escapeForHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Enough inline markdown → HTML for `textToPaper` to keep bold, italics, links and `==marks==`. */
function inlineMarkdownToHtml(text: string): string {
  return escapeForHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
}
