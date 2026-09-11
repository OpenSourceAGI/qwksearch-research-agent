/**
 * Arbitrage finder.
 *
 * Finds arbitrage opportunities across Polymarket and Kalshi markets.
 *
 * Flow:
 * 1. Parse the input URL to determine the source platform (Polymarket or Kalshi)
 * 2. Fetch event data: title + markets (title + yes price only)
 * 3. Use an AI agent to generate a 1-2 word search query from the event title
 * 4. Search the OTHER platform using the generated query
 * 5. If no results, return early
 * 6. Pass source markets + search results to the arbitrage analysis agent
 * 7. Return the analysis
 *
 * Refactored from the PredictOS `arbitrage-finder` Supabase edge function into
 * a plain async function.
 */

import { arbitrageAnalysisPrompt } from "./ai/prompts/arbitrageAnalysis.js";
import { searchQueryGeneratorPrompt } from "./ai/prompts/searchQueryGenerator.js";
import { callGrokResponses } from "./ai/callGrok.js";
import { callOpenAIResponses } from "./ai/callOpenAI.js";
import type {
  GrokMessage,
  GrokOutputText,
  OpenAIMessage,
  OpenAIOutputText,
} from "./ai/types.js";
import { dflowRequest } from "./data/kalshi.js";
import type {
  AIConfig,
  ArbitrageAnalysis,
  ArbitrageMarketData,
  ArbitrageMarketSource,
  ArbitrageRequest,
  ArbitrageResult,
  DataConfig,
} from "./types.js";

// API endpoints
const GAMMA_API_URL = "https://gamma-api.polymarket.com";

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
}

/** Simplified market data for arbitrage comparison. */
interface SimplifiedMarket {
  title: string;
  yesPrice: number;
  /** Event identifier for URL building (slug for polymarket, event ticker for kalshi) */
  identifier?: string;
}

/** Source event data. */
interface SourceEventData {
  eventTitle: string;
  markets: SimplifiedMarket[];
  source: ArbitrageMarketSource;
  /** Slug (polymarket) or ticker (kalshi) for building URLs */
  identifier: string;
}

// =============================================================================
// URL Building
// =============================================================================

/**
 * Build a market URL for a platform.
 * Polymarket: https://polymarket.com/event/{slug}
 * Kalshi: https://kalshi.com/events/{ticker}
 */
function buildMarketUrl(source: ArbitrageMarketSource, identifier: string): string {
  if (source === "polymarket") {
    return `https://polymarket.com/event/${identifier}`;
  } else {
    return `https://kalshi.com/events/${identifier}`;
  }
}

// =============================================================================
// URL Parsing
// =============================================================================

/** Detect which platform a URL is from. */
function detectPlatform(url: string): ArbitrageMarketSource | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("polymarket.com")) return "polymarket";
  if (lowerUrl.includes("kalshi.com")) return "kalshi";
  return null;
}

/**
 * Extract event slug from a Polymarket URL.
 */
