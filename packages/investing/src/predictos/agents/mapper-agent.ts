/**
 * Mapper agent.
 *
 * Translates analysis output from the bookmaker/analysis agents into
 * platform-specific order parameters that can be used to place orders.
 *
 * Currently supports: Polymarket. Kalshi support is not yet implemented.
 *
 * Refactored from the PredictOS `mapper-agent` Supabase edge function into a
 * plain synchronous function. This is pure logic - no AI or network calls.
 */

import type {
  AnalysisResult,
  MapperAgentRequest,
  MapperAgentResult,
  MarketData,
  PolymarketOrderParams,
} from "../types.js";

// Budget limits
const MIN_BUDGET = 1;
const MAX_BUDGET = 100;

// Polymarket constants
const DEFAULT_TICK_SIZE = "0.01";
const DEFAULT_NEG_RISK = false;
const MIN_SHARES = 5; // Polymarket minimum

/**
 * Error thrown when the analysis recommends NO TRADE and there is no order to
 * produce. Callers can catch this to distinguish it from a genuine failure.
 */
export class NoTradeError extends Error {
  constructor(message = "Agents recommend NO TRADE - no order to place") {
    super(message);
    this.name = "NoTradeError";
  }
}

/**
 * Parse token IDs from clobTokenIds string.
 * Format: '["tokenId1", "tokenId2"]'
 */
function parseTokenIds(clobTokenIds: string): [string, string] {
  try {
    const parsed = JSON.parse(clobTokenIds);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [parsed[0], parsed[1]];
    }
    throw new Error("Invalid token IDs format");
  } catch {
    throw new Error(`Failed to parse clobTokenIds: ${clobTokenIds}`);
  }
}

/**
 * Parse outcomes from outcomes string.
 * Format: '["Yes", "No"]' or '["Up", "Down"]'
 */
function parseOutcomes(outcomes: string): string[] {
  try {
    return JSON.parse(outcomes);
  } catch {
    return ["Yes", "No"];
  }
}

/**
 * Parse prices from outcomePrices string.
 * Format: '["0.65", "0.35"]'
 */
function parsePrices(outcomePrices: string): number[] {
  try {
    const parsed = JSON.parse(outcomePrices);
    return parsed.map((p: string) => parseFloat(p));
  } catch {
    return [0.5, 0.5];
  }
}

/**
 * Round price to valid tick size.
 */
function roundToTickSize(price: number, tickSize: string): number {
  const tick = parseFloat(tickSize);
  return Math.round(price / tick) * tick;
}

/**
 * Map analysis result to Polymarket order parameters.
 */
function mapToPolymarketOrder(
  analysisResult: AnalysisResult,
  marketData: MarketData,
  budgetUsd: number,
): PolymarketOrderParams {
  // Validate market is tradeable
  if (marketData.closed) {
    throw new Error("Market is closed");
  }
  if (marketData.acceptingOrders === false) {
    throw new Error("Market is not accepting orders");
  }

  // Parse token IDs and outcomes
  if (!marketData.clobTokenIds) {
    throw new Error("Missing clobTokenIds in market data");
  }
  const [tokenId0, tokenId1] = parseTokenIds(marketData.clobTokenIds);
  const outcomes = parseOutcomes(marketData.outcomes || '["Yes", "No"]');
  const prices = parsePrices(marketData.outcomePrices || '["0.5", "0.5"]');

  // Determine which side to buy based on recommended action
  const buyYes = analysisResult.recommendedAction === "BUY YES";
  const side: "YES" | "NO" = buyYes ? "YES" : "NO";

  // Find the correct token ID and price for our side
  // Outcomes are typically ["Yes", "No"] or ["Up", "Down"]
  const yesIndex = outcomes.findIndex(
    (o: string) => o.toLowerCase() === "yes" || o.toLowerCase() === "up",
  );
  const noIndex = outcomes.findIndex(
    (o: string) => o.toLowerCase() === "no" || o.toLowerCase() === "down",
  );

  let tokenId: string;
  let currentPrice: number;

  if (buyYes) {
    // Buying YES side
    tokenId = yesIndex === 0 ? tokenId0 : tokenId1;
    currentPrice = prices[yesIndex >= 0 ? yesIndex : 0];
  } else {
    // Buying NO side
    tokenId = noIndex === 0 ? tokenId0 : tokenId1;
    currentPrice = prices[noIndex >= 0 ? noIndex : 1];
  }

  // Get tick size and neg risk from market data or use defaults
  const tickSize = marketData.minimumTickSize || DEFAULT_TICK_SIZE;
  const negRisk = marketData.negRisk ?? DEFAULT_NEG_RISK;

  // Round price to valid tick size
  const orderPrice = roundToTickSize(currentPrice, tickSize);

  // Calculate size (number of shares): size = budget / price
  const rawSize = budgetUsd / orderPrice;
  const size = Math.floor(rawSize);

  // Validate minimum shares
  if (size < MIN_SHARES) {
    throw new Error(
      `Budget too small. At current price (${(orderPrice * 100).toFixed(1)}%), ` +
      `minimum budget is $${(MIN_SHARES * orderPrice).toFixed(2)} for ${MIN_SHARES} shares`,
    );
  }

  // Build order description
  const orderDescription =
    `BUY ${size} shares of ${side} @ ${(orderPrice * 100).toFixed(1)}% ` +
    `for ~$${(size * orderPrice).toFixed(2)} on "${marketData.title || marketData.question || "Unknown Market"}"`;

  return {
    tokenId,
    price: orderPrice,
    side: "BUY",
    size,
    feeRateBps: 0,
    tickSize,
    negRisk,
    conditionId: marketData.conditionId || "",
    marketSlug: marketData.slug || "",
    orderDescription,
  };
}

/**
 * Run the mapper agent, converting an analysis result into platform-specific
 * order parameters.
 *
 * @throws {NoTradeError} when the analysis recommends NO TRADE.
 * @throws Error on invalid input or for unsupported platforms (Kalshi).
 */
export function runMapperAgent(request: MapperAgentRequest): MapperAgentResult {
  const { platform, analysisResult, marketData, budgetUsd } = request;

  // Validate platform
  if (!platform || (platform !== "Polymarket" && platform !== "Kalshi")) {
    throw new Error("Invalid platform. Must be 'Polymarket' or 'Kalshi'");
  }

  // Validate analysis result
  if (!analysisResult || !analysisResult.recommendedAction) {
    throw new Error("Missing analysisResult or recommendedAction");
  }

  // Check for NO TRADE recommendation
  if (analysisResult.recommendedAction === "NO TRADE") {
    throw new NoTradeError();
  }

  // Validate market data
  if (!marketData) {
    throw new Error("Missing marketData");
  }

  // Validate budget
  if (typeof budgetUsd !== "number" || budgetUsd < MIN_BUDGET || budgetUsd > MAX_BUDGET) {
    throw new Error(`Invalid budgetUsd. Must be between $${MIN_BUDGET} and $${MAX_BUDGET}`);
  }

  // Handle Kalshi (not yet supported)
  if (platform === "Kalshi") {
    throw new Error(
      "Kalshi autonomous mode coming soon! Currently only Polymarket is supported.",
    );
  }

  // Map to Polymarket order parameters
  const orderParams = mapToPolymarketOrder(analysisResult, marketData, budgetUsd);

  return {
    platform: "Polymarket",
    orderParams,
    analysis: {
      recommendedAction: analysisResult.recommendedAction,
      side: analysisResult.recommendedAction === "BUY YES" ? "YES" : "NO",
      confidence: analysisResult.winnerConfidence,
    },
  };
}
