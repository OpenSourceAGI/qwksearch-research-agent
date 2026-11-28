/**
 * @fileoverview The rows of a "Page stats" panel as label/value strings, so
 * every reader that shows one (the refdoc runtime, docs sites) uses the same
 * labels, order and number formats. Framework-free: render them however.
 *
 * @module format
 */
import type { ReadabilityLabel, TextMetrics } from "./metrics.js"

/** What a Page stats panel counts. Omitted or zero optional counts are not shown. */
export interface PageInfo {
  words: number
  readingMinutes: number
  characters: number
  sentences?: number
  sections?: number
  headings?: number
  paragraphs?: number
  links?: number
  figures?: number
  tables?: number
  codeBlocks?: number
  citations?: number
  highlights?: number
}

export interface PageInfoRowsInput {
  stats: PageInfo
  /** When the page was last edited, if known. */
  lastUpdated?: Date | string
  /** Show the highlight count (only pages with underlining have any). */
  showHighlights?: boolean
}

export type PageInfoLabel =
  | "Words"
  | "Reading time"
  | "Characters"
  | "Sentences"
  | "Sections"
  | "Headings"
  | "Paragraphs"
  | "Links"
  | "Figures"
  | "Tables"
  | "Code blocks"
  | "Citations"
  | "Highlights"
  | "Last updated"

export type ReadabilityRowLabel =
  | "Flesch Reading Ease"
  | "Flesch-Kincaid Grade"
  | "Gunning Fog"
  | "SMOG Index"
  | "Automated Readability Index"
  | "Coleman-Liau Index"
  | "Linsear Write"
  | "Text standard (grade)"

/** Shown for a score that cannot be computed. */
export const DASH = "\u2014"
export const NOT_ENOUGH_TEXT = "Not enough text to score."
export const SMOG_NOTE = "SMOG needs at least 3 sentences."

const number = new Intl.NumberFormat("en-US")

/** "under a minute" or "N min". */
export function formatReadingTime(minutes: number): string {
  return minutes < 1 ? "under a minute" : `${minutes} min`
}

/** "Nov 26, 2026", or null for a missing or invalid date. */
export function formatDate(date: Date | string | undefined): string | null {
  if (!date) return null
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return null
  return value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

/**
 * The panel's stat rows: Words, Reading time, Characters and Sentences
 * always (Sentences when counted), then the optional counts above zero,
 * then Last updated when known.
 */
export function pageInfoRows({ stats, lastUpdated, showHighlights }: PageInfoRowsInput): [PageInfoLabel, string][] {
  const rows: [PageInfoLabel, string][] = [
    ["Words", number.format(stats.words)],
    ["Reading time", formatReadingTime(stats.readingMinutes)],
    ["Characters", number.format(stats.characters)],
  ]
  if (stats.sentences !== undefined) rows.push(["Sentences", number.format(stats.sentences)])
  const optional: [PageInfoLabel, number | undefined][] = [
    ["Sections", stats.sections],
    ["Headings", stats.headings],
    ["Paragraphs", stats.paragraphs],
    ["Links", stats.links],
    ["Figures", stats.figures],
    ["Tables", stats.tables],
    ["Code blocks", stats.codeBlocks],
    ["Citations", stats.citations],
  ]
  if (showHighlights) optional.push(["Highlights", stats.highlights])
  for (const [label, value] of optional) if (value) rows.push([label, number.format(value)])
  const updated = formatDate(lastUpdated)
  if (updated) rows.push(["Last updated", updated])
  return rows
}

const READABILITY_ROWS: [ReadabilityRowLabel, keyof TextMetrics][] = [
  ["Flesch Reading Ease", "fleschReadingEase"],
  ["Flesch-Kincaid Grade", "fleschKincaidGrade"],
  ["Gunning Fog", "gunningFog"],
  ["SMOG Index", "smogIndex"],
  ["Automated Readability Index", "automatedReadabilityIndex"],
  ["Coleman-Liau Index", "colemanLiauIndex"],
  ["Linsear Write", "linsearWriteFormula"],
  ["Text standard (grade)", "textStandard"],
]

/** The grade-level formulas under the readability bar: one decimal, the text standard as a whole grade, an em dash when not computable. */
export function readabilityRows(metrics: TextMetrics): [ReadabilityRowLabel, string][] {
  return READABILITY_ROWS.map(([label, key]) => {
    const value = metrics[key] as number | null
    if (value == null) return [label, DASH]
    return [label, key === "textStandard" ? String(value) : value.toFixed(1)]
  })
}

/** The headline score, "36/100 Difficult", or an em dash for too little text. */
export function formatReadability(metrics: Pick<TextMetrics, "readabilityScore" | "readabilityLabel">): string {
  return metrics.readabilityScore == null ? DASH : `${metrics.readabilityScore}/100 ${metrics.readabilityLabel}`
}

/** Bar colours per band, as CSS colours (Tailwind emerald/lime/amber/orange/red 500). */
export const READABILITY_COLORS: Record<ReadabilityLabel, string> = {
  "Very Easy": "#10b981",
  Easy: "#10b981",
  "Fairly Easy": "#84cc16",
  Standard: "#84cc16",
  "Fairly Difficult": "#f59e0b",
  Difficult: "#f97316",
  "Very Confusing": "#ef4444",
}
