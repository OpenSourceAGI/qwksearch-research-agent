/**
 * @fileoverview Keyword plans for advertisers: an LLM reads the advertiser's
 * brief and proposes the questions-people-ask phrasing to bid on, with a
 * deterministic fallback so the panel still works with no model configured.
 *
 * The model's output is untrusted text. It is parsed defensively, every
 * keyword is normalised and capped, and anything unparseable falls back to
 * the heuristic plan rather than reaching the auction.
 */

import { contentTokens, normalizeText } from './matching';
import type { CompleteFn, KeywordPlan, KeywordSuggestion } from './types';

/** The most keywords one plan may carry. Each is matched on every chat turn. */
export const MAX_KEYWORDS = 25;
export const MAX_NEGATIVE_KEYWORDS = 15;
/** Longer than this is a sentence, not a keyword. */
export const MAX_KEYWORD_LENGTH = 60;

/** What the advertiser tells the generator about themselves. */
export interface AdvertiserBrief {
  advertiser: string;
  description: string;
  website?: string;
  /** Product titles, which often name the category better than the description. */
  products?: string[];
  /** Keywords already chosen, so the model suggests new ones. */
  existingKeywords?: string[];
}

export const KEYWORD_SYSTEM_PROMPT = `You plan keyword targeting for ads shown inside an AI chat assistant.
Ads appear under an answer only when the user's question matches a keyword, so
keywords should be the phrases people actually type when asking an assistant
about this advertiser's category — not slogans, and not the brand name alone.

Reply with JSON only, no prose, in exactly this shape:
{"keywords":[{"keyword":"...","reason":"..."}],"negativeKeywords":["..."],"followUpTopic":"..."}

- 10 to 20 keywords, each 1 to 4 words, lowercase.
- reason: under 12 words, why someone asking this would want the product.
- negativeKeywords: phrases where showing the ad would be unwanted or
  insensitive (e.g. "free download", "lawsuit").
- followUpTopic: a short topic for a "Learn more about …" follow-up question,
  phrased as a subject, not a sales pitch.`;

/** Builds the user turn of the keyword prompt from an advertiser brief. */
export function buildKeywordPrompt(brief: AdvertiserBrief): { system: string; user: string } {
  const lines = [
    `Advertiser: ${brief.advertiser}`,
    brief.website ? `Website: ${brief.website}` : '',
    `What they sell: ${brief.description}`,
    brief.products?.length ? `Products: ${brief.products.slice(0, 10).join('; ')}` : '',
    brief.existingKeywords?.length
      ? `Already targeting (suggest different ones): ${brief.existingKeywords.join(', ')}`
      : '',
  ];
  return { system: KEYWORD_SYSTEM_PROMPT, user: lines.filter(Boolean).join('\n') };
}

/** Normalises one keyword; returns '' for anything unusable. */
export function cleanKeyword(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const keyword = normalizeText(raw);
  if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) return '';
  if (keyword.split(' ').length > 6) return '';
  return keyword;
}

