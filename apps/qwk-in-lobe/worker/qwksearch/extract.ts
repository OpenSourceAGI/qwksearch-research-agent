/**
 * Article extraction for the extract side panel.
 *
 * Port of `apps/qwksearch-web/lib/scraper/scrape-url.ts` onto the LobeHub
 * foundation. Bounded fallback chain, routed per URL kind by {@link tiersForUrl}:
 *   0. QwkSearch's own `extract-webpage` — citation extraction for articles,
 *      `extract-youtube` transcripts for videos, `extract-pdf` for PDFs.
 *   1. Cloudflare Puppeteer scraper (`SCRAPER_URL`, default proxy.qwksearch.com)
 *      with an 8s deadline, then citation extraction over the rendered HTML
 *      (falling back to LobeHub readability).
 *   2. Tavily extract API (`TAVILY_API_KEY`).
 *   3. LobeHub's own `@lobechat/web-crawler` (naive fetch + readability).
 *
 * Every tier returns `{ error }` instead of throwing so the caller can decide
 * whether to advance to the next one.
 */
import { htmlToMarkdown } from '@lobechat/web-crawler/src/utils/htmlToMarkdown';

import {
  type ExtractWebpageLoader,
  fromQwkArticle,
  type QwkSearchExtractOptions,
  runQwkSearchExtractor,
  runQwkSearchHtmlExtractor,
} from './extractQwkSearch';
import {
  type CitationStyle,
  DEFAULT_TIER_ORDER,
  type ExtractionSettings,
  resolveExtractionSettings,
  type TierId,
} from './extractSettings';

export interface ExtractedArticle {
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  cite?: string;
  /** Markdown/plain-text body, used by the LobeHub panel renderer. */
  content?: string;
  date?: string;
  error?: string;
  html?: string;
  source?: string;
  title?: string;
  url?: string;
  /** Which tier produced the article. */
  via?: 'crawler' | 'qwksearch' | 'qwksearch-html' | 'scraper' | 'tavily';
  word_count?: number;
}

export const SCRAPER_DEADLINE_MS = 8000;
/** Shortest plain-text body an extractor may return before it counts as empty. */
export const MIN_CONTENT_CHARS = 50;

const SEARCH_ENGINE_PATTERNS = [
  /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
  /^https?:\/\/(www\.)?bing\.com\/search/i,
  /^https?:\/\/(www\.)?duckduckgo\.com\/\?/i,
];

/**
 * Video hosts with no transcript path. YouTube is deliberately absent — it is
 * classified as `youtube` and extracted through `extract-youtube` instead.
 */
const VIDEO_PATTERNS = [/vimeo\.com\//i, /dailymotion\.com\/video/i, /twitch\.tv\//i];

/** Mirrors `getURLYoutubeVideo` in `extract-webpage`, without loading it. */
const YOUTUBE_PATTERN =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)[\w-]{11}/i;

/**
 * URLs `extract-pdf` should handle. arXiv `/abs/` pages are HTML, so only the
 * `/pdf/` form matches; the extractor also sniffs the `%PDF-` magic bytes at
 * runtime, which catches PDFs served from extensionless URLs.
 */