function extractPolymarketSlug(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter((p) => p);

    // Format: /event/[event-slug] or /event/[event-slug]/[market-slug]
    if (pathParts[0] === "event" && pathParts.length >= 2) {
      return pathParts[1]; // Return the event slug
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract a Kalshi event ticker from a URL.
 * Format: /markets/[base-ticker]/[slug]/[full-ticker]
 * Returns the full ticker (last segment) uppercased.
 */
function extractKalshiTicker(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter((p) => p);

    // Format: /markets/[base-ticker]/[slug]/[full-ticker] or /events/[event-ticker]
    if ((pathParts[0] === "markets" || pathParts[0] === "events") && pathParts.length >= 2) {
      const ticker = pathParts.length >= 4 ? pathParts[pathParts.length - 1] : pathParts[1];
      return ticker.toUpperCase();
    }

    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Fetch Polymarket event data by slug.
 * Returns event title + markets (title + yes price only).
 */
async function fetchPolymarketEvent(slug: string): Promise<SourceEventData | null> {
  try {
    const eventUrl = `${GAMMA_API_URL}/events/slug/${slug}`;
    const response = await fetch(eventUrl);

    if (!response.ok) {
      console.error("Polymarket event fetch error:", response.status);
      return null;
    }

    const event = (await response.json()) as any;

    const markets: SimplifiedMarket[] = [];
    if (event.markets && Array.isArray(event.markets)) {
      for (const market of event.markets) {
        const title = market.question || market.title || "";
        let yesPrice = 50; // Default

        if (market.outcomePrices) {
          try {
            const prices = JSON.parse(market.outcomePrices);
            yesPrice = parseFloat(prices[0]) * 100; // Convert decimal to percentage
          } catch {
            // Keep default
          }
        }

        if (title) {
          markets.push({ title, yesPrice });
        }
      }
    }

    return {
      eventTitle: event.title || slug.replace(/-/g, " "),
      markets,
      source: "polymarket",
      identifier: event.slug || slug,
    };
  } catch (error) {
    console.error("Error fetching Polymarket event:", error);
    return null;
  }
}

/**
 * Fetch Kalshi event data by ticker via DFlow.
 * Returns event title + markets (title + yes price only).
 */
async function fetchKalshiEvent(
  ticker: string,
  dflowApiKey?: string,
): Promise<SourceEventData | null> {
  try {
    const response = await dflowRequest<{
      ticker: string;
      title?: string;
      markets: Array<{
        ticker: string;
        yesSubTitle: string;
        yesBid: string | null;
        yesAsk: string | null;
      }>;
    }>(`/event/${ticker}`, {
      params: { withNestedMarkets: true },
      apiKey: dflowApiKey,
    });

    const markets: SimplifiedMarket[] = [];
    if (response.markets && Array.isArray(response.markets)) {
      for (const market of response.markets) {
        const title = market.yesSubTitle || "";

        let yesPrice = 50; // Default
        if (market.yesBid && market.yesAsk) {
          const bid = parseFloat(market.yesBid);
          const ask = parseFloat(market.yesAsk);
          yesPrice = ((bid + ask) / 2) * 100; // Convert to percentage
        } else if (market.yesBid) {
          yesPrice = parseFloat(market.yesBid) * 100;
        } else if (market.yesAsk) {
          yesPrice = parseFloat(market.yesAsk) * 100;
        }

        if (title) {
          markets.push({ title, yesPrice });
        }
      }
    }

    return {
      eventTitle: response.title || ticker,
      markets,
      source: "kalshi",
      identifier: ticker,
    };
  } catch (error) {
    console.error("Error fetching Kalshi event:", error);
    return null;
  }
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Search Polymarket for events matching a query.
 * Returns simplified market data (title + yes price).
 */
async function searchPolymarket(query: string): Promise<SimplifiedMarket[]> {
  try {
    const url = `${GAMMA_API_URL}/public-search?q=${encodeURIComponent(query)}&events_status=open`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Polymarket search error:", response.status);
      return [];
    }

    const data = (await response.json()) as any;
    const markets: SimplifiedMarket[] = [];

    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        const eventSlug = event.slug;

        if (event.markets && Array.isArray(event.markets)) {
          for (const market of event.markets) {
            const title = market.question || market.title || "";
            let yesPrice = 50;

            if (market.outcomePrices) {
              try {
                const prices = JSON.parse(market.outcomePrices);
                yesPrice = parseFloat(prices[0]) * 100;
              } catch {
                // Keep default
              }
            }

            if (title) {
              markets.push({
                title,
                yesPrice,
                identifier: eventSlug, // Event slug for Polymarket URL
              });
            }
          }
        }
      }
    }

    return markets;
  } catch (error) {
    console.error("Error searching Polymarket:", error);
    return [];
  }
}

/**
 * Search Kalshi for events matching a query via DFlow.
 * Returns simplified market data (title + yes price).
 */
async function searchKalshi(query: string, dflowApiKey?: string): Promise<SimplifiedMarket[]> {
  try {
    const response = await dflowRequest<{
      cursor?: number;
      events: Array<{
        ticker: string;
        title: string;
        markets?: Array<{
          ticker: string;
          title: string;
          yesSubTitle?: string;
          yesAsk?: string;
          yesBid?: string;
        }>;
      }>;
    }>("/search", {
      params: {
        q: query,
        event_status: "open",
        withNestedMarkets: true,
      },
      apiKey: dflowApiKey,
    });

    const markets: SimplifiedMarket[] = [];

    if (response.events && Array.isArray(response.events)) {
      for (const event of response.events) {
        const eventTicker = event.ticker;

        if (event.markets && Array.isArray(event.markets)) {
          for (const market of event.markets) {
            const title = market.yesSubTitle || market.title || "";

            let yesPrice = 50;
            if (market.yesAsk && market.yesBid) {
              const ask = parseFloat(market.yesAsk);
              const bid = parseFloat(market.yesBid);
              yesPrice = ((ask + bid) / 2) * 100;
            } else if (market.yesAsk) {
              yesPrice = parseFloat(market.yesAsk) * 100;
            } else if (market.yesBid) {
              yesPrice = parseFloat(market.yesBid) * 100;
            }

            if (title) {
              markets.push({
                title,
                yesPrice,
                identifier: eventTicker, // Event ticker for Kalshi URL
              });
            }
          }
        }
      }
    }

    return markets;
  } catch (error) {
    console.error("Error searching Kalshi:", error);
    return [];
  }
}

// =============================================================================
// AI Functions
// =============================================================================

/**
 * Generate a 1-2 word search query using AI.
 */
async function generateSearchQuery(
  title: string,
  sourcePlatform: ArbitrageMarketSource,
  targetPlatform: ArbitrageMarketSource,
  model: string,
  config: AIConfig,
): Promise<string> {
  const { systemPrompt, userPrompt } = searchQueryGeneratorPrompt({
    title,
    sourcePlatform,
    targetPlatform,
  });

  const useOpenAI = isOpenAIModel(model);
  let text: string;

  if (useOpenAI) {
    const response = await callOpenAIResponses(userPrompt, systemPrompt, "text", model, 1, {
      apiKey: config.openaiApiKey,
    });

    const content: OpenAIOutputText[] = [];
    for (const item of response.output) {
      if (item.type === "message") {
        const messageItem = item as OpenAIMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("")
      .trim();
  } else {
    const response = await callGrokResponses(userPrompt, systemPrompt, "text", model, 1, undefined, {
      apiKey: config.xaiApiKey,
    });

    const content: GrokOutputText[] = [];
    for (const item of response.output) {
      if (item.type === "message") {
        const messageItem = item as GrokMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("")
      .trim();
  }

  // Clean up - remove quotes, limit to first 2 words
  const cleaned = text.replace(/['"]/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 2);
  return words.join(" ");
}

/**
 * Call the arbitrage analysis AI agent.
 */
async function analyzeArbitrage(
  sourceEvent: SourceEventData,
  searchResults: SimplifiedMarket[],
  searchPlatform: ArbitrageMarketSource,
  model: string,
  config: AIConfig,
): Promise<{ analysis: ArbitrageAnalysis; modelUsed: string; tokensUsed?: number }> {
  // Convert source event to ArbitrageMarketData format for the prompt
  const sourceMarket: ArbitrageMarketData = {
    source: sourceEvent.source,
    name: sourceEvent.eventTitle,
    identifier: sourceEvent.identifier,
    yesPrice: sourceEvent.markets[0]?.yesPrice || 50,
    noPrice: 100 - (sourceEvent.markets[0]?.yesPrice || 50),
    url: buildMarketUrl(sourceEvent.source, sourceEvent.identifier),
  };

  // Include all source markets in raw data
  sourceMarket.rawData = {
    eventTitle: sourceEvent.eventTitle,
    markets: sourceEvent.markets,
  };

  const { systemPrompt, userPrompt } = arbitrageAnalysisPrompt({
    sourceMarket,
    searchResults,
    searchPlatform,
  });

  const useOpenAI = isOpenAIModel(model);
  let text: string;
  let modelUsed: string;
  let tokensUsed: number | undefined;

  if (useOpenAI) {
    const response = await callOpenAIResponses(userPrompt, systemPrompt, "json_object", model, 3, {
      apiKey: config.openaiApiKey,
    });

    modelUsed = response.model;
    tokensUsed = response.usage?.total_tokens;

    const content: OpenAIOutputText[] = [];
    for (const item of response.output) {
      if (item.type === "message") {
        const messageItem = item as OpenAIMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("\n");
  } else {
    const response = await callGrokResponses(
      userPrompt,
      systemPrompt,
      "json_object",
      model,
      3,
      undefined,
      { apiKey: config.xaiApiKey },
    );

    modelUsed = response.model;
    tokensUsed = response.usage?.total_tokens;

    const content: GrokOutputText[] = [];
    for (const item of response.output) {
      if (item.type === "message") {
        const messageItem = item as GrokMessage;
        content.push(...messageItem.content);
      }
    }

    text = content
      .map((item) => item.text)
      .filter((t) => t !== undefined)
      .join("\n");
  }

  const parsed = JSON.parse(text);

  const analysis: ArbitrageAnalysis = {
    isSameMarket: parsed.isSameMarket,
    sameMarketConfidence: parsed.sameMarketConfidence,
    marketComparisonReasoning: parsed.marketComparisonReasoning,
    polymarketData: sourceEvent.source === "polymarket" ? sourceMarket : parsed.matchedMarket || undefined,
    kalshiData: sourceEvent.source === "kalshi" ? sourceMarket : parsed.matchedMarket || undefined,
    arbitrage: parsed.arbitrage,
    summary: parsed.summary,
    risks: parsed.risks,
    recommendation: parsed.recommendation,
  };

  return { analysis, modelUsed, tokensUsed };
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Find a cross-platform arbitrage opportunity for a prediction market URL.
 *
 * @throws Error on invalid input or when the source event cannot be fetched.
 */
export async function findArbitrage(
  request: ArbitrageRequest,
  config: AIConfig & DataConfig = {},
): Promise<ArbitrageResult> {
  const startTime = Date.now();

  const { url, model } = request;

  if (!url) {
    throw new Error("Missing required parameter: 'url'");
  }
  if (!model) {
    throw new Error("Missing required parameter: 'model'");
  }

  // Step 1: Detect platform and fetch source event data
  const sourcePlatform = detectPlatform(url);
  if (!sourcePlatform) {
    throw new Error("Invalid URL. Must be a Polymarket or Kalshi market URL.");
  }

  let sourceEvent: SourceEventData | null = null;
  const searchPlatform: ArbitrageMarketSource =
    sourcePlatform === "polymarket" ? "kalshi" : "polymarket";

  if (sourcePlatform === "polymarket") {
    const slug = extractPolymarketSlug(url);
    if (!slug) {
      throw new Error("Could not extract event slug from Polymarket URL");
    }
    sourceEvent = await fetchPolymarketEvent(slug);
  } else {
    const ticker = extractKalshiTicker(url);
    if (!ticker) {
      throw new Error("Could not extract ticker from Kalshi URL");
    }
    sourceEvent = await fetchKalshiEvent(ticker, config.dflowApiKey);
  }

  if (!sourceEvent || sourceEvent.markets.length === 0) {
    throw new Error(
      `Could not fetch event data from ${sourcePlatform}. The event may not exist or have no markets.`,
    );
  }

  // Step 2: Generate search query using AI agent
  const searchQuery = await generateSearchQuery(
    sourceEvent.eventTitle,
    sourcePlatform,
    searchPlatform,
    model,
    config,
  );

  // Step 3: Search the other platform
  let searchResults: SimplifiedMarket[];
  if (searchPlatform === "polymarket") {
    searchResults = await searchPolymarket(searchQuery);
  } else {
    searchResults = await searchKalshi(searchQuery, config.dflowApiKey);
  }

  // Step 4: Return early if no search results
  if (searchResults.length === 0) {
    const sourceData: ArbitrageMarketData = {
      source: sourcePlatform,
      name: sourceEvent.eventTitle,
      identifier: sourceEvent.identifier,
      yesPrice: sourceEvent.markets[0]?.yesPrice || 50,
      noPrice: 100 - (sourceEvent.markets[0]?.yesPrice || 50),
      url: buildMarketUrl(sourcePlatform, sourceEvent.identifier),
      rawData: { eventTitle: sourceEvent.eventTitle, markets: sourceEvent.markets },
    };

    return {
      analysis: {
        isSameMarket: false,
        sameMarketConfidence: 0,
        marketComparisonReasoning: `No matching markets found on ${searchPlatform} for query "${searchQuery}"`,
        polymarketData: sourcePlatform === "polymarket" ? sourceData : undefined,
        kalshiData: sourcePlatform === "kalshi" ? sourceData : undefined,
        arbitrage: { hasArbitrage: false },
        summary: `No matching markets found on ${searchPlatform}. Cannot determine arbitrage opportunity.`,
        risks: ["No matching market found on the other platform"],
        recommendation: "Try a different event or check if the market exists on both platforms.",
      },
      model: "none",
      sourceMarket: sourcePlatform,
      searchedMarket: searchPlatform,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Step 5: Analyze arbitrage using AI agent
  const { analysis, modelUsed, tokensUsed } = await analyzeArbitrage(
    sourceEvent,
    searchResults,
    searchPlatform,
    model,
    config,
  );

  return {
    analysis,
    model: modelUsed,
    tokensUsed,
    sourceMarket: sourcePlatform,
    searchedMarket: searchPlatform,
    processingTimeMs: Date.now() - startTime,
  };
}
