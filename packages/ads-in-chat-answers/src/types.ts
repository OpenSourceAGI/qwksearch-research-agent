/**
 * @fileoverview Data shapes shared by the auction, the ad components and the
 * advertiser panel. Everything is plain JSON so a campaign can be stored in
 * D1, KV, localStorage or a request body without a mapping layer.
 */

/** Where an ad can appear in a chat transcript. */
export type AdPlacement =
  /** The product carousel rendered under an assistant answer. */
  | 'answer'
  /** One entry in the "related questions" list after an answer. */
  | 'follow-up';

export const AD_PLACEMENTS: readonly AdPlacement[] = ['answer', 'follow-up'];

/** One product in an answer carousel. */
export interface AdProduct {
  id: string;
  title: string;
  /** Display price, already formatted by the advertiser ("$6.49"). */
  price?: string;
  /** Click-through destination. */
  url: string;
  /** Product image. When absent the component draws a typographic cover. */
  imageUrl?: string;
}

/** The sponsored follow-up question an advertiser buys. */
export interface SponsoredFollowUp {
  /**
   * The topic the question points at — rendered as "Learn more about <topic>".
   * Kept separate from the full sentence so the wording stays ours, not the
   * advertiser's: a follow-up that reads like an answer is the deceptive kind.
   */
  topic: string;
  /** Where clicking the question goes. */
  url: string;
}

export interface Campaign {
  id: string;
  /** Advertiser display name, shown in the ad header. */
  advertiser: string;
  /** Square logo. When absent the component draws the advertiser's initial. */
  logoUrl?: string;
  /** What the advertiser sells — the input the keyword generator reads. */
  description: string;
  website?: string;
  /** Phrases that make the campaign eligible. Matched case-insensitively. */
  keywords: string[];
  /** Phrases that make the campaign ineligible even when a keyword matches. */
  negativeKeywords?: string[];
  placements: AdPlacement[];
  products: AdProduct[];
  followUp?: SponsoredFollowUp;
  /** Most the advertiser will pay per click, in cents. */
  maxCpcCents: number;
  /** Daily spend cap in cents. */
  dailyBudgetCents: number;
  /** Spend so far today in cents; the auction skips a campaign at its cap. */
  spentTodayCents?: number;
  active: boolean;
}

/** What the auction is given to decide on. */
export interface AdContext {
  /** The user's question. Weighted above the answer. */
  query: string;
  /** The assistant's answer, when it is already known. */
  answer?: string;
}

/** Why a campaign matched: which keywords hit and where. */
export interface KeywordHit {
  keyword: string;
  /** `query` hits count fully; `answer` hits count at a discount. */
  source: 'query' | 'answer';
  /** 1 for the whole phrase, less for a partial token overlap. */
  strength: number;
}

/** One auction winner, ready to render. */
export interface AdSelection {
  campaign: Campaign;
  placement: AdPlacement;
  /** 0–1 relevance from keyword matching. */
  relevance: number;
  /** `relevance * maxCpc`, the ranking key. */
  adRank: number;
  /** Second-price cost of a click, in cents — never above `maxCpcCents`. */
  costPerClickCents: number;
  hits: KeywordHit[];
}

/** An advertiser-facing keyword suggestion. */
export interface KeywordSuggestion {
  keyword: string;
  /** Why the generator thinks this keyword fits, shown in the panel. */
  reason?: string;
}

/** What the keyword generator returns for one advertiser brief. */
export interface KeywordPlan {
  keywords: KeywordSuggestion[];
  negativeKeywords: string[];
  /** A suggested follow-up topic ("logo design fundamentals"). */
  followUpTopic?: string;
  /** `llm` when a model wrote the plan, `heuristic` for the offline fallback. */
  source: 'llm' | 'heuristic';
}

/**
 * Any text-in, text-out model call. Kept this narrow so the package depends
 * on no SDK: a host wraps OpenAI, Anthropic, Workers AI or `write-language`
 * in one line.
 */
export type CompleteFn = (prompt: { system: string; user: string }) => Promise<string>;
