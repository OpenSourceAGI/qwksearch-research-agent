/**
 * @fileoverview Shared types for the LLM citation pass: the citation record
 * (everything APA needs), per-field confidence, review flags, and options.
 */
import type { ExtractCiteResult } from "../html-to-cite/extract-cite";

/** Output styles `formatCitation` can write. */
export const CITATION_STYLES = [
  "apa",
  "mla",
  "chicago",
  "harvard",
  "ieee",
  "bibtex",
] as const;
export type CitationStyle = (typeof CITATION_STYLES)[number];

export type SourceType =
  | "webpage"
  | "news-article"
  | "blog-post"
  | "journal-article"
  | "report"
  | "book"
  | "video"
  | "other";

export const SOURCE_TYPES: SourceType[] = [
  "webpage",
  "news-article",
  "blog-post",
  "journal-article",
  "report",
  "book",
  "video",
  "other",
];

/** What the page says about who an author is. Only ever from the document. */
export interface AuthorQualifications {
  /** Job title or role, e.g. "Senior Fellow". */
  jobTitle?: string;
  /** Employer, university, think tank, newsroom. */
  affiliation?: string;
  /** Degrees and credentials, e.g. ["PhD", "JD"]. */
  credentials?: string[];
  /** Fields the author is described as an expert in. */
  expertise?: string[];
  /** Notable books, awards, past roles named in the bio. */
  highlights?: string[];
  /** The bio sentence(s) copied verbatim from the page. */
  evidence?: string;
}

export interface CitationAuthor {
  /** Name as printed, "Given Family" order. */
  name: string;
  given?: string;
  family?: string;
  /** Jr., III, … */
  suffix?: string;
  /** A group author (agency, newsroom, company): never inverted or abbreviated. */
  isOrganization: boolean;
  /** 0–1: how sure the model is this is a real author of this document. */
  confidence: number;
  qualifications?: AuthorQualifications;
}

/** Every part a bibliography entry can be built from. */
export interface CitationData {
  sourceType: SourceType;
  authors: CitationAuthor[];
  title?: string;
  /** Site, newspaper, magazine or journal the item sits in. */
  containerTitle?: string;
  publisher?: string;
  /** ISO 8601 and as precise as the page is: `2024-03-05`, `2024-03` or `2024`. */
  publishedDate?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  /** ISO date the citation was made; APA and MLA print it for pages that change. */
  accessedDate?: string;
}

/** The fields that carry a confidence score. */
export type CitationField =
  | "authors"
  | "title"
  | "containerTitle"
  | "publisher"
  | "publishedDate"
  | "doi"
  | "volume"
  | "issue"
  | "pages";

export const CITATION_FIELDS: CitationField[] = [
  "authors",
  "title",
  "containerTitle",
  "publisher",
  "publishedDate",
  "doi",
  "volume",
  "issue",
  "pages",
];

/** A field (or one author's qualifications) a human should check. */
export interface ReviewItem {
  /** A citation field, `qualifications:<author name>`, or `content` when the content check found no full article. */
  field: string;
  confidence: number;
  reason: string;
}

/** What the content check concluded about the extracted text. */
export type ContentVerdict =
  /** The article body is all there. */
  | "full"
  /** A subscribe or sign-in wall replaces or cuts the body. */
  | "paywalled"
  /** The body stops early without a wall: a teaser, an abstract, "Read more". */
  | "truncated"
  /** A bot check, consent wall, access-denied or error page instead of the article. */
  | "blocked"
  /** A home page, index or listing, with no single article. */
  | "not-article"
  /** The model gave no usable verdict. */
  | "unknown";

export const CONTENT_VERDICTS: ContentVerdict[] = [
  "full",
  "paywalled",
  "truncated",
  "blocked",
  "not-article",
  "unknown",
];

/** The kinds of clutter a readability tip can be about. */
export type PageRegion =
  | "header"
  | "nav"
  | "sidebar"
  | "footer"
  | "ads"
  | "related"
  | "newsletter"
  | "share"
  | "comments"
  | "cookie-banner"
  | "other";

