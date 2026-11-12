/**
 * @fileoverview The offline pass that fills in what the extractor can't give:
 * card underlining on every paragraph, a one-line description per section,
 * and a "Section Summary" of bold-lead points drawn from each section's
 * underlined text. The AI pass (`ai.ts`) writes better versions of all three;
 * this one runs with no model and no network.
 *
 * @module finish
 */
import { autoUnderline, splitSentences, stripUnderlines, underlinedRuns } from "./highlight"
import { escapeMdxText, isSubheading, markdownToPlainText } from "./markdown"
import type { Paper, PaperSection, SummaryPoint } from "./types"

/** Most points a Section Summary gets. */
const MAX_SUMMARY_POINTS = 4

/** Longest description, in characters (frontmatter `description`). */
const MAX_DESCRIPTION = 200

/** Trim to a word boundary, adding an ellipsis when cut. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max).replace(/\s+\S*$/, "")
  return `${cut.replace(/[,;:\s]+$/, "")}…`
}

/** Capitalize the first letter. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** One summary point per substantial paragraph: its first underlined run as the label, its first sentence as the text. */
export function summarizeSection(section: PaperSection): SummaryPoint[] {
  const points: SummaryPoint[] = []
  for (const paragraph of section.paragraphs) {
    if (points.length >= MAX_SUMMARY_POINTS) break
    if (isSubheading(paragraph)) continue
    const plain = markdownToPlainText(stripUnderlines(paragraph))
    if (plain.split(/\s+/).length < 12) continue
    const runs = underlinedRuns(paragraph).map(markdownToPlainText)
    const label = runs[0] ? clip(capitalize(runs[0].split(/\s+/).slice(0, 6).join(" ")), 60) : clip(plain.split(/\s+/).slice(0, 5).join(" "), 60)
    const first = splitSentences(plain)[0] ?? plain
    // Summaries are written back into MDX, so plain text is escaped again.
    points.push({ label: escapeMdxText(label.replace(/[.,;:]+$/, "")), text: escapeMdxText(clip(first, 280)) })
  }
  return points
}

/** The section's first sentence, as its page description. */
export function describeSection(section: PaperSection): string | undefined {
  const first = section.paragraphs.find((p) => !isSubheading(p) && markdownToPlainText(p).split(/\s+/).length >= 8)
  if (!first) return undefined
  const sentence = splitSentences(markdownToPlainText(stripUnderlines(first)))[0]
  return sentence ? escapeMdxText(clip(sentence, MAX_DESCRIPTION)) : undefined
}

export interface FinishOptions {
  /** Add `==` underlining where a paragraph has none (default true). */
  underline?: boolean
}

/** Fill in underlining, descriptions and summaries a paper is missing (see the module doc). */
export function finishPaper(paper: Paper, options: FinishOptions = {}): Paper {
  const { underline = true } = options
  const sections = paper.sections.map((section) => {
    const paragraphs = underline
      ? section.paragraphs.map((p) => (isSubheading(p) ? p : autoUnderline(p)))
      : section.paragraphs
    const next = { ...section, paragraphs }
    return {
      ...next,
      description: section.description ?? describeSection(next),
      summary: section.summary.length > 0 ? section.summary : summarizeSection(next),
    }
  })
  const description =
    paper.description ??
    (paper.abstract ? escapeMdxText(clip(splitSentences(markdownToPlainText(paper.abstract))[0] ?? "", MAX_DESCRIPTION)) : undefined)
  return {
    ...paper,
    description: description || undefined,
    abstract: paper.abstract && underline ? autoUnderline(paper.abstract) : paper.abstract,
    sections,
  }
}

/**
 * Extractive outline: the same paper reduced to what a debater would read
 * aloud — each paragraph cut down to its underlined words, Section Summaries
 * kept. Works offline on anything `finishPaper` has underlined.
 */
export function readOnlyUnderlined(paper: Paper): Paper {
  return {
    ...paper,
    sections: paper.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs
        .map((p) => (isSubheading(p) ? p : underlinedRuns(p).join(" … ")))
        .filter(Boolean)
        .map((text) => (isSubheading(text) ? text : `==${text}==`))
        // A subheading with nothing under it before the next one is dropped.
        .filter((p, i, all) => !isSubheading(p) || (all[i + 1] !== undefined && !isSubheading(all[i + 1]))),
    })),
  }
}
