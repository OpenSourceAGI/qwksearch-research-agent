/**
 * @fileoverview Citation cards for the references page.
 *
 * A reference is either a plain citation or a debate evidence card:
 *
 * ```
 * 23Galloway (2020)Galloway, Ryan. "Go Vegetarian." Wyoming Debate Roundup, March 27, 2020. bit.ly/4d5Kyh9.
 * States counterplans that fiat uniform action distort the literature base.
 * the states counterplan thrives by distorting the literature base to answer it [...]
 * *This post criticizes the states counterplan, arguing …*
 * Ryan Galloway is a longtime college debate coach who directed debate at Samford University and writes on debate theory.
 * the states counterplan thrives by distorting the literature base to answer it [...] [N]ot even the notion that something is currently consi
 * ```
 *
 * (one block per line, or per paragraph). `parseReferenceEntry` splits it into
 * its parts and `referenceCardHtml` lays it out, top to bottom: the summary,
 * the author line (`Galloway '20 — longtime college debate coach at Samford
 * University`), the full citation, and the card text, which is the only part
 * that collapses. The italic "where the quote comes from" paragraph and the
 * repeated truncated excerpt are dropped. Flag icons on the card's outer edge
 * classify the source (journal, book, blog, video…), mark a qualified author
 * and mark an institution as the author. An evidence card also gets a status
 * button for its quoted text (`card-text-status.ts`): underlined/full, partial,
 * or a red X when the text is missing. The runtime opens the card text from the
 * first two and a "suggest the full text" form from the X.
 *
 * @module reference-card
 */
import { analyzeCardText, type CardTextAnalysis, type CardTextStatus } from "./card-text-status"
import { escapeHtml, markdownInlineToHtml, markdownToPlainText } from "./markdown"
import { analyzeReference, cleanReferenceEntry, looksLikeQualifications, parseCitationAuthors, parseTagAuthors, type ReferenceMeta, type ReferenceType } from "./reference-meta"

/** A reference entry taken apart. */
export interface ReferenceCard {
  /** The card number from the source ("23"), when it had one. */
  number?: string
  /** The tag, "Galloway (2020)", when the entry is an evidence card. */
  tag?: string
  /** The full Chicago-style citation. */
  citation: string
  /** One-sentence summary of what the card argues. */
  summary?: string
  /** The quoted card text, one markdown paragraph per entry. */
  cardText: string[]
  /** The author's qualifications as written in the source. */
  qualifications?: string
}

const HEADER = /^(\d{1,4})?\s*([\p{Lu}][^()\n]{0,80}?)\s*\((\d{4}[a-z]?|n\.d\.|undated)\)\s*([^]*)$/u

