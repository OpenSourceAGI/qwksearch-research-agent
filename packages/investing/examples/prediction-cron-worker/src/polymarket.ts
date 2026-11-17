/**
 * Keyless Polymarket reads from the public Gamma API, plus a few helpers
 * for turning its string-encoded fields into numbers. Fetch-only, so it runs
 * in Node, StackBlitz and Cloudflare Workers alike.
 */

const GAMMA = "https://gamma-api.polymarket.com";

export interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  /** JSON string, e.g. '["Yes","No"]' */
  outcomes: string;
  /** JSON string, e.g. '["0.62","0.38"]' */
  outcomePrices: string;
  volume24hr?: number;
  liquidityNum?: number;
  oneDayPriceChange?: number;
  bestBid?: number;
  bestAsk?: number;
  endDate?: string;
  closed?: boolean;
  [key: string]: unknown;
}

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  volume24hr?: number;
  liquidity?: number;
  endDate?: string;
  markets: GammaMarket[];
  [key: string]: unknown;
}

/** Active events sorted by 24h volume, highest first. */
export async function getTopEvents(limit = 5, tagSlug?: string): Promise<GammaEvent[]> {
  const qs = new URLSearchParams({
    active: "true",
    closed: "false",
    order: "volume24hr",
    ascending: "false",
    limit: String(limit),
  });
  if (tagSlug) qs.set("tag_slug", tagSlug);
  const res = await fetch(`${GAMMA}/events?${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Gamma ${res.status}: ${await res.text()}`);
  return (await res.json()) as GammaEvent[];
}

export function parsePrices(m: GammaMarket): { outcome: string; price: number }[] {
  try {
    const outcomes = JSON.parse(m.outcomes) as string[];
    const prices = (JSON.parse(m.outcomePrices) as string[]).map(Number);
    return outcomes.map((outcome, i) => ({ outcome, price: prices[i] ?? NaN }));
  } catch {
    return [];
  }
}

/** Probability of the first outcome ("Yes" on binary markets), 0-1. */
export function yesPrice(m: GammaMarket): number {
  return parsePrices(m)[0]?.price ?? NaN;
}

/**
 * Markets that moved more than `minMove` (absolute probability, 0-1) in
 * the last 24h, biggest movers first.
 */
export function bigMovers(events: GammaEvent[], minMove = 0.08) {
  return events
    .flatMap((e) => e.markets.filter((m) => !m.closed).map((m) => ({ event: e, market: m })))
    .filter(({ market }) => Math.abs(market.oneDayPriceChange ?? 0) >= minMove)
    .sort((a, b) => Math.abs(b.market.oneDayPriceChange ?? 0) - Math.abs(a.market.oneDayPriceChange ?? 0));
}

/** Trim a Gamma event to the fields an LLM needs, to save tokens. */
export function compactMarkets(e: GammaEvent, max = 8) {
  return e.markets
    .filter((m) => !m.closed)
    .sort((a, b) => (b.volume24hr ?? 0) - (a.volume24hr ?? 0))
    .slice(0, max)
    .map((m) => ({
      ticker: m.slug,
      title: m.question,
      prices: parsePrices(m),
      volume24hr: Math.round(m.volume24hr ?? 0),
      oneDayPriceChange: m.oneDayPriceChange,
      endDate: m.endDate,
    }));
}

export function eventUrl(e: GammaEvent): string {
  return `https://polymarket.com/event/${e.slug}`;
}
