/**
 * @fileoverview The "suggest the full text" form for a card whose quoted text
 * is missing: the check the form runs before it sends, and the JSON it sends.
 *
 * A `.refdoc.html` file is static and CDN-hosted, so it cannot store anything
 * itself: the runtime posts this payload to the `submitEndpoint` the file was
 * written with (`renderRefdocHtml(doc, { submitEndpoint })`, or a
 * `data-submit-endpoint` attribute on the runtime script tag). The endpoint
 * lives in an app with a backend — in this repo `POST /api/card-text-submissions`
 * in `apps/qwksearch-web`, which repeats these limits server-side and writes the
 * row to SQL.
 *
 * @module card-text-submission
 */

/** Shortest suggestion worth reviewing, in characters. */
export const CARD_TEXT_MIN_LENGTH = 20

/** Longest suggestion accepted, in characters. Keep equal to `apps/qwksearch-web/lib/card-text-submission.ts`. */
export const CARD_TEXT_MAX_LENGTH = 50_000

/** The JSON body posted to the submit endpoint. */
export interface CardTextSubmissionPayload {
  /** Which document: its source URL, else its title. */
  document: string
  documentTitle?: string
  /** The card's reference key, "ref-3" (the id of its `<li>` on the references page). */
  reference: string
  /** A readable name for the card for the reviewer: "Galloway '20 — Galloway, Ryan. "Go Vegetarian."…". */
  referenceLabel?: string
  /** The suggested full text. */
  text: string
  /** Honeypot: a real visitor never fills it in, a form-filling bot does. */
  website: string
}

/** Check a suggestion before sending. Returns a message to show, or null when it is fine. */
export function validateCardTextSuggestion(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return "Please paste the full text of the card."
  if (trimmed.length < CARD_TEXT_MIN_LENGTH) return `Please enter at least ${CARD_TEXT_MIN_LENGTH} characters.`
  if (trimmed.length > CARD_TEXT_MAX_LENGTH) return `Please keep it under ${CARD_TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`
  return null
}

/** True for a URL the runtime may post to: http(s) or a path on the same host. */
export function isSubmitEndpoint(value: unknown): value is string {
  return typeof value === "string" && /^(?:https?:\/\/[^\s/]+|\/(?!\/))[^\s]*$/i.test(value.trim())
}

/** The payload for one card. */
export function buildSubmissionPayload(input: {
  document: string
  documentTitle?: string
  reference: string
  referenceLabel?: string
  text: string
  website?: string
}): CardTextSubmissionPayload {
  return {
    document: input.document.trim(),
    documentTitle: input.documentTitle?.trim() || undefined,
    reference: input.reference,
    referenceLabel: input.referenceLabel?.replace(/\s+/g, " ").trim().slice(0, 300) || undefined,
    text: input.text.trim(),
    website: input.website ?? "",
  }
}
