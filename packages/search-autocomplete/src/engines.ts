/**
 * @fileoverview Query-completion adapters for public search-engine suggest APIs.
 *
 * Each adapter is one `fetch` and one parse — no DOM, no Node APIs — so the same
 * code runs on a Cloudflare Worker, in Node and under Bun. Adapters throw on a
 * network or HTTP failure instead of swallowing it: the benchmark needs to tell
 * "engine is down" apart from "engine had nothing to suggest", and
 * `getSuggestions` in `./autocomplete` is where the swallow-and-log lives.
 */

// Some suggest APIs (notably Google) return 403 Forbidden for requests
// without a browser-like User-Agent, especially from datacenter/Cloudflare
// egress IPs. Sent by default; per-engine headers can still override it.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_TIMEOUT_MS = 3000;

export interface EngineRequestOptions {
  /** Locale such as `en-US`; each engine maps it to its own region/language parameter. */
  locale?: string;
  /** Aborts the request (combined with the timeout). */
  signal?: AbortSignal;
  /** Per-request timeout. Default {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
  /** Swappable for tests and runtimes without a global `fetch`. Always called with a URL string. */
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
}

export type AutocompleteEngine = (
  query: string,
  options?: EngineRequestOptions,
) => Promise<string[]>;

async function request(
  url: string,
  options: EngineRequestOptions,
  headers: Record<string, string> = {},
): Promise<string> {
  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error(`Timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`)),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) onAbort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await doFetch(url, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, ...headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** Parses the OpenSearch suggestions shape `[query, [suggestion, …], …]`. */
function parseOpenSearch(text: string): string[] {
  const data = JSON.parse(text);
  return Array.isArray(data) && Array.isArray(data[1])
    ? data[1].filter((s: unknown): s is string => typeof s === "string")
    : [];
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Google's `gws-wiz` client returns suggestions as HTML fragments
 * (`tesla <b>stock</b>`, `&#39;`). The old adapter parsed each one with
 * linkedom, which dragged a DOM implementation onto the request path of the
 * Worker; tags and entities are all these fragments ever contain.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const point =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(point) ? String.fromCodePoint(point) : match;
      }
      return HTML_ENTITIES[code.toLowerCase()] ?? match;
    })
    .trim();
}

function lang(locale = "en-US"): string {
  return locale.split(/[-_]/)[0].toLowerCase();
}

export const baidu: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({ ie: "utf-8", json: "1", prod: "pc", wd: query });
  const data = JSON.parse(await request(`https://www.baidu.com/sugrec?${params}`, options));
  return Array.isArray(data?.g) ? data.g.map((item: { q: string }) => item.q) : [];
};

export const bing: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({ query, mkt: options.locale ?? "en-US" });
  return parseOpenSearch(await request(`https://api.bing.com/osjson.aspx?${params}`, options));
};

export const brave: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({ q: query });
  return parseOpenSearch(
    await request(`https://search.brave.com/api/suggest?${params}`, options, {
      Cookie: "country=all",
    }),
  );
};

export const duckduckgo: AutocompleteEngine = async (query, options = {}) => {
  // DuckDuckGo regions are `us-en` for `en-US`.
  const region = (options.locale ?? "en-US").toLowerCase().split(/[-_]/).reverse().join("-");
  const params = new URLSearchParams({ q: query, kl: region });
  return parseOpenSearch(await request(`https://duckduckgo.com/ac/?type=list&${params}`, options));
};

const GOOGLE_DOMAINS: Record<string, string> = {
  de: "google.de",
  fr: "google.fr",
  es: "google.es",
  it: "google.it",
  nl: "google.nl",
  pt: "google.pt",
  ru: "google.ru",
  ja: "google.co.jp",
  zh: "google.com.hk",
  ko: "google.co.kr",
};

export const google: AutocompleteEngine = async (query, options = {}) => {
  const hl = lang(options.locale);
  const params = new URLSearchParams({ q: query, client: "gws-wiz", hl });
  const text = await request(
    `https://${GOOGLE_DOMAINS[hl] ?? "google.com"}/complete/search?${params}`,
    options,
  );
  // The body is JSONP-ish: `window.google.ac.h([[["tesla <b>stock</b>",0,…]…]])`.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]") + 1;
  if (start < 0 || end <= start) return [];
  const data = JSON.parse(text.slice(start, end));
  if (!Array.isArray(data?.[0])) return [];
  return data[0]
    .map((item: unknown[]) => (typeof item?.[0] === "string" ? htmlToText(item[0]) : ""))
    .filter(Boolean);
};

export const qwant: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    locale: (options.locale ?? "en-US").replace("-", "_"),
    version: "2",
  });
  const data = JSON.parse(await request(`https://api.qwant.com/v3/suggest?${params}`, options));
  return data?.status === "success" && Array.isArray(data?.data?.items)
    ? data.data.items.map((item: { value: string }) => item.value)
    : [];
};

const STARTPAGE_LANGUAGES: Record<string, string> = {
  da: "dansk",
  de: "deutsch",
  en: "english",
  es: "espanol",
  fr: "francais",
  nb: "norsk",
  nl: "nederlands",
  pl: "polski",
  pt: "portugues",
  sv: "svenska",
};

export const startpage: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    format: "opensearch",
    segment: "startpage.defaultffx",
    lui: STARTPAGE_LANGUAGES[lang(options.locale)] ?? "english",
  });
  return parseOpenSearch(await request(`https://www.startpage.com/suggestions?${params}`, options));
};

const WIKIPEDIA_LANGUAGES = new Set(["en", "de", "fr", "es", "it", "nl", "pt", "ru", "ja", "zh", "ar", "ko"]);

export const wikipedia: AutocompleteEngine = async (query, options = {}) => {
  const code = lang(options.locale);
  const params = new URLSearchParams({
    action: "opensearch",
    format: "json",
    formatversion: "2",
    search: query,
    namespace: "0",
    limit: "10",
  });
  const host = `${WIKIPEDIA_LANGUAGES.has(code) ? code : "en"}.wikipedia.org`;
  return parseOpenSearch(await request(`https://${host}/w/api.php?${params}`, options));
};

export const yandex: AutocompleteEngine = async (query, options = {}) => {
  const params = new URLSearchParams({ part: query });
  return parseOpenSearch(await request(`https://suggest.yandex.com/suggest-ff.cgi?${params}`, options));
};

/** Every engine the benchmark measures and the handler can be pointed at. */
export const ENGINES = {
  baidu,
  bing,
  brave,
  duckduckgo,
  google,
  qwant,
  startpage,
  wikipedia,
  yandex,
} satisfies Record<string, AutocompleteEngine>;

export type EngineName = keyof typeof ENGINES;

export const ENGINE_NAMES = Object.keys(ENGINES) as EngineName[];

export function isEngineName(name: string): name is EngineName {
  return Object.prototype.hasOwnProperty.call(ENGINES, name);
}
