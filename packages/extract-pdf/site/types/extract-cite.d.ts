/**
 * The slice of extract-cite's API this site calls, for `tsc` only.
 *
 * `tsconfig.json` maps `extract-cite` here instead of to the package source,
 * which is not written for this site's `strict` settings. Vite still bundles the
 * real source (see `aliases.ts`). Keep the types in step with
 * `extract-cite/src/llm/types.ts` (copied below) and the function with
 * `extract-cite/src/llm/extract-cite-llm.ts`.
 */
export interface ExtractCiteResult {
  author?: string;
  author_cite?: string;
  date?: string;
  title?: string;
  source?: string;
}


/** Output styles `formatCitation` can write. */
export declare const CITATION_STYLES: readonly ["apa", "mla", "chicago", "harvard", "ieee", "bibtex"];
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

export declare const SOURCE_TYPES: SourceType[];

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

export declare const CITATION_FIELDS: CitationField[];

/** A field (or one author's qualifications) a human should check. */
export interface ReviewItem {
  /** A citation field, or `qualifications:<author name>`. */
  field: string;
  confidence: number;
  reason: string;
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
  /** Abort the model call after this many milliseconds. Default 60000. */
  timeoutMs?: number;
  /** ISO date printed as the access date. Default: today. */
  accessedDate?: string;
  /** Extra request headers (OpenRouter: `HTTP-Referer`, `X-Title`). */
  headers?: Record<string, string>;
  /** Replaces the global `fetch` for both the page and the model call. */
  fetch?: typeof fetch;
}

export declare function extractCiteLLM(options: ExtractCiteLLMOptions): Promise<ExtractCiteLLMResult>;
export declare const DEFAULT_MODEL: string;
export declare function fetchPageHTML(url: string, doFetch?: typeof fetch, timeoutMs?: number): Promise<string>;
export declare class CiteLLMError extends Error {
  status?: number;
}
