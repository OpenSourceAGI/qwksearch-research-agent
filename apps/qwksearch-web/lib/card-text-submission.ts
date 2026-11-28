/**
 * @fileoverview Validation and spam helpers for card-text suggestions: the
 * "suggest the full text" form that `extract-refdoc` shows on a citation card
 * whose quoted text is missing. The form posts to `POST /api/card-text-submissions`
 * (see that route for how the pieces connect).
 *
 * The limits repeat `packages/extract-refdoc/src/card-text-submission.ts`, which
 * runs the same check in the browser before sending; this copy is the one that
 * counts, since the endpoint is public.
 */

/** Shortest suggestion accepted, in characters. */
export const CARD_TEXT_MIN_LENGTH = 20;
/** Longest suggestion accepted, in characters. */
export const CARD_TEXT_MAX_LENGTH = 50_000;
/** Longest document key (a source URL or title), in characters. */
export const DOCUMENT_KEY_MAX_LENGTH = 500;
/** Longest title or card label, in characters. */
export const LABEL_MAX_LENGTH = 300;
/** Largest request body read, in bytes. */
export const MAX_BODY_BYTES = 256 * 1024;
/** Suggestions one person (by hashed address) may send per window. */
export const SUBMISSIONS_PER_WINDOW = 5;
/** Length of that window. */
export const WINDOW_MS = 60 * 60 * 1000;

export type SubmissionStatus = "pending" | "approved" | "rejected";
export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = ["pending", "approved", "rejected"];

export interface CardTextSubmissionInput {
  documentKey: string;
  documentTitle: string | null;
  referenceKey: string;
  referenceLabel: string | null;
  text: string;
}

export type ParsedSubmission =
  | { ok: true; value: CardTextSubmissionInput }
  /** A bot filled the hidden field: accept it quietly and store nothing. */
  | { ok: true; honeypot: true }
  | { ok: false; error: string };

/** Control characters other than tab and newline: never part of quoted text. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const text = value.replace(CONTROL, "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

/**
 * Normalizes an untrusted request body. Returns the cleaned suggestion, a
 * honeypot hit, or the first problem found as a message fit to show the person
 * who filled the form in.
 */
export function parseCardTextSubmission(body: unknown): ParsedSubmission {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  // The `website` field is hidden from people; only a form-filling bot types in it.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return { ok: true, honeypot: true };
  }

  const documentKey = clean(raw.document, DOCUMENT_KEY_MAX_LENGTH);
  if (!documentKey) return { ok: false, error: "Missing document." };

  const referenceKey = typeof raw.reference === "string" ? raw.reference.trim() : "";
  if (!/^ref-\d{1,4}$/.test(referenceKey)) {
    return { ok: false, error: "Unknown reference." };
  }

  const text =
    typeof raw.text === "string"
      ? raw.text.replace(/\r\n?/g, "\n").replace(CONTROL, "").trim()
      : "";
  if (!text) return { ok: false, error: "Please paste the full text of the card." };
  if (text.length < CARD_TEXT_MIN_LENGTH) {
    return { ok: false, error: `Please enter at least ${CARD_TEXT_MIN_LENGTH} characters.` };
  }
  if (text.length > CARD_TEXT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Please keep it under ${CARD_TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  return {
    ok: true,
    value: {
      documentKey,
      documentTitle: clean(raw.documentTitle, LABEL_MAX_LENGTH),
      referenceKey,
      referenceLabel: clean(raw.referenceLabel, LABEL_MAX_LENGTH),
      text,
    },
  };
}

/** The address a request came from, as Cloudflare or a proxy reports it. */
export function clientIp(headers: Headers | undefined): string {
  return (
    headers?.get("cf-connecting-ip")?.trim() ||
    headers?.get("x-real-ip")?.trim() ||
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Salted SHA-256 of an address, hex. The address itself is never stored. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A time as SQLite's `CURRENT_TIMESTAMP` writes it ("2026-11-27 04:20:00"), for comparing with `createdAt`. */
export function sqliteTimestamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

export const isSubmissionStatus = (value: unknown): value is SubmissionStatus =>
  typeof value === "string" && (SUBMISSION_STATUSES as readonly string[]).includes(value);
