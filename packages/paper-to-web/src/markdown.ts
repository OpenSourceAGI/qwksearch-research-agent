/**
 * @fileoverview The small slice of markdown the paper format uses, both ways.
 *
 * - `htmlInlineToMarkdown` turns an extracted element's inline content into
 *   MDX-safe markdown: bold, italics, links, inline code, and `==text==` for
 *   anything the source already underlined or highlighted (`<u>`, `<mark>`).
 * - `markdownInlineToHtml` renders that same slice back to HTML for the
 *   reader widget and the standalone HTML export, with `==text==` becoming
 *   `<mark>` exactly as help-docs' `remark-debate-highlight` does.
 *
 * MDX parses `{`, `}` and `<` as code, so text is escaped on the way out.
 *
 * @module markdown
 */

/** Escape text for MDX: braces and angle brackets would start JSX. */
export function escapeMdxText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // A literal `==` in the source would read as a highlight marker.
    .replace(/==/g, "=​=")
}

/** True for a `### ` subheading kept inside a section's paragraphs. */
export function isSubheading(markdown: string): boolean {
  return markdown.startsWith("### ")
}

/** Letters and digits only, after folding math alphanumerics (𝐳 → z) and dropping TeX commands. */
function comparable(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
}

function balanced(text: string): boolean {
  let depth = 0
  for (const c of text) {
    if (c === "(" || c === "[") depth++
    else if (c === ")" || c === "]") depth--
    if (depth < 0) return false
  }
  return depth === 0
}

/**
 * Extracted MathML often reads as its rendered text followed by its TeX
 * source ("hth_{t}", "𝐳\\mathbf{z}") or simply twice ("N=6N=6"). Keep the
 * rendered half.
 */
export function cleanMathText(text: string): string {
  const trimmed = text.trim()
  // Longest rendered half first, so closing brackets stay with it; prefer a
  // split that leaves the rendered half's brackets balanced.
  let fallback: string | null = null
  for (let i = trimmed.length - 1; i >= 1; i--) {
    const head = trimmed.slice(0, i)
    const tail = trimmed.slice(i)
    if (/[\\{}]/.test(head)) continue
    const key = comparable(head)
    if (!key || key !== comparable(tail) || !(tail === head || /[_^\\{}]/.test(tail))) continue
    if (balanced(head)) return head.trim()
    fallback ??= head.trim()
  }
  if (fallback) return fallback
  return trimmed
}

/** Collapse runs of whitespace (PDF and HTML line breaks) to single spaces. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ")
}

type InlineNode = {
  nodeType: number
  nodeValue?: string | null
  tagName?: string
  childNodes?: ArrayLike<InlineNode>
  getAttribute?: (name: string) => string | null
}

const TEXT_NODE = 3
const ELEMENT_NODE = 1

function collectText(node: InlineNode): string {
  if (node.nodeType === TEXT_NODE) return node.nodeValue ?? ""
  const tag = (node.tagName ?? "").toUpperCase()
  if (tag === "ANNOTATION" || tag === "ANNOTATION-XML") return ""
  return Array.from(node.childNodes ?? []).map(collectText).join("")
}

/** Wrap `inner` in a marker pair, keeping surrounding spaces outside it. */
function wrap(inner: string, open: string, close = open): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)
  if (!match || !match[2]) return inner
  return `${match[1]}${open}${match[2]}${close}${match[3]}`
}

/** Inline content of `node` as MDX-safe markdown (see the module doc). */
export function htmlInlineToMarkdown(node: InlineNode, insideMark = false): string {
  if (node.nodeType === TEXT_NODE) return escapeMdxText(collapseWhitespace(node.nodeValue ?? ""))
  if (node.nodeType !== ELEMENT_NODE) return ""
  const tag = (node.tagName ?? "").toUpperCase()
  if (["SCRIPT", "STYLE", "NOSCRIPT", "IMG", "SVG", "FIGURE", "BUTTON"].includes(tag)) return ""
  if (tag === "BR") return " "
  if (tag === "ANNOTATION" || tag === "ANNOTATION-XML") return ""
  if (tag === "MATH") {
    const alt = node.getAttribute?.("alttext")
    const text = alt ?? collectText(node)
    return escapeMdxText(alt ? alt : cleanMathText(text))
  }
  const isMark = tag === "MARK" || tag === "U"
  const children = Array.from(node.childNodes ?? [])
    .map((child) => htmlInlineToMarkdown(child, insideMark || isMark))
    .join("")
  switch (tag) {
    case "STRONG":
    case "B":
      return wrap(children, "**")
    case "EM":
    case "I":
    case "CITE":
      return wrap(children, "*")
    case "CODE":
      return wrap(children.replace(/`/g, "'"), "`")
    case "MARK":
    case "U":
      return insideMark ? children : wrap(children, "==")
    case "A": {
      const href = node.getAttribute?.("href") ?? ""
      // In-page anchors (citation and footnote jumps) mean nothing out of context.
      if (!/^https?:\/\//i.test(href) || !children.trim() || /#./.test(href)) return children
      return `[${children.trim()}](${href.replace(/[()\s]/g, encodeURIComponent)})`
    }
    default:
      return children
  }
}

/** Escape text for HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&(?!(?:[a-z]+|#\d+|#x[\da-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Undo `escapeMdxText`'s backslash escapes for display. */
function unescapeMdx(text: string): string {
  return text.replace(/\\([\\{}*_[\]()#`>-])/g, "$1").replace(/=​=/g, "==")
}

/** Render the inline markdown slice (see the module doc) to HTML. */
export function markdownInlineToHtml(markdown: string): string {
  // Images and links first, so their URLs are not touched by emphasis rules.
  const tokens: string[] = []
  const stash = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`
  let text = markdown
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) =>
      stash(`<img src="${escapeHtml(src)}" alt="${escapeHtml(unescapeMdx(alt))}" loading="lazy" />`),
    )
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, label: string, href: string) =>
      stash(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${markdownInlineToHtml(label)}</a>`),
    )
    .replace(/`([^`]+)`/g, (_, code: string) => stash(`<code>${escapeHtml(code)}</code>`))
  text = escapeHtml(unescapeMdx(text))
    .replace(/==([^=\n](?:[^\n]*?[^=\n])?)==/g, '<mark class="debate-hl">$1</mark>')
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, "$1<em>$2</em>")
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] ?? "")
}

/** Plain text of an inline markdown string: markers and link syntax removed. */
export function markdownToPlainText(markdown: string): string {
  return unescapeMdx(
    markdown
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/==|\*\*|`/g, "")
      .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, "$1$2")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  )
    .replace(/\s+/g, " ")
    .trim()
}
