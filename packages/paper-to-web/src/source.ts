/**
 * @fileoverview Getting a paper's text from wherever it lives, with the
 * `extract-webpage` pipeline (the same extractor the browser extension's
 * reading mode is ported from): web articles through its Readability /
 * Mercury reading-mode extraction, PDFs through `extract-pdf`, `.docx`
 * buffers, plus pasted text or markdown.
 *
 * Links are normalized first so the extractor gets the most structured copy:
 * - arXiv `abs/` and `pdf/` links → the arXiv HTML render, which keeps the
 *   section headings (falls back to the PDF if arXiv has no HTML build);
 * - bare DOIs → `https://doi.org/…`;
 * - archive.org `details/` pages are passed through (the extractor reads
 *   the item page), and `web.archive.org` snapshots work as ordinary pages.
 *
 * The extractor is loaded lazily, so importing this package for the MDX or
 * widget halves never pulls in the scraping stack.
 *
 * @module source
 */
import { htmlToPaper, textToPaper, type PaperMeta } from "./html-to-paper"
import type { Paper } from "./types"

/** What an extractor returns: reading-mode HTML plus citation fields. */
export interface ExtractedSource {
  html?: string
  title?: string
  author?: string
  date?: string
  cite?: string
  url?: string
  error?: string | number
}

/** Fetches and extracts one URL or binary file. Swappable for tests and other hosts. */
export type Extractor = (input: string | Uint8Array, options: { isPdf?: boolean }) => Promise<ExtractedSource>

const DOI = /^(?:doi:\s*)?(10\.\d{4,9}\/\S+)$/i

/** The URL the extractor should read for `input` (see the module doc), plus fallbacks to try in order. */
export function normalizeSourceUrl(input: string): string[] {
  const trimmed = input.trim()
  const doi = DOI.exec(trimmed)
  if (doi) return [`https://doi.org/${doi[1]}`]
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return [trimmed]
  }
  if (/(^|\.)arxiv\.org$/i.test(url.hostname)) {
    const id = /^\/(?:abs|pdf|html)\/([^?#]+?)(?:\.pdf)?\/?$/.exec(url.pathname)?.[1]
    if (id) return [`https://arxiv.org/html/${id}`, `https://arxiv.org/pdf/${id}`]
  }
  return [url.toString()]
}

/** True when `input` looks like a link or DOI rather than pasted text. */
export function isLinkInput(input: string): boolean {
  const trimmed = input.trim()
  if (/\s/.test(trimmed)) return false
  return /^https?:\/\//i.test(trimmed) || DOI.test(trimmed) || /^[\w-]+(\.[\w-]+)+\/\S*$/.test(trimmed)
}

/** True when the bytes start with `%PDF-`. */
export function isPdfBuffer(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

/** Run `fn` with the extractor's chatty console.log silenced. */
async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const log = console.log
  console.log = () => {}
  try {
    return await fn()
  } finally {
    console.log = log
  }
}

/** The default extractor: `extract-webpage` for links and `.docx`, `extract-pdf` for PDF bytes. */
export const extractWithExtractWebpage: Extractor = async (input, { isPdf }) =>
  quietly(async () => {
    if (input instanceof Uint8Array && (isPdf || isPdfBuffer(input))) {
      const { convertPDFToHTML } = await import("extract-pdf")
      return (await convertPDFToHTML(input)) as ExtractedSource
    }
    const { extractContent } = await import("extract-webpage")
    return (await extractContent(input, { images: true, links: true, formatting: true, timeout: 20 })) as ExtractedSource
  })

export interface LoadOptions {
  /** Replace the extractor (tests, or a host with its own scraping proxy). */
  extract?: Extractor
  /** File name of a binary input, used to tell PDFs from .docx and as a title fallback. */
  fileName?: string
}

/** The extractor's citation as plain text, or nothing when it has no real words (". . . https://…"). */
function usableCite(cite: string | undefined): string | undefined {
  const text = cite?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  if (!text) return undefined
  return (text.replace(/https?:\/\/\S+/g, "").match(/\p{L}{3,}/gu) ?? []).length >= 3 ? text : undefined
}

function metaFrom(extracted: ExtractedSource, sourceUrl?: string): PaperMeta {
  return {
    title: extracted.title?.trim() || undefined,
    author: extracted.author?.trim() || undefined,
    date: extracted.date?.trim() || undefined,
    cite: usableCite(extracted.cite),
    sourceUrl: sourceUrl ?? extracted.url,
  }
}

/**
 * Turn any input into a `Paper` (structure only; run `finishPaper` or the AI
 * pass for summaries and underlining):
 * - a URL, arXiv link, archive link or DOI → scraped and extracted;
 * - `Uint8Array` bytes of a PDF or `.docx` → extracted;
 * - anything else → read as pasted text or markdown.
 */
export async function loadPaper(input: string | Uint8Array, options: LoadOptions = {}): Promise<Paper> {
  const extract = options.extract ?? extractWithExtractWebpage
  if (input instanceof Uint8Array) {
    const isPdf = isPdfBuffer(input) || /\.pdf$/i.test(options.fileName ?? "")
    const extracted = await extract(input, { isPdf })
    if (!extracted.html) throw new Error(`Could not extract ${options.fileName ?? "the file"}: ${extracted.error ?? "no text found"}`)
    const meta = metaFrom(extracted)
    if (!meta.title && options.fileName) meta.title = options.fileName.replace(/\.[^.]+$/, "")
    return htmlToPaper(extracted.html, meta)
  }

  if (!isLinkInput(input)) return textToPaper(input)

  const errors: string[] = []
  for (const url of normalizeSourceUrl(input)) {
    try {
      const extracted = await extract(url, { isPdf: /\.pdf$|\/pdf\//i.test(url) })
      if (extracted.html && extracted.html.replace(/<[^>]+>/g, "").trim().length > 200) {
        return htmlToPaper(extracted.html, metaFrom(extracted, input.trim().startsWith("http") ? input.trim() : url))
      }
      errors.push(`${url}: ${extracted.error ?? "no article text found"}`)
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  throw new Error(`Could not extract a paper from ${input}. ${errors.join("; ")}`)
}
