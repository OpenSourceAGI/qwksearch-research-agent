/**
 * @fileoverview `extractCiteLLM`: the cheap regex/metadata pass first, then one
 * model call that is handed what was found and what is still missing, completes
 * the APA parts, scores each one, and reads the authors' qualifications. The
 * same call checks that the extracted content is the full article, not a
 * paywall stub, and names the header, nav, sidebar and footer blocks to cut.
 */
import { parseHTML } from "linkedom";
import { extractCite } from "../html-to-cite/extract-cite";
import { callLLM } from "./call-llm";
import { parseContentCheck, prepareContent } from "./content-check";
import { formatCitations } from "./format-citation";
import { fetchPageHTML, preparePage } from "./page-text";
import { parseCitationReply } from "./parse-reply";
import { buildUserPrompt, missingFields, systemPrompt } from "./prompt";
import {
  CITATION_STYLES,
  type CitationField,
  type ExtractCiteLLMOptions,
  type ExtractCiteLLMResult,
} from "./types";

/**
 * Cites a page: regex first, then the model for what regex cannot do.
 *
 * ```ts
 * const cite = await extractCiteLLM({
 *   url: "https://www.nytimes.com/…",
 *   apiKey: process.env.OPENROUTER_API_KEY, // the default provider is OpenRouter
 *   model: "anthropic/claude-haiku-4.5",
 * });
 * cite.formatted.apa?.text;  // full APA 7 entry
 * cite.needsReview;          // fields to check by hand
 * cite.citation.authors[0].qualifications; // bio facts, quoted from the page
 * cite.contentCheck?.verdict; // "full", "paywalled", "truncated", …
 * cite.contentCheck?.tips;    // header, nav, sidebar, footer blocks to cut
 * ```
 *
 * Throws when the page cannot be fetched or the model call fails; a missing
 * author or date is not an error, it comes back flagged in `needsReview`.
 */
export async function extractCiteLLM(options: ExtractCiteLLMOptions): Promise<ExtractCiteLLMResult> {
  const started = Date.now();
  const { url, reviewThreshold = 0.7, styles = [...CITATION_STYLES], checkContent = true } = options;

  let html = options.html;
  if (!html && options.text === undefined) {
    if (!url) throw new Error("Provide a `url`, `html` or `text` to cite.");
    html = await fetchPageHTML(url, options.fetch);
  }
  html ??= `<html><body>${escapeText(options.text || "")}</body></html>`;

  // 1. The partial citation: what the heuristics can read off the page.
  const partial = extractCite(parseHTML(html).document, { url }) || {};
  const missing: CitationField[] = missingFields(partial);

  // 2. One model call with the partial in hand.
  const page = preparePage(html, { text: options.text, maxChars: options.maxChars });
  const content = checkContent
    ? prepareContent(html, { content: options.content, text: options.text, words: options.contentWords })
    : undefined;
  const { json, model } = await callLLM({
    apiKey: options.apiKey,
    model: options.model,
    baseUrl: options.baseUrl,
    headers: options.headers,
    timeoutMs: options.timeoutMs,
    fetch: options.fetch,
    system: systemPrompt(checkContent),
    user: buildUserPrompt({ url, partial, missing, page, content }),
  });

  // 3. Validate it against the page and score it.
  const accessedDate = options.accessedDate || new Date().toISOString().slice(0, 10);
  const parsed = parseCitationReply(
    json,
    { pageText: [page.pageTitle, page.meta, page.jsonLd, page.text].join("\n"), url, accessedDate },
    partial,
    reviewThreshold
  );

  // 4. The content check, held to the same standard: quotes must be in the
  // text, selectors must match the page.
  const contentCheck = content
    ? parseContentCheck(
        (json as { contentCheck?: unknown } | null)?.contentCheck,
        content,
        [content.text, page.text, page.pageTitle].join("\n")
      )
    : undefined;
  if (contentCheck && !contentCheck.isFullContent && contentCheck.verdict !== "unknown") {
    parsed.needsReview.push({
      field: "content",
      confidence: contentCheck.confidence,
      reason: `${contentCheck.verdict}: ${contentCheck.note || contentCheck.signals[0] || "not the full article"}`,
    });
    parsed.needsReview.sort((a, b) => a.confidence - b.confidence);
  }

  // `agree` means the regex pass and the model read the same value; anything
  // else the model supplied, because the regex pass had nothing or was overruled.
  const origin: ExtractCiteLLMResult["origin"] = {};
  for (const field of Object.keys(parsed.confidence) as CitationField[]) {
    const has = field === "authors" ? parsed.citation.authors.length > 0 : Boolean(parsed.citation[field]);
    if (has) origin[field] = parsed.agreement[field] === "agree" ? "both" : "llm";
  }

  const required: CitationField[] = ["authors", "title", "containerTitle", "publishedDate"];
  const overallConfidence =
    required.reduce((sum, field) => sum + parsed.confidence[field], 0) / required.length;

  return {
    citation: parsed.citation,
    confidence: parsed.confidence,
    overallConfidence,
    needsReview: parsed.needsReview,
    partial,
    missing,
    origin,
    formatted: formatCitations(parsed.citation, styles),
    contentCheck,
    model,
    ms: Date.now() - started,
  };
}

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
