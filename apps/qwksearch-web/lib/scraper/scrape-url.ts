/**
 * @fileoverview scrape-url helper for qwksearch-web.
 *
 * Renders a webpage through the Cloudflare Puppeteer scraper worker
 * (default `https://proxy.qwksearch.com`) and extracts the main article
 * content + citation metadata from the fully-rendered HTML.
 *
 * This is the JavaScript-aware extraction path: unlike a plain `fetch`, the
 * scraper runs a real headless Chromium (puppeteer-cloudflare) so that
 * client-rendered pages and lightly bot-protected sites still yield usable
 * HTML before we run readability extraction over it.
 *
 * The scraper path is bounded to {@link SCRAPER_DEADLINE_MS} (8s). Heavily
 * bot-protected sites (e.g. AP News, which serves a Datadome/Cloudflare
 * challenge) can otherwise stall for 60–100s inside the worker's challenge
 * retry loop, so when the scraper does not return usable content in time we
 * fall back to the Tavily extract API.
 */

import { renderUrlWithMetadata } from "./cloudflare-scraper-client";
import { extractContent } from "chat-agent-toolkit/extractor/url-to-content/url-to-content";

/** Hard deadline for the Cloudflare scraper path before falling back. */
export const SCRAPER_DEADLINE_MS = 8000;

export interface ScrapedArticle {
  html?: string;
  cite?: string;
  title?: string;
  url?: string;
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  date?: string;
  source?: string;
  word_count?: number;
  /** Which path produced this article: "scraper" | "tavily". */
  via?: string;
  error?: string;
}

/** Phrases that indicate the scraper hit an interstitial challenge page. */
const CHALLENGE_MARKERS = [
  "Just a moment...",
  "Verifying you are human",
  "Please verify you are a human",
  "Enable JavaScript and cookies to continue",
  "Checking your browser before accessing",
  "Please complete the security check to access",
  "Attention Required! | Cloudflare",
  "Page unavailable | AP News",
];

/**
 * Returns true when the rendered HTML looks like a bot-detection / challenge
 * interstitial rather than the real page content.
 */
