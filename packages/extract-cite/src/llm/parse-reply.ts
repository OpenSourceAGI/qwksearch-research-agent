/**
 * @fileoverview Turns the model's JSON into a `CitationData` with per-field
 * confidence, then checks it: scores are clamped, dates validated, author names
 * and bio quotes must appear in the page, and anything shaky is flagged for
 * review. The model's output is never trusted as-is: it is length-capped and
 * stripped of markup because it ends up in rendered citations.
 */
import type { ExtractCiteResult } from "../html-to-cite/extract-cite";
import {
  CITATION_FIELDS,
  SOURCE_TYPES,
  type AuthorQualifications,
  type CitationAuthor,
  type CitationData,
  type CitationField,
  type ReviewItem,
  type SourceType,
} from "./types";

type Json = Record<string, any>;

const MAX_LEN = 500;

/** A trimmed, tag-free string of sane length, or undefined. */
function str(value: unknown, max = MAX_LEN): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || /^(null|none|n\/a|unknown|undefined)$/i.test(clean)) return undefined;
  return clean.slice(0, max);
}

function strList(value: unknown, max = 12): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.map((v) => str(v, 160)).filter(Boolean) as string[];
  return out.length ? out.slice(0, max) : undefined;
}

/** A number clamped to 0–1; anything else counts as no confidence at all. */
export function clamp01(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** Keeps `YYYY`, `YYYY-MM` or `YYYY-MM-DD` when it is a real date, else undefined. */
export function normalizeDate(value: unknown): string | undefined {
  const text = str(value, 40);
  const match = text?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(?:[T ].*)?$/);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const year = Number(y);
  if (year < 1400 || year > new Date().getUTCFullYear() + 1) return undefined;
  if (m) {
    const month = Number(m);
    if (month < 1 || month > 12) return undefined;
    if (d) {
      const day = Number(d);
      const real = new Date(Date.UTC(year, month - 1, day));
      if (real.getUTCMonth() !== month - 1) return undefined;
      return `${y}-${m}-${d}`;
    }
    return `${y}-${m}`;
  }
  return y;
}

function normalizeQualifications(value: unknown): AuthorQualifications | undefined {
  if (!value || typeof value !== "object") return undefined;
  const q = value as Json;
  const out: AuthorQualifications = {
    jobTitle: str(q.jobTitle, 160),
    affiliation: str(q.affiliation, 160),
    credentials: strList(q.credentials),
    expertise: strList(q.expertise),
    highlights: strList(q.highlights),
    evidence: str(q.evidence, 800),
  };
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

/** Lowercase letters and digits only, so quotes and spacing cannot hide a match. */
const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Is `needle` somewhere in `haystack`, ignoring case, punctuation and spacing? */
export function appearsIn(needle: string | undefined, haystack: string): boolean {
  const n = squash(needle || "");
  return n.length > 0 && squash(haystack).includes(n);
}

function normalizeAuthor(value: unknown): CitationAuthor | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Json;
  const given = str(a.given, 80);
  const family = str(a.family, 80);
  const name = str(a.name, 160) || [given, family].filter(Boolean).join(" ");
  if (!name) return null;
  const isOrganization = a.isOrganization === true;
  return {
    name,
    given: isOrganization ? undefined : given,
    family: isOrganization ? undefined : family,
    suffix: isOrganization ? undefined : str(a.suffix, 20),
    isOrganization,
    confidence: clamp01(a.confidence),
    qualifications: normalizeQualifications(a.qualifications),
  };
}

export interface ParsedCitation {
  citation: CitationData;
  confidence: Record<CitationField, number>;
  needsReview: ReviewItem[];
  /** Fields the model's value matches the regex pass on, or replaced. */
  agreement: Partial<Record<CitationField, "agree" | "replaced" | "filled">>;
}

const FIELD_NOTE_LABEL: Record<CitationField, string> = {
  authors: "authors",
  title: "title",
  containerTitle: "site or publication",
  publisher: "publisher",
  publishedDate: "publication date",
  doi: "DOI",
  volume: "volume",
  issue: "issue",
  pages: "pages",
};

/** The parts that decide whether a citation is usable at all. */
const REQUIRED: CitationField[] = ["authors", "title", "publishedDate"];

/**
 * Normalizes and checks the model's reply.
 * @param reply parsed JSON from the model
 * @param context `pageText`: everything the model was shown (text, meta, JSON-LD) that a name or quote must appear in
 * @param partial what the regex pass found, to compare against
 */