/** `23Galloway (2020)Galloway, Ryan. …` → number, tag, citation. Null when the line is not a card header. */
export function parseCardHeader(line: string): { number?: string; tag: string; citation: string } | null {
  const match = line.trim().match(HEADER)
  if (!match) return null
  const [, number, name, year, rest] = match
  if (!/^[\p{L}'’\-\s&,.]+$/u.test(name) || !parseTagAuthors(name)) return null
  const citation = rest.trim()
  if (!/^[\p{Lu}"“*_]/u.test(citation) || !/[,.]/.test(citation.slice(0, 80))) return null
  return { number, tag: `${name.trim()} (${year})`, citation }
}

const normalize = (text: string) => markdownToPlainText(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")

const isItalicBlock = (block: string) => /^(\*|_)(?![*_\s])[^]*(?<![*_\s])\1$/.test(block.trim()) && !/^(\*\*|__)/.test(block.trim())

/** A short entry that opens with an author list and has a year: a plain bibliography line, not part of a card. */
function looksLikeCitation(entry: string): boolean {
  const text = markdownToPlainText(entry)
  return text.length <= 500 && /\b(?:1[5-9]|20)\d{2}[a-z]?\b/.test(text) && parseCitationAuthors(text) !== null
}

/**
 * Join an evidence card's lines into one entry, so each card is one
 * reference: a header line starts a card and the lines after it belong to it,
 * until a line that is a citation of its own. Entries with no card header
 * before them stay as they are.
 */
export function groupReferenceEntries(entries: string[]): string[] {
  const grouped: string[] = []
  let open = false
  for (const entry of entries) {
    if (parseCardHeader(entry.split(/\n/)[0])) {
      grouped.push(entry)
      open = true
    } else if (open && !looksLikeCitation(entry)) grouped[grouped.length - 1] += `\n${entry}`
    else {
      grouped.push(entry)
      open = false
    }
  }
  return grouped
}

/** Take a reference entry (a citation or a whole evidence card) apart. */
export function parseReferenceEntry(entry: string): ReferenceCard {
  const blocks = entry
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
  const first = cleanReferenceEntry(blocks[0] ?? "")
  const header = parseCardHeader(first)
  const card: ReferenceCard = header ? { number: header.number, tag: header.tag, citation: header.citation, cardText: [] } : { citation: first, cardText: [] }
  const authorNames = (header ? parseTagAuthors(header.tag)?.names : undefined) ?? []

  // The italic "where this quote comes from" paragraph is never shown.
  let rest = blocks.slice(1).filter((block) => !isItalicBlock(block))

  let qualificationsAt = -1
  rest.forEach((block, i) => {
    if (looksLikeQualifications(block, authorNames)) qualificationsAt = i
  })
  if (qualificationsAt >= 0) {
    card.qualifications = rest[qualificationsAt]
    rest = rest.filter((_, i) => i !== qualificationsAt)
  }
  if (rest.length === 0) return card

  let longest = 0
  rest.forEach((block, i) => {
    if (block.length > rest[longest].length) longest = i
  })
  // A repeated excerpt after the card text opens with words the card text already has.
  const body = normalize(rest[longest])
  rest = rest.filter((block, i) => {
    if (i <= longest) return true
    const probe = normalize(block).slice(0, 30)
    return !(probe.length >= 20 && body.includes(probe) && block.length < rest[longest].length)
  })

  if (rest.length === 1) {
    if (rest[0].length > 400) card.cardText = rest
    else card.summary = rest[0]
    return card
  }
  const longestBlock = rest.indexOf(rest[longest])
  if (longestBlock > 0 && rest[0].length <= 400) {
    card.summary = rest[0]
    card.cardText = rest.slice(1)
  } else card.cardText = rest
  return card
}

// ── Icons ──────────────────────────────────────────────────────────────────

/** Lucide icon bodies (24×24, stroke). */
const ICONS: Record<ReferenceType | "qualified" | "institution", string> = {
  journal:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  chapter:
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  blog: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  video:
    '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  report:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2"/><path d="M12 18v-4"/><path d="M16 18v-6"/>',
  unknown: "",
  qualified: '<path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  institution:
    '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
}

/** What each flag says on hover and to screen readers. */
export const REFERENCE_FLAG_LABELS: Record<ReferenceType | "qualified" | "institution", string> = {
  journal: "Journal article",
  book: "Book",
  chapter: "Book chapter",
  web: "Web page",
  blog: "Blog or post",
  video: "Video",
  news: "News article",
  report: "Report or working paper",
  unknown: "Source",
  qualified: "Qualified author",
  institution: "Institutional author",
}

/** The flags a card shows, in order: the source type, a qualified person, an institution. */
export function referenceFlags(meta: Pick<ReferenceMeta, "type" | "isQualified" | "isInstitution">): Array<ReferenceType | "qualified" | "institution"> {
  const flags: Array<ReferenceType | "qualified" | "institution"> = []
  if (meta.type !== "unknown") flags.push(meta.type)
  if (meta.isQualified) flags.push("qualified")
  if (meta.isInstitution) flags.push("institution")
  return flags
}

const STATUS_ICONS: Record<CardTextStatus, string> = {
  full: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>',
  partial: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  missing: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}

/** What the card-text status button says on hover and to screen readers. */
export function cardTextStatusLabel(analysis: Pick<CardTextAnalysis, "status" | "underlined">): string {
  if (analysis.status === "full") return analysis.underlined ? "Full card text available, underlined" : "Full card text available"
  if (analysis.status === "partial") return "Partial card text: cut off or ellipses only"
  return "Card text missing: suggest the full text"
}

function textStatusHtml(analysis: CardTextAnalysis, key: string): string {
  const label = cardTextStatusLabel(analysis)
  return `<button type="button" class="refdoc-flag refdoc-text-status" data-text-status="${analysis.status}" data-ref-key="${escapeHtml(key)}" aria-label="${label}" title="${label}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><title>${label}</title>${STATUS_ICONS[analysis.status]}</svg></button>`
}

function flagHtml(flag: ReferenceType | "qualified" | "institution"): string {
  const label = REFERENCE_FLAG_LABELS[flag]
  return `<span class="refdoc-flag" data-flag="${flag}" role="img" aria-label="${label}" title="${label}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><title>${label}</title>${ICONS[flag]}</svg></span>`
}

// ── Rendering ──────────────────────────────────────────────────────────────

/** The author line as HTML: `<strong>Galloway '20</strong> — longtime college debate coach at Samford University`. */
function authorLineHtml(meta: ReferenceMeta): string {
  if (!meta.authorsDisplay) return ""
  const head = [meta.authorsDisplay, meta.yearShort].filter(Boolean).join(" ")
  return `<p class="refdoc-ref-author"><strong>${escapeHtml(head)}</strong>${meta.qualification ? ` — <span class="refdoc-ref-qual">${escapeHtml(meta.qualification)}</span>` : ""}</p>`
}

/** The citation as plain text, for a tooltip. */
export function referenceCitationText(entry: string): string {
  return markdownToPlainText(parseReferenceEntry(entry).citation)
}

/** One reference as a citation card: `<li class="refdoc-ref" id="…">`. */
export function referenceCardHtml(entry: string, id: string): string {
  const card = parseReferenceEntry(entry)
  const meta = analyzeReference({ citation: markdownToPlainText(card.citation), tag: card.tag, qualifications: card.qualifications ? markdownToPlainText(card.qualifications) : undefined })
  const flags = referenceFlags(meta)
  // Only an evidence card (one with a tag) has quoted text to report on.
  const textStatus = card.tag ? analyzeCardText(card.cardText) : null
  const edge = [...flags.map(flagHtml), ...(textStatus ? [textStatusHtml(textStatus, id)] : [])]
  const parts = [
    card.summary ? `<p class="refdoc-ref-summary">${markdownInlineToHtml(card.summary)}</p>` : "",
    authorLineHtml(meta),
    `<p class="refdoc-ref-citation">${markdownInlineToHtml(card.citation)}</p>`,
    card.cardText.length > 0
      ? `<details class="refdoc-ref-text"><summary>Card text</summary>${card.cardText.map((block) => `<p>${markdownInlineToHtml(block)}</p>`).join("")}</details>`
      : "",
    edge.length > 0 ? `<span class="refdoc-ref-flags">${edge.join("")}</span>` : "",
  ]
  return `<li class="refdoc-ref" id="${escapeHtml(id)}" data-ref-type="${meta.type}"${meta.isQualified ? " data-qualified" : ""}${meta.isInstitution ? " data-institution" : ""}${textStatus ? ` data-text-status="${textStatus.status}"` : ""}>${parts.filter(Boolean).join("")}</li>`
}
