/**
 * Tier 0 of the extraction chain: QwkSearch's own `extract-webpage` extractor.
 *
 * This is the seam that gives the LobeHub engine the extraction behaviour
 * qwksearch.com already has, rather than the generic readability pass LobeHub
 * ships with:
 *
 * - **Citation extraction** — author / author_cite / author_short / author_type
 *   / date / source resolved against a 90k-name database, so the side panel's
 *   `cite` string is a real APA citation instead of `hostname (no date)`.
 * - **YouTube transcripts** — `extract-youtube` via `convertYoutubeToText`,
 *   for URLs the old chain rejected outright as `video`.
 * - **PDF and arXiv** — `extract-pdf` via the extractor's own PDF branch.
 * - **DOCX and Google Docs** — rewritten to an export URL, then converted.
 *
 * The module is loaded through {@link loadExtractWebpage} rather than a static
 * import for two reasons: the extractor is only needed on the article path (so
 * it stays out of the hot Worker start-up graph), and a missing or broken
 * install degrades to `{ error }` — which the chain in `extract.ts` treats as
 * "advance to the next tier" — instead of taking the Worker down.
 *
 * `extract-webpage` parses HTML with `linkedom`, so the Worker build must NOT
 * alias `linkedom` to a shim. See `vite.worker.config.ts`.
 */

/** The article shape `extract-webpage` returns. Wider than ours in two fields. */
export interface QwkExtractedArticle {
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: number | string;
  cite?: string;
  date?: string;
  error?: number | string;
  format?: string;
  html?: string;
  source?: string;
  title?: string;
  url?: string;
  word_count?: number;
}

export interface ExtractWebpageModule {
  extractContent: (
    urlOrDoc: string,
    options?: Record<string, unknown>,
  ) => Promise<QwkExtractedArticle>;
  extractContentAndCite: (
    htmlOrDoc: string,
    options?: Record<string, unknown>,
  ) => QwkExtractedArticle;
}

/** Injectable loader so tests never need the real package installed. */
export type ExtractWebpageLoader = () => Promise<ExtractWebpageModule>;

let cached: Promise<ExtractWebpageModule> | undefined;

/**
 * Default loader: imports `extract-webpage` once and memoises the promise.
 *
 * Only the package root is imported. Its barrel deliberately excludes the
 * `seektopic/` and `utils/documents` modules, so `@huggingface/transformers`
 * and `chat-agent-toolkit` stay out of the Worker bundle even though they are
 * listed as dependencies of the package.
 */
export const loadExtractWebpage: ExtractWebpageLoader = () =>
  (cached ??= import('extract-webpage') as Promise<unknown> as Promise<ExtractWebpageModule>);

/** Test seam: drop the memoised module so the next call re-imports. */
export const resetExtractWebpageCache = () => {
  cached = undefined;
};

export interface QwkSearchExtractOptions {
  /** Preferred transcript languages for YouTube URLs. Defaults to `['en']`. */
  languages?: string[];
  loader?: ExtractWebpageLoader;
  /**
   * Where `extract-pdf` does OCR: `frontend` (all JS, no OCR), `hybrid` (OCR
   * only the pages that scan as infographics or tables) or `docling` (OCR every
   * page). `extractContent` forwards its whole options object to
   * `convertPDFToHTML`, so these two reach the PDF branch unchanged.
   */
  pdfProcessor?: string;
  /** Docling-compatible processor base URL for `hybrid` / `docling`. */
  pdfProcessorUrl?: string;
  /** Outbound proxy for the extractor's own fetch, when one is configured. */
  proxy?: null | string;
  /** Seconds, matching `extract-webpage`'s own unit. Defaults to 10. */
  timeoutSeconds?: number;
  /** Let the extractor fall back to a third-party reader service. */
  useThirdPartyBackup?: boolean;
}

export const QWKSEARCH_TIMEOUT_SECONDS = 10;

/** Normalise `extract-webpage`'s wider `error` / `author_type` into ours. */
const normalizeError = (error: QwkExtractedArticle['error']): string | undefined => {
  if (error === undefined || error === null) return undefined;
  const text = String(error).trim();
  return text.length > 0 ? text : 'Extraction failed';
};

const normalizeAuthorType = (value: QwkExtractedArticle['author_type']): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

/**
 * Map an `extract-webpage` result onto the side panel's article shape.
 *
 * Returns `{ error }` — never throws — for any result without usable HTML, so
 * the caller can fall through to the next tier.
 */
export const fromQwkArticle = <TVia extends string>(
  result: QwkExtractedArticle | null | undefined,
  url: string,
  via: TVia,
): {
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  cite?: string;
  date?: string;
  error?: string;
  html?: string;
  source?: string;
  title?: string;
  url?: string;
  via?: TVia;
  word_count?: number;
} => {
  const error = normalizeError(result?.error);
  if (error) return { error };
  if (!result?.html || result.html.trim().length === 0) {
    return { error: 'QwkSearch extractor produced no content' };
  }

  return {
    author: result.author || undefined,
    author_cite: result.author_cite || undefined,
    author_short: result.author_short || undefined,
    author_type: normalizeAuthorType(result.author_type),
    cite: result.cite || undefined,
    date: result.date || undefined,
    html: result.html,
    source: result.source || undefined,
    title: result.title || undefined,
    url: result.url || url,
    via,
    word_count: result.word_count || undefined,
  };
};

/**
 * Run `extractContent` against a URL. The extractor picks its own branch —
 * YouTube transcript, PDF, DOCX or article scrape + citation extraction — so
 * this one call covers every URL kind the chain routes here.
 */
export const runQwkSearchExtractor = async (
  url: string,
  options: QwkSearchExtractOptions = {},
): Promise<QwkExtractedArticle> => {
  const load = options.loader ?? loadExtractWebpage;
  const { extractContent } = await load();
  return extractContent(url, {
    absoluteURLs: true,
    formatting: true,
    images: true,
    languages: options.languages?.length ? options.languages : ['en'],
    links: true,
    // `extract-webpage` reads `processor` only on its PDF branch, and treats an
    // absent one as `frontend`; sending it for an HTML URL is inert.
    ...(options.pdfProcessor ? { processor: options.pdfProcessor } : {}),
    ...(options.pdfProcessorUrl ? { processorUrl: options.pdfProcessorUrl } : {}),
    proxy: options.proxy ?? null,
    timeout: options.timeoutSeconds ?? QWKSEARCH_TIMEOUT_SECONDS,
    url,
    useThirdPartyBackup: options.useThirdPartyBackup ?? false,
  });
};

/**
 * Run `extractContentAndCite` against HTML somebody else already rendered —
 * used to put QwkSearch's citation extraction over the Puppeteer scraper's
 * output instead of throwing that metadata away.
 *
 * Synchronous in `extract-webpage`; async here only because of the loader.
 */
export const runQwkSearchHtmlExtractor = async (
  html: string,
  url: string,
  options: Pick<QwkSearchExtractOptions, 'loader'> = {},
): Promise<QwkExtractedArticle> => {
  const load = options.loader ?? loadExtractWebpage;
  const { extractContentAndCite } = await load();
  return extractContentAndCite(html, {
    absoluteURLs: true,
    formatting: true,
    images: true,
    links: true,
    url,
  });
};
