/**
 * @fileoverview The content check that rides along with the citation call:
 * the first few thousand words of the extracted content and an outline of the
 * page's blocks go to the model, which says whether this is the full article or
 * a paywall stub, and which header, nav, sidebar and footer blocks to cut. The
 * reply is checked like the citation: quoted phrases must be in the text and
 * selectors must match an element on the page, or they are dropped.
 */
import { parseHTML } from "linkedom";
import { appearsIn, clamp01 } from "./parse-reply";
import {
  CONTENT_VERDICTS,
  PAGE_REGIONS,
  type ContentCheck,
  type ContentVerdict,
  type PageRegion,
  type ReadabilityTip,
} from "./types";

type Json = Record<string, any>;

const REMOVE = "script,style,noscript,svg,template,iframe,canvas";
const LANDMARK = /^(header|nav|aside|footer|main|article|section|form)$/;
/** An id or class usable in a selector without escaping. */
const IDENT = /^[A-Za-z_-][\w-]*$/;

export interface ContentInput {
  /** The first `words` words of the content, for the prompt. */
  text: string;
  /** How many words that is. */
  words: number;
  /** One line per block of the page: selector, word count, opening words. */
  outline: string;
  /** The parsed page, to check the model's selectors against. */
  document: any;
}

const countWords = (text: string) => (text.match(/\S+/g) || []).length;

/** The first `max` words of `text`. */
export function firstWords(text: string, max: number): string {
  const words = text.match(/\S+/g) || [];
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")} […]`;
}

/** A node's text with a space between elements, so "Home</a><a>News" does not run together. */
function textOf(node: any): string {
  if (node.nodeType === 3) return node.data || "";
  if (node.nodeType !== 1 || node.matches?.(REMOVE)) return "";
  return Array.from(node.childNodes || []).map(textOf).join(" ");
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** HTML or text → plain text. */
export function contentToText(content: string): string {
  if (!/<[a-z!/][^>]*>/i.test(content)) return squash(content);
  const { document } = parseHTML(`<html><body>${content}</body></html>`);
  return document.body ? squash(textOf(document.body)) : "";
}

/** `tag#id.class.class`, from parts that need no escaping. */
export function selectorFor(el: any): string {
  const tag = String(el.tagName || "").toLowerCase();
  const id = el.getAttribute?.("id");
  if (id && IDENT.test(id)) return `${tag}#${id}`;
  const classes = String(el.getAttribute?.("class") || "")
    .split(/\s+/)
    .filter((c) => IDENT.test(c))
    .slice(0, 2);
  const role = el.getAttribute?.("role");
  const roleAttr = role && IDENT.test(role) ? `[role="${role}"]` : "";
  return `${tag}${classes.map((c) => `.${c}`).join("")}${roleAttr}`;
}

/**
 * The page's blocks as an indented list the model can pick selectors from:
 * landmarks (`header`, `nav`, `aside`, `footer`, `main`, `article`, …) and
 * elements with an id, class or role, with their word count and first words.
 */
export function pageOutline(document: any, maxLines = 60): string {
  const lines: string[] = [];
  const walk = (parent: any, depth: number, level: number) => {
    for (const el of Array.from(parent.children || []) as any[]) {
      if (lines.length >= maxLines) return;
      const tag = String(el.tagName || "").toLowerCase();
      if (el.matches?.(REMOVE)) continue;
      const text = squash(textOf(el));
      const words = countWords(text);
      if (words < 3) continue;
      // A bare `div` says nothing and would match every div on the page.
      const selector = selectorFor(el);
      const named = LANDMARK.test(tag) || selector !== tag;
      if (named) {
        const opening = text.split(" ").slice(0, 8).join(" ");
        lines.push(`${"  ".repeat(level)}${selector} (${words} words) "${opening}"`);
      }
      if (depth < 8 && level < 4) walk(el, depth + 1, named ? level + 1 : level);
    }
  };
  if (document.body) walk(document.body, 0, 0);
  return lines.join("\n");
}

/** What the model is shown for the content check. */
export function prepareContent(
  html: string,
  options: { content?: string; text?: string; words?: number } = {}
): ContentInput {
  const { document } = parseHTML(html);
  const source = options.content ?? options.text;
  const full = source !== undefined ? contentToText(source) : document.body ? squash(textOf(document.body)) : "";
  const text = firstWords(full, options.words ?? 3000);
  return { text, words: Math.min(countWords(full), options.words ?? 3000), outline: pageOutline(document), document };
}

/** Bare tags that are safe to cut whole: every one of them is page chrome. */
const CHROME_TAG = /^(header|nav|aside|footer)$/i;

/** Is `selector` valid and does it match something on the page? */
function matches(document: any, selector: string): boolean {
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
}

/** A trimmed, tag-free string, capped. */
function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!clean || /^(null|none|n\/a)$/i.test(clean)) return undefined;
  return clean.slice(0, max);
}

/**
 * Normalizes and checks the model's `contentCheck`: an unknown verdict becomes
 * `"unknown"`, signals and examples not in the text are dropped, and selectors
 * that are invalid or match nothing on the page are dropped.
 * @param haystack the content and page text the model was shown
 */
export function parseContentCheck(reply: unknown, input: ContentInput, haystack: string): ContentCheck {
  const r = (reply && typeof reply === "object" ? reply : {}) as Json;
  const verdict: ContentVerdict = CONTENT_VERDICTS.includes(r.verdict) ? r.verdict : "unknown";
  const selector = (value: unknown, bareOk: RegExp) => {
    const s = str(value, 200);
    if (!s || !matches(input.document, s)) return undefined;
    // A bare tag like `div` or `section` would cut (or keep) far too much.
    return /^[a-z][a-z0-9]*$/i.test(s) && !bareOk.test(s) ? undefined : s;
  };

  const signals = (Array.isArray(r.signals) ? r.signals : [])
    .map((s: unknown) => str(s, 160))
    .filter((s: string | undefined): s is string => Boolean(s) && appearsIn(s, haystack))
    .slice(0, 5);

  const tips: ReadabilityTip[] = [];
  for (const raw of Array.isArray(r.tips) ? r.tips.slice(0, 12) : []) {
    if (!raw || typeof raw !== "object") continue;
    const tip = str(raw.tip, 300);
    if (!tip) continue;
    const example = str(raw.example, 160);
    tips.push({
      region: PAGE_REGIONS.includes(raw.region) ? (raw.region as PageRegion) : "other",
      selector: selector(raw.selector, CHROME_TAG),
      example: example && appearsIn(example, haystack) ? example : undefined,
      tip,
    });
    if (tips.length === 8) break;
  }

  const contentSelector = selector(r.contentSelector, /^(main|article)$/i);
  const remove = [...new Set(tips.map((t) => t.selector).filter(Boolean) as string[])];

  return {
    verdict,
    isFullContent: verdict === "full",
    confidence: verdict === "unknown" ? 0 : clamp01(r.confidence),
    signals,
    note: str(r.note, 400) || (verdict === "unknown" ? "The model did not check the content." : ""),
    contentSelector,
    tips,
    selectors: { content: contentSelector ? [contentSelector] : [], remove },
    wordsChecked: input.words,
  };
}
