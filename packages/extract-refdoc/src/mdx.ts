/**
 * @fileoverview `Paper` → the Synergy Slayer docs layout, file for file:
 *
 * ```
 * index.mdx          title, figure, byline, **Abstract.**, ***Keywords***
 * 01-<slug>.mdx      "1. Title" frontmatter, figure + *Figure N:* caption,
 *                    Section Summary accordion, numbered ==underlined== paragraphs
 * …
 * references.mdx     the reference list
 * meta.json          sidebar order, with "---Part---" separators
 * ```
 *
 * Dropped into a Fumadocs content folder (as help-docs does for
 * `learn/critiques/synergy-slayer-critiques/`) the pages render with the
 * same accordion. With `accordion: "details"` the summary is a plain
 * `<details>` so the MDX needs no Fumadocs components at all.
 *
 * @module mdx
 */
import { escapeMdxText, isSubheading, markdownToPlainText } from "./markdown"
import type { Paper, PaperFigure, PaperSection } from "./types"

export interface MdxOptions {
  /** "fumadocs" (default) imports Fumadocs' Accordion like the Synergy Slayer pages; "details" uses a plain `<details>`. */
  accordion?: "fumadocs" | "details"
}

/** URL-safe slug from a title, at most six words. */
export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join("-") || "section"
  )
}

/** File stem for section `index` (0-based): "01-original-sin". */
export function sectionSlug(section: PaperSection, index: number): string {
  return `${String(index + 1).padStart(2, "0")}-${slugify(section.title)}`
}

/** A YAML double-quoted scalar (JSON strings are valid YAML). */
function yamlString(text: string): string {
  return JSON.stringify(text.replace(/\s+/g, " ").trim())
}

function frontmatter(title: string, description?: string): string {
  const lines = ["---", `title: ${yamlString(title)}`]
  // Frontmatter is YAML, not MDX: write the description as plain text.
  if (description) lines.push(`description: ${yamlString(markdownToPlainText(description))}`)
  lines.push("---")
  return lines.join("\n")
}