function looksLikeChallenge(html: string): boolean {
  if (!html || typeof html !== "string") return true;
  return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function countWords(html?: string): number {
  return html
    ? html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length
    : 0;
}

/** Build an APA-ish citation string mirroring the extractor's URL branch. */
function buildCite(article: ScrapedArticle, url: string): string {
  const source = article.source || "";
  const year = new Date(article.date || "").getFullYear();
  const apaDate =
    year > 1971
      ? ` (${year}, ${new Date(article.date as string).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        )})`
      : "";
  return `${article.author_cite || source || " "}${apaDate}. <b>${
    article.title || ""
  }</b>. <i>${source}</i>. <a href="${url}" target="_blank">${url}</a>`;
}

/**
 * Fetch fully-rendered HTML for a URL through the Cloudflare Puppeteer scraper.
 *
 * @param url - The webpage URL to render.
 * @param options - Optional scraper overrides + an AbortSignal deadline.
 * @returns The rendered HTML string.
 * @throws If the scraper request fails, aborts, or returns no HTML.
 *
 * @example
 * const html = await scrapeUrl("https://en.wikipedia.org/wiki/Marginalia");
 */
export async function scrapeUrl(
  url: string,
  options: {
    blockImages?: boolean;
    waitUntil?: "domcontentloaded" | "load" | "networkidle0" | "networkidle2";
    wait?: number;
    timeout?: number;
    maxRetries?: number;
    signal?: AbortSignal;
  } = {},
): Promise<string> {
  console.log("[scrapeUrl] rendering via Cloudflare Puppeteer scraper", { url });

  const result = await renderUrlWithMetadata(url, {
    blockImages: options.blockImages ?? true,
    waitUntil: options.waitUntil ?? "domcontentloaded",
    wait: options.wait ?? 0,
    timeout: options.timeout ?? 15000,
    // Cap the worker's challenge retry loop so a single bot-check can't stall
    // the request; the 8s client deadline is the real bound.
    maxRetries: options.maxRetries ?? 1,
    signal: options.signal,
  });

  const html = result?.html;
  if (!html || typeof html !== "string") {
    throw new Error("Scraper returned no HTML");
  }
  return html;
}

/**
 * Scrape a URL through the Cloudflare Puppeteer scraper and extract the main
 * article content, bounded to {@link SCRAPER_DEADLINE_MS}.
 *
 * Never throws — returns `{ error }` (with the raw HTML omitted) when the
 * scraper is unavailable, exceeds the deadline, or returns a challenge page,
 * so callers can cleanly decide whether to fall back to Tavily.
 *
 * @param url - The webpage URL to extract.
 * @param timeoutMs - Deadline before giving up on the scraper (default 8s).
 */
export async function extractArticleViaScraper(
  url: string,
  timeoutMs: number = SCRAPER_DEADLINE_MS,
): Promise<ScrapedArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const rendered = await renderUrlWithMetadata(url, {
      blockImages: true,
      waitUntil: "domcontentloaded",
      timeout: Math.max(timeoutMs - 1000, 4000),
      maxRetries: 1,
      signal: controller.signal,
    });

    const html = rendered?.html;
    if (!html || looksLikeChallenge(html)) {
      console.warn("[extractArticleViaScraper] no usable HTML from scraper", {
        url,
        hasHtml: !!html,
        challenge: html ? looksLikeChallenge(html) : false,
        ms: Date.now() - startedAt,
      });
      return { error: "Scraper returned a challenge page or no content" };
    }

    // Readability + citation extraction over the rendered HTML.
    const extracted = (await extractContent(html, { url })) as ScrapedArticle;
    if (!extracted || extracted.error || !extracted.html) {
      return { error: extracted?.error || "Extraction produced no content" };
    }

    const source = extracted.source || hostnameOf(rendered.url || url);
    const enriched: ScrapedArticle = {
      ...extracted,
      url: rendered.url || url,
      source,
      word_count: extracted.word_count ?? countWords(extracted.html),
      via: "scraper",
    };
    enriched.cite = extracted.cite || buildCite(enriched, url);
    console.log("[extractArticleViaScraper] scraper extraction succeeded", {
      url,
      title: enriched.title,
      words: enriched.word_count,
      ms: Date.now() - startedAt,
    });
    return enriched;
  } catch (err) {
    const e = err as Error;
    const aborted = e?.name === "AbortError" || controller.signal.aborted;
    console.warn("[extractArticleViaScraper] scraper path failed", {
      url,
      aborted,
      message: e?.message,
      ms: Date.now() - startedAt,
    });
    return {
      error: aborted
        ? `Scraper exceeded ${timeoutMs}ms deadline`
        : e?.message || "Scraper request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve the Tavily API key from env or configured site default. */
function resolveTavilyKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (typeof process !== "undefined" && process?.env?.TAVILY_API_KEY) {
    return process.env.TAVILY_API_KEY;
  }
  return undefined;
}

/** Minimal markdown → HTML conversion for Tavily's `raw_content`. */
function rawContentToHtml(raw: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${esc(heading[2])}</h${level}>`;
      }
      // inline markdown links [text](url)
      const withLinks = esc(block).replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>',
      );
      return `<p>${withLinks.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

/**
 * Fallback extraction via the Tavily extract API. Used when the Cloudflare
 * scraper cannot return usable content within the deadline (e.g. AP News).
 *
 * @param url - The webpage URL to extract.
 * @param apiKey - Optional explicit Tavily key; falls back to `TAVILY_API_KEY`.
 * @returns Extracted article, or `{ error }` if Tavily is unavailable/failed.
 */
export async function extractViaTavily(
  url: string,
  apiKey?: string,
): Promise<ScrapedArticle> {
  const key = resolveTavilyKey(apiKey);
  if (!key) {
    return { error: "No Tavily API key configured" };
  }

  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ urls: [url], extract_depth: "advanced" }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    const e = err as Error;
    console.error("[extractViaTavily] request failed", { url, message: e?.message });
    return { error: e?.message || "Tavily request failed" };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[extractViaTavily] non-OK response", { url, status: res.status });
    return { error: `Tavily extract failed (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = (await res.json().catch(() => null)) as {
    results?: Array<{ url?: string; raw_content?: string; title?: string }>;
  } | null;
  const result = data?.results?.[0];
  if (!result?.raw_content) {
    return { error: "Tavily returned no content" };
  }

  const html = rawContentToHtml(result.raw_content);
  const source = hostnameOf(result.url || url);
  const article: ScrapedArticle = {
    url: result.url || url,
    title: result.title || undefined,
    html,
    source,
    word_count: countWords(html),
    via: "tavily",
  };
  article.cite = buildCite(article, url);
  console.log("[extractViaTavily] Tavily extraction succeeded", {
    url,
    words: article.word_count,
    ms: Date.now() - startedAt,
  });
  return article;
}
