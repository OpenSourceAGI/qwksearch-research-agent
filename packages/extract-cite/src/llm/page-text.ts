/**
 * @fileoverview Turns a page into what the model is shown: its plain text
 * (head and tail, since bylines open an article and bios close it), the
 * citation-bearing `<meta>` tags, and any JSON-LD.
 */
import { parseHTML } from "linkedom";

const REMOVE = "script,style,noscript,svg,template,iframe,canvas";
const META_KEEP =
  /^(author|byl|description|date|pubdate|publish|citation_|dc[.:]|dcterms|og:(title|site_name|type|article|description)|article:|twitter:(site|creator|title)|parsely-|sailthru\.|prism\.|DC\.)/i;

export interface PageInput {
  /** Visible text, whitespace-collapsed and trimmed to the budget. */
  text: string;
  /** `name: content` lines for the meta tags that carry citation data. */
  meta: string;
  /** JSON-LD blocks, trimmed. */
  jsonLd: string;
  /** The page's `<title>`. */
  pageTitle: string;
}

/** Fetches a page's HTML, throwing a readable error when it cannot. */
export async function fetchPageHTML(
  url: string,
  doFetch: typeof fetch = fetch,
  timeoutMs = 15000
): Promise<string> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new Error("`url` is not a valid URL.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:")
    throw new Error("Only http(s) URLs are supported.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await doFetch(target.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; extract-cite/1.0; +https://github.com/OpenSourceAGI/qwksearch-research-agent)",
      },
    });
    if (!res.ok) throw new Error(`Fetching the page failed with HTTP ${res.status}.`);
    const type = res.headers.get("content-type") || "";
    if (type && !/html|xml|text\//i.test(type))
      throw new Error(`The URL is not a webpage (${type.split(";")[0]}).`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Collapses whitespace. */
const squash = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Head and tail of `text` within `max` characters: 3/4 from the start, 1/4 from
 * the end, with a marker between. Short text is returned whole.
 */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  const tail = Math.floor(max / 4);
  return `${text.slice(0, max - tail)}\n[…]\n${text.slice(text.length - tail)}`;
}

export function preparePage(
  html: string,
  options: { text?: string; maxChars?: number } = {}
): PageInput {
  const { document } = parseHTML(html);

  const meta: string[] = [];
  for (const el of Array.from(document.querySelectorAll("meta"))) {
    const key = el.getAttribute("name") || el.getAttribute("property") || el.getAttribute("itemprop");
    const content = el.getAttribute("content");
    if (key && content && META_KEEP.test(key)) meta.push(`${key}: ${squash(content).slice(0, 300)}`);
  }

  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((el) => squash(el.textContent || ""))
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  const pageTitle = squash(document.querySelector("title")?.textContent || "");

  let text = options.text;
  if (text === undefined) {
    for (const el of Array.from(document.querySelectorAll(REMOVE))) el.remove();
    text = squash(document.body?.textContent || document.documentElement?.textContent || "");
  }

  return {
    text: clipText(squash(text), options.maxChars ?? 12000),
    meta: meta.slice(0, 60).join("\n"),
    jsonLd,
    pageTitle,
  };
}