/** Alt text and caption are prose, so strip characters markdown would read as syntax. */
function plainCaption(text: string): string {
  return text.replace(/[[\]*_`<>{}]/g, "").replace(/\s+/g, " ").trim()
}

function figureMarkdown(figure: PaperFigure, number: number): string {
  const caption = plainCaption(figure.caption)
  if (!caption) return `![Figure ${number}](${figure.src})`
  return `![${caption}](${figure.src})\n\n*Figure ${number}: ${caption}*`
}

function summaryMarkdown(section: PaperSection, options: MdxOptions): string {
  if (section.summary.length === 0) return ""
  const points = section.summary.map((point, i) => `${i + 1}. **${point.label.replace(/\*/g, "")}:** ${point.text}`).join("\n")
  if (options.accordion === "details") {
    return `<details open>\n<summary>Section Summary</summary>\n\n${points}\n\n</details>`
  }
  return [
    "import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';",
    "",
    '<Accordions type="single" defaultValue="Section Summary">',
    '<Accordion title="Section Summary">',
    "",
    points,
    "",
    "</Accordion>",
    "</Accordions>",
  ].join("\n")
}

/**
 * Numbered paragraphs: "1. …\n\n2. …", one item per paragraph, each kept on
 * one line. `### ` subheadings sit between them; numbering continues across.
 */
function paragraphsMarkdown(paragraphs: string[]): string {
  let n = 0
  return paragraphs
    .map((p) => (isSubheading(p) ? p : `${++n}. ${p.replace(/\s*\n\s*/g, " ")}`))
    .join("\n\n")
}

/** One section page. `figureNumber` is the figure's number in the whole paper. */
export function sectionToMdx(section: PaperSection, index: number, figureNumber: number, options: MdxOptions = {}): string {
  const parts = [frontmatter(`${index + 1}. ${section.title}`, section.description)]
  if (section.figure) parts.push(figureMarkdown(section.figure, figureNumber))
  const summary = summaryMarkdown(section, options)
  if (summary) parts.push(summary)
  if (section.paragraphs.length > 0) parts.push(paragraphsMarkdown(section.paragraphs))
  return `${parts.join("\n\n")}\n`
}

/** The index page: title, figure, byline and abstract. */
export function indexToMdx(paper: Paper): string {
  const parts = [frontmatter(paper.title, paper.description)]
  if (paper.figure) parts.push(figureMarkdown(paper.figure, 1))
  const byline: string[] = []
  if (paper.author) byline.push(`**${escapeMdxText(paper.author)}**`)
  if (paper.sourceUrl) byline.push(`**Source: [${paper.sourceUrl.replace(/^https?:\/\//, "")}](${paper.sourceUrl})**`)
  if (paper.date) byline.push(`**Published: ${escapeMdxText(paper.date)}**`)
  if (byline.length > 0) parts.push(byline.join("\n\n"))
  if (paper.cite) parts.push(`*${escapeMdxText(paper.cite.replace(/\*/g, ""))}*`)
  if (paper.abstract) parts.push(`**Abstract.** ${paper.abstract}`)
  if (paper.keywords && paper.keywords.length > 0) parts.push(`***Keywords**: ${paper.keywords.join(", ")}*`)
  return `${parts.join("\n\n")}\n`
}

/** The references page. */
export function referencesToMdx(paper: Paper): string {
  return `${frontmatter("References")}\n\n${paper.references.map((ref, i) => `${i + 1}. ${ref}`).join("\n")}\n`
}

/** Fumadocs `meta.json`: page order, with a "---Part---" separator before each section that opens a part. */
export function paperMeta(paper: Paper): { title: string; root: boolean; pages: string[] } {
  const pages = ["index"]
  paper.sections.forEach((section, i) => {
    if (section.part) pages.push(`---${section.part}---`)
    pages.push(sectionSlug(section, i))
  })
  if (paper.references.length > 0) pages.push("references")
  return { title: paper.title, root: true, pages }
}

/** Every file of the docs folder, by file name (see the module doc). */
export function paperToMdxFiles(paper: Paper, options: MdxOptions = {}): Record<string, string> {
  const files: Record<string, string> = { "index.mdx": indexToMdx(paper) }
  let figureNumber = paper.figure ? 1 : 0
  paper.sections.forEach((section, i) => {
    if (section.figure) figureNumber += 1
    files[`${sectionSlug(section, i)}.mdx`] = sectionToMdx(section, i, figureNumber, options)
  })
  if (paper.references.length > 0) files["references.mdx"] = referencesToMdx(paper)
  files["meta.json"] = `${JSON.stringify(paperMeta(paper), null, 2)}\n`
  return files
}

/**
 * The whole paper as one MDX page: the index content, then each section as
 * `## N. Title` with its own summary and numbered paragraphs. Always uses
 * `<details>` summaries so the page stands alone.
 */
export function paperToSingleMdx(paper: Paper): string {
  const parts = [indexToMdx(paper).trimEnd()]
  let figureNumber = paper.figure ? 1 : 0
  paper.sections.forEach((section, i) => {
    if (section.part) parts.push(`# ${escapeMdxText(section.part)}`)
    const block = [`## ${i + 1}. ${escapeMdxText(section.title)}`]
    if (section.description) block.push(`*${section.description.replace(/\*/g, "")}*`)
    if (section.figure) {
      figureNumber += 1
      block.push(figureMarkdown(section.figure, figureNumber))
    }
    const summary = summaryMarkdown(section, { accordion: "details" })
    if (summary) block.push(summary)
    if (section.paragraphs.length > 0) block.push(paragraphsMarkdown(section.paragraphs))
    parts.push(block.join("\n\n"))
  })
  if (paper.references.length > 0) {
    parts.push(`## References\n\n${paper.references.map((ref, i) => `${i + 1}. ${ref}`).join("\n")}`)
  }
  return `${parts.join("\n\n")}\n`
}
