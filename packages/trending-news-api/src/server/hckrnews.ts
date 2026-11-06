/**
 * @fileoverview Headlines scraped from hckrnews.com (a Hacker News front page
 * mirror), each with a prefetched preview image.
 *
 * hckrnews.com has no API, so the page is read as HTML. Each story is two
 * links in a row: one to its Hacker News discussion (whose text holds the
 * comment and point counts) followed by one to the article itself. The parser
 * walks the page's anchors in order and pairs them up, which keeps it working
 * if the surrounding list markup changes.
 *
 * Hacker News stories carry no image, so for each headline the linked
 * article's `og:image` (or `twitter:image`) is looked up server-side. The
 * widget then has a thumbnail URL in hand on first render instead of fetching
 * every article page from the visitor's browser.
 *
 * The answer uses the same wire shape as the daily trending list, with one
 * "topic" per story (named after the story's domain) holding that story as
 * its only article, so the existing widget renders it unchanged.
 */
import type { TrendingNewsWireArticle, TrendingNewsWireResponse } from './index';

export const HCKRNEWS_URL = 'https://hckrnews.com/';
export const HCKRNEWS_SOURCE = 'hckrnews';

export const DEFAULT_HCKRNEWS_LIMIT = 30;
export const MAX_HCKRNEWS_LIMIT = 60;

/** Article pages fetched at once while looking up images. */
const IMAGE_CONCURRENCY = 8;
/** How long one article page may take before its image is given up on. */
const IMAGE_TIMEOUT_MS = 4_000;
/** How long hckrnews.com itself may take. */
const PAGE_TIMEOUT_MS = 8_000;
/**
 * Bytes of an article page read while looking for its image. The meta tags
 * are in `<head>`, so there is no reason to download a whole page for them.
 */
const IMAGE_MAX_BYTES = 256 * 1024;

const USER_AGENT =
  'Mozilla/5.0 (compatible; trending-news-api; +https://github.com/OpenSourceAGI/qwksearch-research-agent)';

/** One story as it appears on hckrnews.com. */
export interface HckrNewsStory {
  title: string;
  url: string;
  /** The story's Hacker News discussion page. */
  discussionUrl: string;
  /** Hacker News item id. */
  id: string;
  /** The article's domain, e.g. `github.com`. */
  domain?: string;
  points?: number;
  comments?: number;
}

export interface HckrNewsOptions {
  /** Stories to return (default 30, capped at 60). */
  limit?: number;
  /** Look up each story's preview image (default true). */
  images?: boolean;
  /** Injected for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function readAttr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  if (!match) return undefined;
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? '');
}

const HN_ITEM = /^https?:\/\/news\.ycombinator\.com\/item\?id=(\d+)/i;

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** The first number inside an element whose class names `kind`. */
function countByClass(html: string, kind: 'points' | 'comments'): number | undefined {
  const match = new RegExp(`class\\s*=\\s*["'][^"']*\\b${kind}\\b[^"']*["'][^>]*>\\s*(\\d+)`, 'i').exec(html);
  return match ? Number(match[1]) : undefined;
}

/**
 * Parses hckrnews.com's front page into stories, in page order.
 *
 * The discussion link's text is the counts. When its spans are classed
 * (`points`, `comments`) those classes are used; otherwise the two numbers are
 * read in display order, comments first then points — a new story shows as
 * "0 9", and a story cannot have 0 points.
 */
export function parseHckrNewsHtml(html: string): HckrNewsStory[] {
  const anchors: Array<{ href: string; inner: string }> = [];
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = readAttr(m[1], 'href');
    if (href) anchors.push({ href: href.trim(), inner: m[2] });
  }

  const stories: HckrNewsStory[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < anchors.length - 1; i++) {
    const hn = HN_ITEM.exec(anchors[i].href);
    if (!hn) continue;
    const link = anchors[i + 1];
    // Two discussion links in a row (e.g. a comment-count link and a title
    // that is itself a discussion) — only pair one to a real headline.
    const linkHn = HN_ITEM.exec(link.href);
    if (linkHn && linkHn[1] !== hn[1]) continue;

    const id = hn[1];
    if (seen.has(id)) continue;

    // Drop the "(domain.com)" suffix the page appends to each title.
    const inner = link.inner.replace(/<(span|small)\b[^>]*class\s*=\s*["'][^"']*source[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '');
    const title = stripTags(inner).replace(/\s*\((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^)]*)?\)\s*$/i, '');
    if (!title) continue;

    let url: string;
    try {
      url = new URL(link.href, HCKRNEWS_URL).toString();
    } catch {
      continue;
    }
    if (!/^https?:/i.test(url)) continue;

    const counts = anchors[i].inner;
    let points = countByClass(counts, 'points');
    let comments = countByClass(counts, 'comments');
    if (points === undefined && comments === undefined) {
      const numbers = stripTags(counts).match(/\d+/g)?.map(Number) ?? [];
      if (numbers.length >= 2) [comments, points] = numbers;
      else if (numbers.length === 1) points = numbers[0];
    }

    seen.add(id);
    stories.push({
      id,
      title,
      url,
      discussionUrl: `https://news.ycombinator.com/item?id=${id}`,
      domain: domainOf(url),
      points,
      comments,
    });
    i++; // the headline link is consumed
  }
  return stories;
}

