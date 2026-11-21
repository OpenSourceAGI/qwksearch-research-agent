/**
 * @fileoverview The AI half: better summaries and underlining for an
 * extracted paper, and outlines in the same paper format from anything.
 *
 * - `enhancePaperWithAi` asks the model, section by section, for a one-line
 *   description, a 2–4 point Section Summary, and which words of each
 *   paragraph to underline. Underlines come back as verbatim phrases and are
 *   applied with `applyUnderlines`, so the model can never change the prose;
 *   a phrase that isn't in the paragraph is dropped.
 * - `generateOutline` turns any text, a loaded `Paper`, or just a topic into
 *   a new `Paper`: parts, numbered sections, summaries, argument paragraphs
 *   and their underlining — the Synergy Slayer shape, written fresh.
 *
 * The model sits behind `TextGenerator` (prompt in, text out), so any host
 * can plug in its own. `createAnthropicGenerator` is the default, on the
 * official Anthropic SDK.
 *
 * @module ai
 */
import Anthropic from "@anthropic-ai/sdk"
import { finishPaper } from "./finish"
import { applyUnderlines, stripUnderlines } from "./highlight"
import { escapeMdxText, isSubheading, markdownToPlainText } from "./markdown"
import type { Paper, PaperSection, SummaryPoint } from "./types"

/** One prompt in, the model's text out. */
export type TextGenerator = (prompt: string, options?: { system?: string; signal?: AbortSignal }) => Promise<string>

/** Default model for both passes. */
export const DEFAULT_MODEL = "claude-opus-5-5"

export interface AnthropicGeneratorOptions {
  /** Defaults to the SDK's own resolution (`ANTHROPIC_API_KEY`, an `ant auth login` profile, …). */
  apiKey?: string
  model?: string
  /** Effort: outlines and underlining are judgment-heavy, so "high" by default. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max"
  maxTokens?: number
}

/**
 * Text generation on Claude via the Anthropic SDK. Streams (outputs can be
 * long) and opts into server-side refusal fallbacks, so a declined request is
 * retried on a fallback model inside the same call.
 */
export function createAnthropicGenerator(options: AnthropicGeneratorOptions = {}): TextGenerator {
  const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {})
  const model = options.model ?? DEFAULT_MODEL
  return async (prompt, { system, signal } = {}) => {
    const message = await client.beta.messages
      .stream(
        {
          model,
          max_tokens: options.maxTokens ?? 64000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: options.effort ?? "high" },
          ...(system ? { system } : {}),
          messages: [{ role: "user", content: prompt }],
        },
        { signal },
      )
      .finalMessage()
    if (message.stop_reason === "refusal") throw new Error("The model declined to process this document.")
    return message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim()
  }
}

/** Pull the first JSON object out of a reply (models sometimes fence it). */
export function parseJsonReply<T>(reply: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(reply)
  const body = fenced ? fenced[1] : reply
  const start = body.indexOf("{")
  const end = body.lastIndexOf("}")
  if (start < 0 || end <= start) throw new Error("The model reply held no JSON object.")
  return JSON.parse(body.slice(start, end + 1)) as T
}

const STYLE_GUIDE = `Underlining works like a debate card: mark short verbatim runs of words so that, read alone in order, the marked words form complete grammatical sentences carrying the paragraph's argument. Usually 15-35% of the words, often just a few words per sentence.`

const SYSTEM = `You turn research papers and arguments into structured study pages for competitive debaters. Reply with one JSON object and nothing else.`

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asSummary(value: unknown): SummaryPoint[] {
  if (!Array.isArray(value)) return []
  return value
    .map((point) => ({ label: asString((point as SummaryPoint)?.label), text: asString((point as SummaryPoint)?.text) }))
    .filter((point) => point.label && point.text)
    .map((point) => ({ label: escapeMdxText(point.label.replace(/[:.]+$/, "")), text: escapeMdxText(point.text) }))
}