export function parseCitationReply(
  reply: unknown,
  context: { pageText: string; url?: string; accessedDate?: string },
  partial: ExtractCiteResult,
  reviewThreshold: number
): ParsedCitation {
  const r = (reply && typeof reply === "object" ? reply : {}) as Json;
  const flagged = new Map<string, ReviewItem>();
  const flag = (field: string, confidence: number, reason: string) => {
    const prior = flagged.get(field);
    flagged.set(field, {
      field,
      confidence: Math.min(confidence, prior?.confidence ?? 1),
      reason: prior ? `${prior.reason}; ${reason}` : reason,
    });
  };

  const confidence = Object.fromEntries(CITATION_FIELDS.map((f) => [f, 0])) as Record<
    CitationField,
    number
  >;
  const scalar = (field: CitationField, normalize: (v: unknown) => string | undefined) => {
    const entry = (r[field] && typeof r[field] === "object" ? r[field] : {}) as Json;
    const value = normalize(entry.value);
    confidence[field] = clamp01(entry.confidence);
    if (entry.needsReview === true)
      flag(field, confidence[field], str(entry.note, 200) || "the model asked for review");
    return { value, note: str(entry.note, 200) };
  };

  const sourceType: SourceType = SOURCE_TYPES.includes(r.sourceType) ? r.sourceType : "webpage";
  const title = scalar("title", (v) => str(v, 300));
  const containerTitle = scalar("containerTitle", (v) => str(v, 200));
  const publisher = scalar("publisher", (v) => str(v, 200));
  const publishedDate = scalar("publishedDate", normalizeDate);
  const doi = scalar("doi", (v) => str(v, 120)?.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, ""));
  const volume = scalar("volume", (v) => str(v, 40));
  const issue = scalar("issue", (v) => str(v, 40));
  const pages = scalar("pages", (v) => str(v, 40));

  // A date the model returned but that failed validation is the model being
  // wrong, not the page lacking a date.
  const rawDate = r.publishedDate?.value;
  if (str(rawDate) && !publishedDate.value) {
    confidence.publishedDate = 0;
    flag("publishedDate", 0, `"${str(rawDate, 40)}" is not a valid date`);
  }

  // Authors.
  const authorBlock = (r.authors && typeof r.authors === "object" ? r.authors : {}) as Json;
  const authors = (Array.isArray(authorBlock.items) ? authorBlock.items : [])
    .map(normalizeAuthor)
    .filter(Boolean)
    .slice(0, 25) as CitationAuthor[];
  const listConfidence = clamp01(authorBlock.confidence);
  confidence.authors = authors.length
    ? Math.min(listConfidence, ...authors.map((a) => a.confidence))
    : listConfidence;
  if (authorBlock.needsReview === true)
    flag("authors", confidence.authors, str(authorBlock.note, 200) || "the model asked for review");

  // Compare with the regex pass: same value is corroboration, a different one
  // is the model overruling a heuristic.
  const agreement: ParsedCitation["agreement"] = {};
  const compare = (field: CitationField, ours: string | undefined, theirs: string | undefined) => {
    if (!ours) return;
    if (!theirs) return;
    agreement[field] = squash(ours) === squash(theirs) ? "agree" : "replaced";
  };
  compare("title", title.value, partial.title);
  compare("containerTitle", containerTitle.value, partial.source);
  compare("publishedDate", publishedDate.value, partial.date);
  if (authors.length && (partial.author_cite || partial.author)) {
    const theirs = partial.author_cite || partial.author;
    agreement.authors = authors.some((a) => appearsIn(a.family || a.name, theirs!)) ? "agree" : "replaced";
  }
  for (const [field, how] of Object.entries(agreement) as [CitationField, string][]) {
    if (how === "agree") confidence[field] = Math.min(1, confidence[field] + 0.1);
  }

  const haystack = `${context.pageText}\n${context.url || ""}`;
  for (const author of authors) {
    // A name the page never prints is a hallucination, whatever its score.
    const probe = author.isOrganization ? author.name : author.family || author.name;
    if (!appearsIn(probe, haystack)) {
      author.confidence = Math.min(author.confidence, 0.2);
      confidence.authors = Math.min(confidence.authors, 0.2);
      flag("authors", 0.2, `"${author.name}" does not appear in the page text`);
    }
    const q = author.qualifications;
    if (q) {
      const label = `qualifications:${author.name}`;
      if (!q.evidence) {
        flag(label, 0.4, "no supporting bio text was quoted");
      } else if (!appearsIn(q.evidence, haystack)) {
        // Unsupported claims about a person's credentials are dropped, not kept.
        delete author.qualifications;
        flag(label, 0, "the quoted bio is not in the page, so the qualifications were discarded");
      }
    }
  }

  const citation: CitationData = {
    sourceType,
    authors,
    title: title.value,
    containerTitle: containerTitle.value,
    publisher: publisher.value,
    publishedDate: publishedDate.value,
    doi: doi.value,
    volume: volume.value,
    issue: issue.value,
    pages: pages.value,
    url: context.url,
    accessedDate: context.accessedDate,
  };

  // Required parts that are absent, and anything below the threshold.
  for (const field of REQUIRED) {
    const missing = field === "authors" ? authors.length === 0 : !citation[field];
    if (missing) flag(field, confidence[field], `no ${FIELD_NOTE_LABEL[field]} found on the page`);
  }
  for (const field of CITATION_FIELDS) {
    const present = field === "authors" ? authors.length > 0 : Boolean(citation[field]);
    // An absent optional field with a low score is just "not there".
    if (present && confidence[field] < reviewThreshold)
      flag(field, confidence[field], `confidence ${confidence[field].toFixed(2)} is below ${reviewThreshold}`);
  }
  for (const author of authors) {
    if (author.qualifications && author.confidence < reviewThreshold)
      flag(`qualifications:${author.name}`, author.confidence, "the author match is uncertain");
  }

  return {
    citation,
    confidence,
    needsReview: [...flagged.values()].sort((a, b) => a.confidence - b.confidence),
    agreement,
  };
}
