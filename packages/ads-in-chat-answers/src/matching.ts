/**
 * @fileoverview Keyword matching and the auction that turns a chat turn into
 * at most one ad per placement.
 *
 * Pure functions, no I/O: the same code ranks ads in the browser demo, in a
 * Worker route and in tests. Relevance gates eligibility *before* price is
 * considered, so a high bid can buy a better slot among relevant ads but can
 * never buy its way onto an unrelated question.
 */

import type {
  AdContext,
  AdPlacement,
  AdSelection,
  Campaign,
  KeywordHit,
} from './types';

/** Answer text is evidence of topic, but weaker than what the user asked. */
export const ANSWER_HIT_WEIGHT = 0.5;

/** Below this relevance a campaign is not shown, whatever it bids. */
export const DEFAULT_MIN_RELEVANCE = 0.3;

/** The floor a lone bidder pays per click, in cents. */
export const DEFAULT_RESERVE_PRICE_CENTS = 5;

/**
 * Words that carry no topic. Without this, a keyword like "books for
 * designers" half-matches every question that contains "for".
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'can', 'do', 'for',
  'from', 'good', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or',
  'should', 'some', 'that', 'the', 'this', 'to', 'top', 'was', 'what', 'when',
  'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

/** Lowercases and turns punctuation into spaces, so "Logo-design?" matches "logo design". */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Crude singularisation. A stemmer would be better and much bigger; plural
 * "s" is the miss that actually shows up ("logos" vs "logo").
 */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Content tokens of a text, stemmed, stopwords removed. */