/** Plain text a section is sent to the model as: numbered paragraphs without marks. */
function sectionForPrompt(section: PaperSection): string {
  return section.paragraphs.map((p, i) => `[${i + 1}] ${stripUnderlines(p)}`).join("\n\n")
}

interface SectionReply {
  description?: string
  summary?: Array<{ label: string; text: string }>
  underlines?: string[][]
}

/** Description, Section Summary and underlining for one section (see the module doc). */
export async function enhanceSectionWithAi(section: PaperSection, generate: TextGenerator, paperTitle = ""): Promise<PaperSection> {
  if (section.paragraphs.length === 0) return section
  const prompt = `Paper: ${paperTitle}
Section: ${section.title}

${sectionForPrompt(section)}

Return JSON:
{
  "description": "one sentence stating this section's thesis",
  "summary": [{"label": "2-5 word claim", "text": "1-2 sentences"}],   // 2-4 points, in the section's order
  "underlines": [["verbatim phrase", "..."], ...]                         // one array per numbered paragraph, same order
}
${STYLE_GUIDE} Each phrase must be copied exactly from its paragraph, including punctuation and markdown characters. Use an empty array for a paragraph with nothing to mark.`
  const reply = parseJsonReply<SectionReply>(await generate(prompt, { system: SYSTEM }))
  const underlines = Array.isArray(reply.underlines) ? reply.underlines : []
  return {
    ...section,
    description: asString(reply.description) ? escapeMdxText(asString(reply.description)) : section.description,
    summary: asSummary(reply.summary).length > 0 ? asSummary(reply.summary) : section.summary,
    paragraphs: section.paragraphs.map((paragraph, i) => {
      if (isSubheading(paragraph)) return paragraph
      const phrases = Array.isArray(underlines[i]) ? underlines[i].filter((p): p is string => typeof p === "string") : []
      return phrases.length > 0 ? applyUnderlines(stripUnderlines(paragraph), phrases) : paragraph
    }),
  }
}

export interface EnhanceOptions {
  /** Sections sent at once (default 3). */
  concurrency?: number
  /** Called after each section finishes. */
  onProgress?: (done: number, total: number) => void
}

/** Run the AI pass over every section, then fill anything still missing offline. */
export async function enhancePaperWithAi(paper: Paper, generate: TextGenerator, options: EnhanceOptions = {}): Promise<Paper> {
  const sections = [...paper.sections]
  const concurrency = Math.max(1, options.concurrency ?? 3)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < sections.length) {
      const index = next++
      try {
        sections[index] = await enhanceSectionWithAi(sections[index], generate, paper.title)
      } catch {
        // One bad reply leaves that section to the offline pass rather than failing the paper.
      }
      options.onProgress?.(++done, sections.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sections.length) }, worker))
  return finishPaper({ ...paper, sections })
}

interface OutlineReply {
  title?: string
  description?: string
  abstract?: { text?: string; underlines?: string[] } | string
  keywords?: string[]
  sections?: Array<{
    part?: string
    title?: string
    description?: string
    summary?: Array<{ label: string; text: string }>
    paragraphs?: Array<{ text?: string; underlines?: string[] } | string>
  }>
  references?: string[]
}

/** Largest source text sent in one request, in characters (about 250k tokens). */
export const MAX_OUTLINE_SOURCE_CHARS = 1_000_000

/** A paper's plain text, for the outline prompt. */
export function paperToPlainText(paper: Paper): string {
  const parts = [paper.title, paper.abstract ? `Abstract. ${markdownToPlainText(paper.abstract)}` : ""]
  for (const section of paper.sections) {
    parts.push(`\n## ${section.title}`)
    for (const paragraph of section.paragraphs) parts.push(markdownToPlainText(paragraph))
  }
  if (paper.references.length > 0) parts.push("\n## References", ...paper.references.map(markdownToPlainText))
  return parts.filter(Boolean).join("\n\n")
}

export interface OutlineOptions {
  /** Steer the outline: an angle, a resolution, a side to argue. */
  focus?: string
  /** Rough number of sections (default: the model decides, usually 4-10). */
  sections?: number
}