/** Fetches and parses hckrnews.com's front page. */
export async function fetchHckrNewsStories(
  options: { fetchImpl?: typeof fetch } = {}
): Promise<HckrNewsStory[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(HCKRNEWS_URL, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Failed to fetch hckrnews.com: ${res.status}`);
  return parseHckrNewsHtml(await res.text());
}

/** Reads up to `max` bytes of a body, stopping early once `</head>` is seen. */
async function readHead(res: Response, max: number): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, max);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    while (bytes < max) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(text)) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return text;
}

const IMAGE_META_KEYS = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];

/** The preview image declared in a page's `<head>`, resolved against `baseUrl`. */
export function extractPreviewImage(html: string, baseUrl: string): string | undefined {
  const found = new Map<string, string>();
  const metaRe = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html))) {
    const key = (readAttr(m[0], 'property') ?? readAttr(m[0], 'name') ?? '').toLowerCase();
    const content = readAttr(m[0], 'content');
    if (key && content && !found.has(key)) found.set(key, content.trim());
  }
  let raw = IMAGE_META_KEYS.map((k) => found.get(k)).find(Boolean);
  if (!raw) {
    const link = /<link\b[^>]*rel\s*=\s*["']?image_src["']?[^>]*>/i.exec(html);
    if (link) raw = readAttr(link[0], 'href');
  }
  if (!raw) return undefined;
  try {
    const url = new URL(raw, baseUrl);
    return /^https?:$/.test(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The preview image for one article: its `og:image`/`twitter:image`, or the
 * URL itself when the link points straight at an image. Never throws — a page
 * that is slow, blocked or imageless just has no thumbnail.
 */
export async function fetchPreviewImage(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | undefined> {
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!res.ok) {
      res.body?.cancel().catch(() => {});
      return undefined;
    }
    const type = res.headers.get('content-type') ?? '';
    if (type.startsWith('image/')) {
      res.body?.cancel().catch(() => {});
      return url;
    }
    if (type && !/html|xml/i.test(type)) {
      res.body?.cancel().catch(() => {});
      return undefined;
    }
    return extractPreviewImage(await readHead(res, IMAGE_MAX_BYTES), res.url || url);
  } catch {
    return undefined;
  }
}

/** Runs `fn` over `items` with at most `limit` in flight, keeping order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function parseHckrNewsLimit(raw: string | number | null | undefined): number {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return DEFAULT_HCKRNEWS_LIMIT;
  return Math.min(MAX_HCKRNEWS_LIMIT, Math.floor(value));
}

/**
 * hckrnews.com's front page in the widget's wire shape, with each story's
 * preview image prefetched.
 */
export async function getHckrNewsHeadlines(
  options: HckrNewsOptions = {}
): Promise<TrendingNewsWireResponse> {
  const { fetchImpl = fetch, images = true } = options;
  const limit = parseHckrNewsLimit(options.limit);
  const stories = (await fetchHckrNewsStories({ fetchImpl })).slice(0, limit);

  const imageUrls = images
    ? await mapLimit(stories, IMAGE_CONCURRENCY, (s) =>
        // A self post links back to Hacker News, which has no preview image.
        HN_ITEM.test(s.url) ? Promise.resolve(undefined) : fetchPreviewImage(s.url, fetchImpl)
      )
    : [];

  const now = new Date();
  return {
    source: HCKRNEWS_SOURCE,
    date: now.toISOString().slice(0, 10),
    topics: stories.map((story, i) => {
      const article: TrendingNewsWireArticle = {
        title: story.title,
        url: story.url,
        source: story.domain ?? 'news.ycombinator.com',
        image_url: imageUrls[i],
        points: story.points,
        comments: story.comments,
        discussion_url: story.discussionUrl,
      };
      return {
        topic: story.domain ?? 'Hacker News',
        news_count: 1,
        articles: [article],
      };
    }),
  };
}