export function contentTokens(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

/**
 * How strongly one keyword matches a text, 0–1.
 *
 * - The whole phrase appearing (on word boundaries) is a full match.
 * - Otherwise the share of the keyword's content tokens found in the text,
 *   but only for multi-word keywords and only past half — one shared word
 *   out of four is coincidence, not topic.
 */
export function keywordStrength(keyword: string, text: string): number {
  const phrase = normalizeText(keyword);
  if (!phrase) return 0;
  const haystack = ` ${normalizeText(text)} `;
  if (haystack.includes(` ${phrase} `)) return 1;

  const wanted = contentTokens(keyword);
  if (wanted.length === 0) return 0;
  const present = new Set(contentTokens(text));
  const found = wanted.filter((t) => present.has(t)).length;
  if (wanted.length === 1) return found;
  const share = found / wanted.length;
  return share >= 0.5 ? share * 0.8 : 0;
}

/** True when any negative keyword appears as a whole phrase in the text. */
export function hasNegativeMatch(negatives: readonly string[] | undefined, text: string): boolean {
  if (!negatives?.length) return false;
  return negatives.some((n) => keywordStrength(n, text) === 1);
}

/**
 * Relevance of a campaign to a chat turn, with the hits that explain it.
 *
 * Each keyword counts once, at its stronger source. Hits combine as
 * independent evidence (`1 - Π(1 - s)`), so three partial matches add up
 * without any number of them exceeding 1.
 */
export function scoreCampaign(
  campaign: Pick<Campaign, 'keywords' | 'negativeKeywords'>,
  context: AdContext
): { relevance: number; hits: KeywordHit[] } {
  const answer = context.answer ?? '';
  if (hasNegativeMatch(campaign.negativeKeywords, `${context.query} ${answer}`)) {
    return { relevance: 0, hits: [] };
  }

  const hits: KeywordHit[] = [];
  let miss = 1;
  for (const keyword of campaign.keywords) {
    const q = keywordStrength(keyword, context.query);
    const a = answer ? keywordStrength(keyword, answer) * ANSWER_HIT_WEIGHT : 0;
    if (q === 0 && a === 0) continue;
    const hit: KeywordHit =
      q >= a
        ? { keyword, source: 'query', strength: q }
        : { keyword, source: 'answer', strength: a / ANSWER_HIT_WEIGHT };
    hits.push(hit);
    miss *= 1 - Math.max(q, a);
  }
  hits.sort((x, y) => y.strength - x.strength);
  return { relevance: Math.round((1 - miss) * 1000) / 1000, hits };
}

/** Whether a campaign can serve this placement at all, before relevance. */
export function isEligible(campaign: Campaign, placement: AdPlacement): boolean {
  if (!campaign.active) return false;
  if (!campaign.placements.includes(placement)) return false;
  if ((campaign.spentTodayCents ?? 0) >= campaign.dailyBudgetCents) return false;
  if (campaign.maxCpcCents <= 0) return false;
  if (placement === 'answer') return campaign.products.length > 0;
  return Boolean(campaign.followUp?.topic && campaign.followUp.url);
}

export interface AuctionOptions {
  placement: AdPlacement;
  /** How many ads to return (default 1). */
  slots?: number;
  minRelevance?: number;
  reservePriceCents?: number;
  /** Campaign ids to leave out, e.g. the winner of another placement. */
  exclude?: readonly string[];
}

/**
 * Ranks eligible, relevant campaigns by `relevance × maxCpc` and prices each
 * winner at a generalised second price: the least it could have bid and kept
 * its position, plus one cent, never below the reserve or above its own bid.
 *
 * Second price is what lets an advertiser bid their true value without
 * overpaying, which is what keeps the bids — and so the ranking — honest.
 */
export function runAuction(
  campaigns: readonly Campaign[],
  context: AdContext,
  options: AuctionOptions
): AdSelection[] {
  const {
    placement,
    slots = 1,
    minRelevance = DEFAULT_MIN_RELEVANCE,
    reservePriceCents = DEFAULT_RESERVE_PRICE_CENTS,
    exclude = [],
  } = options;

  const ranked = campaigns
    .filter((c) => !exclude.includes(c.id) && isEligible(c, placement))
    .map((campaign) => {
      const { relevance, hits } = scoreCampaign(campaign, context);
      return { campaign, relevance, hits, adRank: relevance * campaign.maxCpcCents };
    })
    .filter((r) => r.relevance >= minRelevance)
    .sort((a, b) => b.adRank - a.adRank || a.campaign.id.localeCompare(b.campaign.id));

  return ranked.slice(0, Math.max(0, slots)).map((r, i) => {
    const next = ranked[i + 1];
    const secondPrice = next ? Math.floor(next.adRank / r.relevance) + 1 : reservePriceCents;
    const costPerClickCents = Math.min(
      r.campaign.maxCpcCents,
      Math.max(reservePriceCents, secondPrice)
    );
    return {
      campaign: r.campaign,
      placement,
      relevance: r.relevance,
      adRank: Math.round(r.adRank * 1000) / 1000,
      costPerClickCents,
      hits: r.hits,
    };
  });
}

export interface ChatAdSlots {
  answer: AdSelection | null;
  followUp: AdSelection | null;
}

/**
 * Both placements for one chat turn. The follow-up auction excludes the
 * answer winner, so one advertiser cannot take both slots on the same answer
 * — two ads from the same brand reads as the answer being bought.
 */
export function selectChatAds(
  campaigns: readonly Campaign[],
  context: AdContext,
  options: Omit<AuctionOptions, 'placement' | 'slots'> = {}
): ChatAdSlots {
  const [answer = null] = runAuction(campaigns, context, { ...options, placement: 'answer' });
  const [followUp = null] = runAuction(campaigns, context, {
    ...options,
    placement: 'follow-up',
    exclude: [...(options.exclude ?? []), ...(answer ? [answer.campaign.id] : [])],
  });
  return { answer, followUp };
}

/** Charges a click against the campaign's daily budget. Returns a new campaign. */
export function recordClick(campaign: Campaign, costCents: number): Campaign {
  return { ...campaign, spentTodayCents: (campaign.spentTodayCents ?? 0) + costCents };
}

/** "Learn more about <topic>" — the only wording a sponsored follow-up gets. */
export function followUpQuestion(topic: string): string {
  return `Learn more about ${topic.trim().replace(/[?.!]+$/, '')}`;
}

/** Formats cents as dollars for the panel ("$0.42"). */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