const PDF_PATTERNS = [/\.pdf($|[#?])/i, /arxiv\.org\/pdf\//i];

const CHALLENGE_MARKERS = [
  'Just a moment...',
  'Verifying you are human',
  'Please verify you are a human',
  'Enable JavaScript and cookies to continue',
  'Checking your browser before accessing',
  'Please complete the security check to access',
  'Attention Required! | Cloudflare',
  'Page unavailable | AP News',
];

export type UrlKind = 'article' | 'invalid' | 'pdf' | 'search-engine' | 'video' | 'youtube';

/**
 * Classify a URL before hitting the cache.
 *
 * `youtube` and `pdf` are extractable — they route to a different tier chain
 * (see {@link tiersForUrl}), not to the "no article here" response. Only
 * `invalid`, `search-engine` and the transcript-less `video` hosts are refused.
 */
export const classifyUrl = (url: string): UrlKind => {
  if (!url || /\s/.test(url)) return 'invalid';
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return 'invalid';
  } catch {
    return 'invalid';
  }
  if (SEARCH_ENGINE_PATTERNS.some((p) => p.test(url))) return 'search-engine';
  if (YOUTUBE_PATTERN.test(url)) return 'youtube';
  if (PDF_PATTERNS.some((p) => p.test(url))) return 'pdf';
  if (VIDEO_PATTERNS.some((p) => p.test(url))) return 'video';
  return 'article';
};

/** URL kinds the extraction chain can actually produce an article for. */
export const isExtractableKind = (kind: UrlKind): boolean =>
  kind === 'article' || kind === 'pdf' || kind === 'youtube';

export const looksLikeChallenge = (html?: string | null): boolean => {
  if (!html || typeof html !== 'string') return true;
  return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
};

export const hostnameOf = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

export const countWords = (text?: string | null): number =>
  text
    ? text
        .replaceAll(/<[^>]*>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

/**
 * A publication date we are willing to print.
 *
 * Anything at or before 1971 is treated as absent: unparsed dates and missing
 * timestamps land on the Unix epoch, and a citation that claims an article was
 * published in 1970 is worse than one with no date at all.
 */
const citableDate = (article: ExtractedArticle): Date | undefined => {
  const parsed = article.date ? new Date(article.date) : undefined;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getFullYear() <= 1971) return undefined;
  return parsed;
};

const citeLink = (url: string) => `<a href="${url}" target="_blank">${url}</a>`;

/** Terminal punctuation MLA and Chicago treat as already closing a segment. */
const ENDS_SENTENCE = /[!.?]$/;

/**
 * `Lovelace, A.` → `Lovelace, A. ` — one period, not two.
 *
 * `author_cite` arrives as `Last, F.` from the extractor's name database, so
 * appending the style's own period unconditionally doubles it.
 */
const citeSegment = (value?: string): string =>
  value ? `${ENDS_SENTENCE.test(value) ? value : `${value}.`} ` : '';

/** MLA/Chicago title: quoted, with the period inside unless it ends in ? or !. */
const citeTitle = (title?: string): string =>
  title ? `"<b>${title}</b>${ENDS_SENTENCE.test(title) ? '' : '.'}" ` : '';

const buildApaCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const source = article.source || '';
  const apaDate = date
    ? ` (${date.getFullYear()}, ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
    : '';
  return `${article.author_cite || source || ' '}${apaDate}. <b>${article.title || ''}</b>. <i>${source}</i>. ${citeLink(url)}`;
};

/** `Lovelace, A. "Title." Source, 5 Mar. 2024, url.` */
const buildMlaCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const head = citeSegment(article.author_cite);
  const title = citeTitle(article.title);
  const day = date
    ? `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}. ${date.getFullYear()}`
    : '';
  const tail = [article.source ? `<i>${article.source}</i>` : '', day, citeLink(url)]
    .filter(Boolean)
    .join(', ');
  return `${head}${title}${tail}.`;
};

/** `Lovelace, A. "Title." Source, March 5, 2024. url.` */
const buildChicagoCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const head = citeSegment(article.author_cite);
  const title = citeTitle(article.title);
  const day = date
    ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const mid = [article.source ? `<i>${article.source}</i>` : '', day].filter(Boolean).join(', ');
  return `${head}${title}${mid}${mid ? '. ' : ''}${citeLink(url)}.`;
};

/**
 * Citation string for an article, in the configured style.
 *
 * APA is the default and keeps the exact shape the extractor's own URL branch
 * produces, so an APA deployment sees no change from before styles existed.
 */
export const buildCite = (
  article: ExtractedArticle,
  url: string,
  style: CitationStyle = 'apa',
): string => {
  const date = citableDate(article);
  switch (style) {
    case 'chicago': {
      return buildChicagoCite(article, url, date);
    }
    case 'mla': {
      return buildMlaCite(article, url, date);
    }
    default: {
      return buildApaCite(article, url, date);
    }
  }
};

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Minimal markdown → HTML for Tavily/crawler output so `html` is always populated. */
export const markdownToSimpleHtml = (raw: string): string =>
  raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{1,6}) (\S.*)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }
      const withLinks = escapeHtml(block).replaceAll(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>',
      );
      return `<p>${withLinks.replaceAll('\n', '<br/>')}</p>`;
    })
    .join('\n');

/**
 * Readability + markdown conversion over rendered HTML using LobeHub's crawler
 * utilities. The fallback when QwkSearch's extractor finds nothing.
 */
export const articleFromHtmlViaCrawler = (
  html: string,
  url: string,
  via: ExtractedArticle['via'],
  citationStyle: CitationStyle = 'apa',
): ExtractedArticle => {
  const parsed = htmlToMarkdown(html, { filterOptions: { enableReadability: true }, url });
  if (!parsed.content || parsed.content.trim().length < MIN_CONTENT_CHARS) {
    return { error: 'Extraction produced no content' };
  }

  const article: ExtractedArticle = {
    author: parsed.author,
    author_cite: parsed.author,
    content: parsed.content,
    date: parsed.publishedTime,
    html: markdownToSimpleHtml(parsed.content),
    source: parsed.siteName || hostnameOf(url),
    title: parsed.title,
    url,
    via,
    word_count: countWords(parsed.content),
  };
  article.cite = buildCite(article, url, citationStyle);
  return article;
};

/**
 * Markdown body for HTML the QwkSearch extractor already reduced to the article.
 * Readability is off — running it a second time over extracted content drops
 * headings and lead paragraphs it no longer recognises as part of a page.
 */
export const contentFromExtractedHtml = (html: string, url: string): string | undefined => {
  try {
    const { content } = htmlToMarkdown(html, { filterOptions: { enableReadability: false }, url });
    return content?.trim() || undefined;
  } catch {
    // A malformed fragment is not worth failing the extraction over; the panel
    // renders `html`, and only the AI Q&A path reads `content`.
    return undefined;
  }
};

/** Fill in whatever the QwkSearch extractor did not resolve itself. */
const completeQwkArticle = (
  article: ExtractedArticle,
  url: string,
  html: string,
  citationStyle: CitationStyle = 'apa',
): ExtractedArticle => {
  article.content = contentFromExtractedHtml(html, article.url || url);
  article.source ||= hostnameOf(article.url || url);
  article.word_count ||= countWords(article.content || html);
  // The extractor builds its own citation, and it is APA — so it is kept as-is
  // when APA is what was asked for, and rebuilt from the extracted fields when
  // it is not. Rebuilding unconditionally would throw away the name-database
  // formatting APA users are getting today.
  if (!article.cite || citationStyle !== 'apa') {
    article.cite = buildCite(article, article.url || url, citationStyle);
  }
  return article;
};

/**
 * Tier 0: QwkSearch's own extractor.
 *
 * One call covers three of the chain's jobs — article + citation extraction,
 * YouTube transcripts and PDF conversion — because `extract-webpage` branches
 * on the URL itself. See `extractQwkSearch.ts` for why it is loaded lazily.
 */
export const extractViaQwkSearch = async (
  url: string,
  options: QwkSearchExtractOptions & { citationStyle?: CitationStyle } = {},
): Promise<ExtractedArticle> => {
  let raw;
  try {
    raw = await runQwkSearchExtractor(url, options);
  } catch (error) {
    return { error: (error as Error)?.message || 'QwkSearch extractor failed' };
  }

  const article = fromQwkArticle(raw, url, 'qwksearch') as ExtractedArticle;
  if (article.error || !article.html) return article;
  // Tier 0 fetches without a browser, so a bot check comes back as a page. The
  // extractor keeps short pages verbatim rather than failing, which would let a
  // challenge interstitial pass as an article and skip the Puppeteer tier that
  // exists to get past it.
  if (looksLikeChallenge(article.html)) {
    return { error: 'QwkSearch extractor returned a challenge page' };
  }
  return completeQwkArticle(article, url, article.html, options.citationStyle);
};

/**
 * Turn already-rendered HTML into an article, preferring QwkSearch's citation
 * extraction and falling back to LobeHub readability when it yields nothing.
 *
 * This is what keeps the scraper tier from throwing away author/date metadata:
 * the Puppeteer worker gets past the bot check, `extract-webpage` reads the
 * byline off the rendered DOM.
 */
export const articleFromRenderedHtml = async (
  html: string,
  url: string,
  fallbackVia: ExtractedArticle['via'],
  loader?: ExtractWebpageLoader,
  citationStyle: CitationStyle = 'apa',
): Promise<ExtractedArticle> => {
  try {
    const raw = await runQwkSearchHtmlExtractor(html, url, { loader });
    const article = fromQwkArticle(raw, url, 'qwksearch-html') as ExtractedArticle;
    if (!article.error && article.html) {
      return completeQwkArticle(article, url, article.html, citationStyle);
    }
  } catch {
    // Fall through to LobeHub readability below.
  }
  return articleFromHtmlViaCrawler(html, url, fallbackVia, citationStyle);
};

export interface ScraperConfig {
  apiKey?: string;
  baseUrl?: string;
  citationStyle?: CitationStyle;
  deadlineMs?: number;
  fetcher?: typeof fetch;
  /** Injected in tests; production uses the real `extract-webpage`. */
  loader?: ExtractWebpageLoader;
}

/**
 * Tier 1: render through the Cloudflare Puppeteer scraper worker, then extract.
 */
export const extractViaScraper = async (
  url: string,
  config: ScraperConfig = {},
): Promise<ExtractedArticle> => {
  const baseUrl = config.baseUrl || process.env.SCRAPER_URL || 'https://proxy.qwksearch.com';
  const deadlineMs = config.deadlineMs ?? SCRAPER_DEADLINE_MS;
  const fetcher = config.fetcher ?? fetch;
  const apiKey = config.apiKey || process.env.SCRAPER_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);

  try {
    const target = new URL('/api/render', baseUrl);
    const params: Record<string, string> = {
      blockImages: 'true',
      bypassCaptcha: 'true',
      format: 'json',
      maxRetries: '1',
      sessionId: 'default',
      timeout: String(Math.max(deadlineMs - 1000, 4000)),
      url,
      wait: '0',
      waitUntil: 'domcontentloaded',
    };
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetcher(target, { headers, signal: controller.signal });
    if (!res.ok) return { error: `Scraper responded with ${res.status}` };

    const data = (await res.json().catch(() => null)) as { html?: string; url?: string } | null;
    const html = data?.html;
    if (!html || looksLikeChallenge(html)) {
      return { error: 'Scraper returned a challenge page or no content' };
    }

    return await articleFromRenderedHtml(
      html,
      data?.url || url,
      'scraper',
      config.loader,
      config.citationStyle,
    );
  } catch (error) {
    const e = error as Error;
    const aborted = e?.name === 'AbortError' || controller.signal.aborted;
    return {
      error: aborted ? `Scraper exceeded ${deadlineMs}ms deadline` : e?.message || 'Scraper failed',
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Tier 2: Tavily extract API.
 */
export const extractViaTavily = async (
  url: string,
  apiKey = process.env.TAVILY_API_KEY,
  fetcher: typeof fetch = fetch,
  citationStyle: CitationStyle = 'apa',
): Promise<ExtractedArticle> => {
  if (!apiKey) return { error: 'No Tavily API key configured' };

  let res: Response;
  try {
    res = await fetcher('https://api.tavily.com/extract', {
      body: JSON.stringify({ extract_depth: 'advanced', urls: [url] }),
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return { error: (error as Error)?.message || 'Tavily request failed' };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { error: `Tavily extract failed (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = (await res.json().catch(() => null)) as {
    results?: Array<{ raw_content?: string; title?: string; url?: string }>;
  } | null;
  const result = data?.results?.[0];
  if (!result?.raw_content) return { error: 'Tavily returned no content' };

  const article: ExtractedArticle = {
    content: result.raw_content,
    html: markdownToSimpleHtml(result.raw_content),
    source: hostnameOf(result.url || url),
    title: result.title || undefined,
    url: result.url || url,
    via: 'tavily',
    word_count: countWords(result.raw_content),
  };
  article.cite = buildCite(article, url, citationStyle);
  return article;
};

/**
 * Tier 3: LobeHub's own crawler (plain fetch + readability), no external service.
 */
export const extractViaCrawler = async (
  url: string,
  citationStyle: CitationStyle = 'apa',
): Promise<ExtractedArticle> => {
  try {
    const { Crawler } = await import('@lobechat/web-crawler');
    const crawler = new Crawler({ impls: ['naive'] });
    const result = await crawler.crawl({ impls: ['naive'], url });
    const data = result.data as {
      content?: string;
      errorMessage?: string;
      siteName?: string;
      title?: string;
      url?: string;
    };

    if (!data?.content || data.errorMessage) {
      return { error: data?.errorMessage || 'Crawler returned no content' };
    }

    const article: ExtractedArticle = {
      content: data.content,
      html: markdownToSimpleHtml(data.content),
      source: data.siteName || hostnameOf(data.url || url),
      title: data.title,
      url: data.url || url,
      via: 'crawler',
      word_count: countWords(data.content),
    };
    article.cite = buildCite(article, url, citationStyle);
    return article;
  } catch (error) {
    return { error: (error as Error)?.message || 'Crawler failed' };
  }
};

/**
 * One step of the chain. Carries the id it was built from so a caller — or a
 * test — can see *which* tiers a URL got without invoking them.
 */
export interface ExtractionTier {
  (url: string): Promise<ExtractedArticle>;
  tierId?: TierId;
}

const isUsable = (article: ExtractedArticle) => !!article.html && !article.error;

/** The options `extract-webpage` needs, projected out of the settings. */
export const toQwkSearchExtractOptions = (
  settings: ExtractionSettings,
): QwkSearchExtractOptions & { citationStyle: CitationStyle } => ({
  citationStyle: settings.citationStyle,
  languages: settings.languages,
  pdfProcessor: settings.pdfProcessor,
  pdfProcessorUrl: settings.pdfProcessorUrl,
  proxy: settings.proxy ?? null,
  timeoutSeconds: settings.timeoutSeconds,
  useThirdPartyBackup: settings.useThirdPartyBackup,
});

/** The Puppeteer render tier's config, projected out of the settings. */
export const toScraperConfig = (settings: ExtractionSettings): ScraperConfig => ({
  apiKey: settings.scraperApiKey,
  baseUrl: settings.scraperUrl,
  citationStyle: settings.citationStyle,
  deadlineMs: settings.scraperDeadlineMs,
});

const tagTier = (tierId: TierId, run: (url: string) => Promise<ExtractedArticle>): ExtractionTier =>
  Object.assign(run, { tierId });

/**
 * The tier chain for a URL, by kind, bound to the resolved settings.
 *
 * YouTube and PDF get the QwkSearch extractor alone: the remaining tiers render
 * or fetch HTML, which for a video page is the description and chrome rather
 * than the transcript, and for a PDF is bytes readability cannot parse. Serving
 * that would be worse than reporting the extraction failure.
 *
 * `settings.tiers` then filters what is left. It can legitimately empty the
 * chain — `QWKSEARCH_EXTRACT_TIERS=scraper` leaves a PDF URL with nothing to run
 * — and when it does the caller gets the "no tier configured" error rather than
 * a tier the operator switched off.
 */
export const tiersForUrl = (
  url: string,
  kind: UrlKind = classifyUrl(url),
  settings: ExtractionSettings = resolveExtractionSettings(),
): ExtractionTier[] => {
  const build: Record<TierId, () => ExtractionTier> = {
    crawler: () => tagTier('crawler', (u) => extractViaCrawler(u, settings.citationStyle)),
    qwksearch: () =>
      tagTier('qwksearch', (u) => extractViaQwkSearch(u, toQwkSearchExtractOptions(settings))),
    scraper: () => tagTier('scraper', (u) => extractViaScraper(u, toScraperConfig(settings))),
    tavily: () =>
      tagTier('tavily', (u) =>
        extractViaTavily(u, settings.tavilyApiKey, undefined, settings.citationStyle),
      ),
  };

  const candidates: TierId[] =
    kind === 'pdf' || kind === 'youtube' ? ['qwksearch'] : DEFAULT_TIER_ORDER;

  return candidates.filter((id) => settings.tiers.includes(id)).map((id) => build[id]());
};

/**
 * Full fallback chain. Returns the first usable article, otherwise the last
 * tier's error.
 */
export const extractArticle = async (
  url: string,
  tiers: ExtractionTier[] = tiersForUrl(url),
): Promise<ExtractedArticle> => {
  let last: ExtractedArticle = { error: 'No extraction tier configured' };
  for (const tier of tiers) {
    try {
      last = await tier(url);
    } catch (error) {
      last = { error: (error as Error)?.message || 'Extraction tier threw' };
    }
    if (isUsable(last)) return last;
  }
  return last;
};