/**
 * An outline in the paper format from any input: a `Paper` you loaded, any
 * pasted text, or just a topic (see the module doc).
 */
export async function generateOutline(source: Paper | string, generate: TextGenerator, options: OutlineOptions = {}): Promise<Paper> {
  const text = typeof source === "string" ? source.trim() : paperToPlainText(source)
  if (!text) throw new Error("Nothing to outline.")
  if (text.length > MAX_OUTLINE_SOURCE_CHARS) {
    throw new Error(`The source is ${text.length.toLocaleString()} characters; outlines take up to ${MAX_OUTLINE_SOURCE_CHARS.toLocaleString()}. Split it and outline each part.`)
  }
  const isTopic = typeof source === "string" && text.split(/\s+/).length < 40
  const prompt = `${isTopic ? `Topic: ${text}\n\nWrite an original argumentative outline on this topic.` : `Source:\n<source>\n${text}\n</source>\n\nOutline this source faithfully: keep its argument, its order and its evidence; do not invent citations.`}
${options.focus ? `Focus: ${options.focus}\n` : ""}${options.sections ? `Aim for about ${options.sections} sections.\n` : ""}
Return JSON:
{
  "title": "...",
  "description": "one-line subtitle",
  "abstract": {"text": "3-5 sentence abstract", "underlines": ["verbatim phrase", ...]},
  "keywords": ["...", ...],
  "sections": [
    {
      "part": "optional part heading this section opens, e.g. Part I. The Standard",
      "title": "section title, no number",
      "description": "one sentence thesis",
      "summary": [{"label": "2-5 word claim", "text": "1-2 sentences"}],
      "paragraphs": [{"text": "a full argument paragraph, 80-200 words, plain prose", "underlines": ["verbatim phrase", ...]}]
    }
  ],
  "references": ["Chicago-style reference", ...]
}
Each section gets 2-4 summary points and 2-5 paragraphs. Write plain prose: no markdown, no HTML. ${STYLE_GUIDE} Underline phrases must be copied exactly from their own paragraph. Only list references that appear in the source${isTopic ? " (for a topic, an empty list)" : ""}.`
  const reply = parseJsonReply<OutlineReply>(await generate(prompt, { system: SYSTEM }))

  const underlined = (value: { text?: string; underlines?: string[] } | string | undefined): string => {
    if (!value) return ""
    if (typeof value === "string") return escapeMdxText(value.trim())
    const body = escapeMdxText(asString(value.text))
    const phrases = (Array.isArray(value.underlines) ? value.underlines : []).filter((p): p is string => typeof p === "string").map(escapeMdxText)
    return body ? applyUnderlines(body, phrases) : ""
  }

  const sections: PaperSection[] = (Array.isArray(reply.sections) ? reply.sections : [])
    .map((section) => ({
      title: asString(section.title),
      part: asString(section.part) || undefined,
      description: asString(section.description) ? escapeMdxText(asString(section.description)) : undefined,
      summary: asSummary(section.summary),
      paragraphs: (Array.isArray(section.paragraphs) ? section.paragraphs : []).map(underlined).filter(Boolean),
    }))
    .filter((section) => section.title && (section.paragraphs.length > 0 || section.summary.length > 0))
  if (sections.length === 0) throw new Error("The model returned an outline with no sections.")

  const base = typeof source === "string" ? null : source
  return finishPaper({
    title: asString(reply.title) || base?.title || "Outline",
    description: asString(reply.description) ? escapeMdxText(asString(reply.description)) : undefined,
    author: base?.author,
    date: base?.date,
    sourceUrl: base?.sourceUrl,
    cite: base?.cite,
    abstract: underlined(reply.abstract) || undefined,
    keywords: Array.isArray(reply.keywords) ? reply.keywords.filter((k): k is string => typeof k === "string").map(escapeMdxText) : undefined,
    figure: base?.figure,
    sections,
    references: Array.isArray(reply.references) ? reply.references.filter((r): r is string => typeof r === "string").map(escapeMdxText) : base?.references ?? [],
  })
}
