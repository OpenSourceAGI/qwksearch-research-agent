/**
 * Events fetcher.
 *
 * Extracts event data from prediction market URLs. Supports Kalshi (via DFlow)
 * and Polymarket (via the Gamma API). Jupiter prediction-market URLs are
 * treated as Kalshi since they use Kalshi event tickers.
 *
 * Refactored from the PredictOS `get-events` Supabase edge function into a
 * plain async function.
 */

import { getKalshiMarketsByEvent as getDFlowKalshiMarketsByEvent } from "./data/kalshi.js";
import type { DataConfig, GetEventsRequest, GetEventsResult, PmType, UrlSource } from "./types.js";

/**
 * Extracts the event slug from a Polymarket URL.
 */
function extractPolymarketEventSlug(url: string): string | null {
  const urlWithoutParams = url.split("?")[0];
  const parts = urlWithoutParams.split("/");
  return parts[parts.length - 1] || null;
}

/** Polymarket event and markets response from the Gamma API. */
interface PolymarketGammaEvent {
  id: number | string;
  slug: string;
  title: string;
  description?: string;
  markets: PolymarketGammaMarket[];
  [key: string]: unknown;
}

interface PolymarketGammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  clobTokenIds: string[];
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  [key: string]: unknown;
}

/**
 * Fetches a Polymarket event and its markets from the Gamma API.
 * Returns both the event ID and the markets array in a single call.
 */
async function getPolymarketEventAndMarkets(slug: string): Promise<{
  eventId: string | null;
  markets: PolymarketGammaMarket[];
}> {
  const endpoints = [
    `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
    `https://gamma-api.polymarket.com/events/${encodeURIComponent(slug)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        console.warn(`Gamma API endpoint ${endpoint} returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Handle both array response and single object response
      const event: PolymarketGammaEvent | undefined = Array.isArray(data) ? data[0] : data;

      if (event && event.markets && Array.isArray(event.markets)) {
        const eventId = event.id !== undefined && event.id !== null ? String(event.id) : null;
        return { eventId, markets: event.markets };
      }
    } catch (error) {
      console.warn(`Error fetching from Gamma API ${endpoint}:`, error);
    }
  }

  console.warn(`Could not fetch Polymarket event for slug ${slug} from Gamma API`);
  return { eventId: null, markets: [] };
}

/**
 * Detect the prediction market type and URL source from a URL.
 * Jupiter URLs (jup.ag/prediction/*) are treated as Kalshi.
 */
function detectPmTypeAndSource(url: string): { pmType: PmType | null; urlSource: UrlSource | null } {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("jup.ag/prediction")) {
    return { pmType: "Kalshi", urlSource: "jupiter" };
  }
  if (lowerUrl.includes("kalshi")) {
    return { pmType: "Kalshi", urlSource: "kalshi" };
  }
  if (lowerUrl.includes("polymarket")) {
    return { pmType: "Polymarket", urlSource: "polymarket" };
  }

  return { pmType: null, urlSource: null };
}

/**
 * Extract a Kalshi event ticker from a Jupiter URL.
 * Format: https://jup.ag/prediction/TICKER (e.g., https://jup.ag/prediction/KXPRESNOMD-28)
 */
function extractJupiterEventTicker(url: string): string | null {
  const urlWithoutParams = url.split("?")[0];
  const parts = urlWithoutParams.split("/");
  const ticker = parts[parts.length - 1];
  return ticker && ticker.length > 0 ? ticker.toUpperCase() : null;
}

/**
 * Fetch event markets from a prediction market URL.
 *
 * @throws Error on invalid input, unknown platforms, or when the event/markets
 * cannot be fetched.
 */
export async function getEvents(
  request: GetEventsRequest,
  config: DataConfig = {},
): Promise<GetEventsResult> {
  const startTime = Date.now();

  const { url } = request;

  if (!url) {
    throw new Error("Missing required parameter: 'url'");
  }

  const { pmType, urlSource } = detectPmTypeAndSource(url);

  // Enforce data provider based on market type: Kalshi -> dflow, Polymarket -> gamma
  if (!pmType || !urlSource) {
    throw new Error(
      "Could not detect prediction market type from URL. Use Kalshi, Polymarket, or Jupiter prediction market URLs.",
    );
  }

  let eventIdentifier: string;
  let eventId: string | undefined;
  let markets: unknown[];
  let dataProvider: GetEventsResult["dataProvider"];

  if (pmType === "Kalshi") {
    let eventTicker: string | null;

    if (urlSource === "jupiter") {
      eventTicker = extractJupiterEventTicker(url);
    } else {
      const urlParts = url.split("/");
      eventTicker = urlParts[urlParts.length - 1]?.toUpperCase() || null;
    }

    if (!eventTicker) {
      throw new Error("Could not extract event ticker from URL");
    }

    eventIdentifier = eventTicker;
    dataProvider = "dflow";

    try {
      markets = await getDFlowKalshiMarketsByEvent(eventTicker, config.dflowApiKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isNotFound =
        errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
      throw new Error(
        isNotFound
          ? `Event '${eventTicker}' not found on Kalshi (via DFlow).`
          : `Failed to fetch markets: ${errorMessage}`,
      );
    }
  } else {
    const eventSlug = extractPolymarketEventSlug(url);

    if (!eventSlug) {
      throw new Error("Could not extract event slug from URL");
    }

    eventIdentifier = eventSlug;
    dataProvider = "gamma";

    try {
      const { eventId: fetchedEventId, markets: fetchedMarkets } =
        await getPolymarketEventAndMarkets(eventSlug);
      markets = fetchedMarkets;
      eventId = fetchedEventId || undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isNotFound =
        errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
      throw new Error(
        isNotFound
          ? `Event '${eventSlug}' not found on Polymarket.`
          : `Failed to fetch markets from Polymarket: ${errorMessage}`,
      );
    }
  }

  if (markets.length === 0) {
    throw new Error(`No markets found for '${eventIdentifier}' on ${pmType}.`);
  }

  return {
    eventIdentifier,
    eventId,
    pmType,
    urlSource,
    markets,
    marketsCount: markets.length,
    dataProvider,
    processingTimeMs: Date.now() - startTime,
  };
}