export const PAGE_REGIONS: PageRegion[] = [
  "header",
  "nav",
  "sidebar",
  "footer",
  "ads",
  "related",
  "newsletter",
  "share",
  "comments",
  "cookie-banner",
  "other",
];

/** Clutter the extraction kept, and how to cut it. */
export interface ReadabilityTip {
  region: PageRegion;
  /** CSS selector of the block to cut. Kept only when it matches an element on the page. */
  selector?: string;
  /** A short snippet of the clutter, kept only when it is in the text. */
  example?: string;
  /** How to cut it, in a sentence. */
  tip: string;
}

/** Whether the extracted content is the full article, and how to make it cleaner. */
export interface ContentCheck {
  verdict: ContentVerdict;
  /** True only for `"full"`. */
  isFullContent: boolean;
  /** 0–1. */
  confidence: number;
  /** Phrases from the text that show the verdict ("Subscribe to continue reading"); only ones that are in the text are kept. */
  signals: string[];
  /** One or two sentences for the reader. */
  note: string;
  /** CSS selector of the element that holds the article body. Kept only when it matches. */
  contentSelector?: string;
  /** Clutter the content still holds (header, nav, sidebar, footer, …), biggest first. */
  tips: ReadabilityTip[];
  /**
   * The checked selectors in the shape of an `extract-webpage`
   * `extract-selectors-per-domain.json` entry, ready to paste.
   */
  selectors: { content: string[]; remove: string[] };
  /** Words of content the model was shown. */
  wordsChecked: number;
}

export interface FormattedCitation {
  /** Plain text. */
  text: string;
  /** The same entry with `<i>` for italics, every value HTML-escaped. */
  html: string;
}

export interface ExtractCiteLLMResult {
  citation: CitationData;
  /** Per-field confidence, 0–1. */
  confidence: Record<CitationField, number>;
  /** Mean of the fields APA needs: authors, date, title, container. */
  overallConfidence: number;
  /** Fields and author bios below the review threshold or that failed a check. */
  needsReview: ReviewItem[];
  /** Which fields the cheap regex/metadata pass found, before the model ran. */
  partial: ExtractCiteResult;
  /** Fields the regex pass left empty and the model was asked to fill. */
  missing: CitationField[];
  /** Who set each field: the regex pass, the model, or both (they agreed). */
  origin: Partial<Record<CitationField, "regex" | "llm" | "both">>;
  /** One entry per requested style. */
  formatted: Partial<Record<CitationStyle, FormattedCitation>>;
  /** Full article or paywall stub, plus tips for cutting clutter. Absent with `checkContent: false`. */
  contentCheck?: ContentCheck;
  model: string;
  ms: number;
}

export interface ExtractCiteLLMOptions {
  /** Page to cite. Fetched unless `html` or `text` is given. */
  url?: string;
  /** HTML you already have. */
  html?: string;
  /** Plain text of the page, used instead of text taken from `html`. */
  text?: string;
  /** API key. Default: `OPENROUTER_API_KEY` from the environment, when there is one. */
  apiKey?: string;
  /** Default `anthropic/claude-haiku-4.5`. Any model id the endpoint serves. */
  model?: string;
  /** Any OpenAI-compatible chat-completions API. Default OpenRouter. */
  baseUrl?: string;
  /** Styles to write. Default: all of them. */
  styles?: CitationStyle[];
  /** Fields scoring below this are flagged for review. Default 0.7. */
  reviewThreshold?: number;
  /** Characters of page text sent to the model. Default 12000. */
  maxChars?: number;
  /**
   * The content extracted from the page (HTML or text), e.g. extract-webpage's
   * `html`, for the content check. Default: the page's own visible text.
   */
  content?: string;
  /** Check that the content is the full article and suggest what to cut. Default true. */
  checkContent?: boolean;
  /** Words of content the check is shown, from the start. Default 3000. */
  contentWords?: number;
  /** Abort the model call after this many milliseconds. Default 60000. */
  timeoutMs?: number;
  /** ISO date printed as the access date. Default: today. */
  accessedDate?: string;
  /** Extra request headers (OpenRouter: `HTTP-Referer`, `X-Title`). */
  headers?: Record<string, string>;
  /** Replaces the global `fetch` for both the page and the model call. */
  fetch?: typeof fetch;
}