function dedupe(keywords: string[], limit: number, skip: Set<string> = new Set()): string[] {
  const out: string[] = [];
  for (const k of keywords) {
    if (!k || skip.has(k) || out.includes(k)) continue;
    out.push(k);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Parses a model reply into a keyword plan, or returns null when the reply is
 * not the JSON the prompt asked for. Tolerates a ```json fence and leading
 * chatter, because models add both despite being told not to.
 */
export function parseKeywordPlan(text: string, existing: string[] = []): KeywordPlan | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.keywords)) return null;

  const skip = new Set(existing.map(cleanKeyword));
  const reasons = new Map<string, string>();
  const raw: string[] = [];
  for (const item of obj.keywords) {
    const keyword = cleanKeyword(typeof item === 'string' ? item : (item as { keyword?: unknown })?.keyword);
    if (!keyword) continue;
    raw.push(keyword);
    const reason = (item as { reason?: unknown })?.reason;
    if (typeof reason === 'string' && !reasons.has(keyword)) reasons.set(keyword, reason.trim().slice(0, 120));
  }

  const keywords: KeywordSuggestion[] = dedupe(raw, MAX_KEYWORDS, skip).map((keyword) => ({
    keyword,
    ...(reasons.get(keyword) ? { reason: reasons.get(keyword) } : {}),
  }));
  if (keywords.length === 0) return null;

  const negativeKeywords = dedupe(
    Array.isArray(obj.negativeKeywords) ? obj.negativeKeywords.map(cleanKeyword) : [],
    MAX_NEGATIVE_KEYWORDS
  );
  const topic = typeof obj.followUpTopic === 'string' ? obj.followUpTopic.trim().slice(0, 80) : '';

  return { keywords, negativeKeywords, ...(topic ? { followUpTopic: topic } : {}), source: 'llm' };
}

/**
 * Offline keyword plan: the most frequent one-, two- and three-word phrases
 * in the brief, longest first. Good enough to demo the auction and to keep
 * the panel useful when the model is down; an LLM plan is far better at the
 * question-shaped phrasing people actually type.
 */
export function heuristicKeywordPlan(brief: AdvertiserBrief): KeywordPlan {
  const sources = [brief.description, ...(brief.products ?? [])];
  const counts = new Map<string, number>();
  const brand = new Set(contentTokens(brief.advertiser));

  for (const source of sources) {
    // Phrases never span a sentence or list boundary.
    for (const chunk of source.split(/[.,;:!?()\n]+/)) {
      const tokens = normalizeText(chunk)
        .split(' ')
        .filter((t) => t.length > 2 && !brand.has(t));
      const content = new Set(contentTokens(chunk));
      for (let n = 3; n >= 1; n--) {
        for (let i = 0; i + n <= tokens.length; i++) {
          const gram = tokens.slice(i, i + n);
          // A phrase must start and end on a content word: "guide to" is not a topic.
          if (!content.has(stemLike(gram[0])) || !content.has(stemLike(gram[n - 1]))) continue;
          // "shoes and hiking" straddles two items of a list, not one topic.
          if (gram.some((t) => t === 'and' || t === 'or')) continue;
          const phrase = gram.join(' ');
          counts.set(phrase, (counts.get(phrase) ?? 0) + n);
        }
      }
    }
  }

  const skip = new Set((brief.existingKeywords ?? []).map(cleanKeyword));
  const ranked = [...counts.entries()]
    // A lone word mentioned once ("beginners") matches far too many questions
    // to be worth bidding on; keep single words only when the brief repeats them.
    .filter(([phrase, count]) => phrase.includes(' ') || count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length || a[0].localeCompare(b[0]))
    .map(([phrase]) => cleanKeyword(phrase));
  const keywords = dedupe(ranked, 12, skip).map((keyword) => ({
    keyword,
    reason: 'Appears in your description',
  }));

  return {
    keywords,
    negativeKeywords: ['free download', 'pirated', 'torrent'],
    ...(keywords[0] ? { followUpTopic: keywords[0].keyword } : {}),
    source: 'heuristic',
  };
}

/** `contentTokens` stems; re-stem a raw token the same way to test membership. */
function stemLike(token: string): string {
  return contentTokens(token)[0] ?? '';
}

/**
 * The keyword plan for a brief: the model's when `complete` is given and its
 * reply parses, otherwise the heuristic plan. Never throws on a model
 * failure — the advertiser still gets suggestions, marked `heuristic`.
 */
export async function generateKeywordPlan(
  brief: AdvertiserBrief,
  complete?: CompleteFn
): Promise<KeywordPlan> {
  if (!complete) return heuristicKeywordPlan(brief);
  try {
    const reply = await complete(buildKeywordPrompt(brief));
    return parseKeywordPlan(reply, brief.existingKeywords) ?? heuristicKeywordPlan(brief);
  } catch {
    return heuristicKeywordPlan(brief);
  }
}
