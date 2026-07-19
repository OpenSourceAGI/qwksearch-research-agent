import { getDomainWithoutSuffix } from "tldts";
import { duplicates, removals, titles } from "./data/duplicates.js";
import { domainExceptions } from "./data/domain-exceptions.js";

export function shouldRemoveDomain(domain: string): boolean {
  return removals.some((r) => r.main === domain);
}

export function findMainDomain(domain: string): string | null {
  for (const duplicate of duplicates) {
    if (duplicate.alt && duplicate.alt.includes(domain)) {
      return duplicate.main;
    }
  }
  return null;
}

export function getTitleOverride(domain: string): string | null {
  return titles[domain] || domainExceptions[domain] || null;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was",
  "were", "will", "with",
]);

const DOMAIN_ENDINGS_RE = /\.(com|net|org|io|gov|edu|co\.uk)$/i;
const COMMON_WORDS_RE =
  /(post|the|insider|news|times|daily|weekly|herald|tribune|journal|gazette|press|star|sun|mail|today|now|live|tv|radio|web|net|tech|blog|online|digital|media|corp|inc|ltd|llc)/gi;

export function formatDomainAsTitle(domain: string): string {
  let source = getDomainWithoutSuffix(domain) ?? domain;

  if (DOMAIN_ENDINGS_RE.test(source)) {
    source = source.replace(DOMAIN_ENDINGS_RE, "");
  }

  source = source
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
    .replace(new RegExp(`(${COMMON_WORDS_RE.source})([a-z])`, "gi"), "$1 $2")
    .replace(new RegExp(`([a-z])(${COMMON_WORDS_RE.source})`, "gi"), "$1 $2")
    .replace(/\s+/g, " ")
    .replace(".com", "")
    .replace(/home/gi, "")
    .trim();

  source = source
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      return word.length <= 3 && !STOP_WORDS.has(lower)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  if (source.replace(/\s/g, "").length < 5) {
    source = source.toUpperCase();
  }

  return source;
}

export function cleanSourceTitle(title: string): string | null {
  if (!title) return null;

  let cleaned = title.trim();
  const TITLE_SPLITTERS_RE = /( [|\-\/:»] )|( - )|(\|)/;

  if (TITLE_SPLITTERS_RE.test(cleaned)) {
    const parts = cleaned.split(TITLE_SPLITTERS_RE);
    const longest = parts.reduce(
      (acc, part) => ((part?.length ?? 0) > (acc?.length ?? 0) ? part : acc),
      ""
    );
    if (longest.length > 10) cleaned = longest;
  }

  const SUFFIXES = [
    " - Home", " | Home", " - Official Site", " | Official Site",
    " - Official Website", " | Official Website", " - Official", " | Official",
    " - Welcome", " | Welcome", " - Homepage", " | Homepage",
  ];

  for (const suffix of SUFFIXES) {
    if (cleaned.endsWith(suffix)) cleaned = cleaned.slice(0, -suffix.length);
  }

  if (cleaned.length > 150) cleaned = cleaned.substring(0, 150);

  cleaned = cleaned
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

export async function getSourceTitle(domain: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const html = await response.text();

    const ogTitle = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );
    if (ogTitle) return ogTitle[1].trim();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title) return title[1].trim();

    return null;
  } catch (error) {
    console.log(
      `Could not get source title for ${domain}: ${(error as Error).message}`
    );
    return null;
  }
}
