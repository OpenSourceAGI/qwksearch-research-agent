/**
 * Polymarket put-order agent.
 *
 * Places a buy order on Polymarket for the specified side (YES/NO). Used by
 * the autonomous mode to execute trades based on agent analysis.
 *
 * Supports two modes:
 * 1. Mapper mode (preferred): Pass orderParams from the mapper agent with
 *    pre-calculated values.
 * 2. Legacy mode: Pass individual fields and let the function figure out order
 *    params.
 *
 * Refactored from the PredictOS `polymarket-put-order` Supabase edge function
 * into a plain async function.
 */

import { PolymarketClient, createClientFromEnv } from "../clients/polymarket.js";

/** Order parameters from the mapper agent (preferred method). */
export interface MapperOrderParams {
  /** Token ID for the outcome to buy */
  tokenId: string;
  /** Order price (0-1 decimal) */
  price: number;
  /** Number of shares to buy */
  size: number;
  /** Tick size for the market */
  tickSize: string;
  /** Whether this is a negative risk market */
  negRisk: boolean;
  /** Market condition ID */
  conditionId: string;
  /** Market slug for reference */
  marketSlug: string;
}

/**
 * Request body for placing a Polymarket order.
 * Supports two modes:
 * 1. Mapper mode (preferred): Pass orderParams from the mapper agent.
 * 2. Legacy mode: Pass individual fields and let the function figure out order
 *    params.
 */
export interface PolymarketPutOrderRequest {
  /** Order parameters from the mapper agent (preferred) */
  orderParams?: MapperOrderParams;

  // Legacy mode fields (used if orderParams not provided)
  /** Market condition ID from Polymarket */
  conditionId?: string;
  /** Market slug for fetching market data */
  marketSlug?: string;
  /** Which side to buy: "YES" or "NO" */
  side?: "YES" | "NO";
  /** Budget in USD (between 1 and 100) */
  budgetUsd?: number;
  /** Optional: specific price to buy at (0-1). If not provided, uses current market price */
  price?: number;
}

/** Order result details. */
export interface OrderResult {
  success: boolean;
  orderId?: string;
  status?: string;
  errorMsg?: string;
  tokenId: string;
  side: "YES" | "NO";
  price: number;
  size: number;
  costUsd: number;
}

/** Response from the polymarket-put-order agent. */
export interface PolymarketPutOrderResponse {
  success: boolean;
  data?: {
    order: OrderResult;
    market: {
      slug: string;
      title: string;
      conditionId: string;
    };
  };
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

// Budget limits (for legacy mode)
const MIN_BUDGET = 1;
const MAX_BUDGET = 100;

/**
 * Place a buy order on Polymarket for the recommended side.
 */
export async function runPolymarketPutOrder(
  input: PolymarketPutOrderRequest,
): Promise<PolymarketPutOrderResponse> {
  const startTime = Date.now();

  const requestBody = input;

  // Initialize Polymarket client
  let client: PolymarketClient;
  try {
    client = createClientFromEnv();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to initialize Polymarket client: ${errorMsg}`,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  let tokenId: string;
  let orderPrice: number;
  let size: number;
  let side: "YES" | "NO";
  let conditionId: string;
  let marketSlug: string;
  let marketTitle: string = "";
  let tickSize: string = "0.01";
  let negRisk: boolean = false;

  try {
    // Check if using mapper mode (orderParams provided)
    if (requestBody.orderParams) {
      console.log("Using mapper mode with pre-calculated order params");
      const params = requestBody.orderParams;

      // Validate mapper params
      if (!params.tokenId) {
        return {
          success: false,
          error: "Missing orderParams.tokenId",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      tokenId = params.tokenId;
      orderPrice = params.price;
      size = params.size;
      tickSize = params.tickSize || "0.01";
      negRisk = params.negRisk ?? false;
      conditionId = params.conditionId;
      marketSlug = params.marketSlug;

      // Determine side from the fact that we're always buying
      // The mapper already selected the correct token for the recommended side
      side = "YES"; // This is just for logging - the tokenId determines what we're actually buying

      console.log("Mapper order params:", {
        tokenId: `${tokenId.slice(0, 16)}...`,
        price: orderPrice,
        size,
        tickSize,
        negRisk,
      });

    } else {
      // Legacy mode - figure out order params from individual fields
      console.log("Using legacy mode - calculating order params");

      const { conditionId: legacyConditionId, marketSlug: legacyMarketSlug, side: legacySide, budgetUsd, price: requestedPrice } = requestBody;

      // Validate legacy parameters
      if (!legacyConditionId) {
        return {
          success: false,
          error: "Missing required parameter: 'conditionId' or 'orderParams'",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (!legacyMarketSlug) {
        return {
          success: false,
          error: "Missing required parameter: 'marketSlug'",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (!legacySide || (legacySide !== "YES" && legacySide !== "NO")) {
        return {
          success: false,
          error: "Invalid 'side'. Must be 'YES' or 'NO'",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (typeof budgetUsd !== "number" || budgetUsd < MIN_BUDGET || budgetUsd > MAX_BUDGET) {
        return {
          success: false,
          error: `Invalid 'budgetUsd'. Must be between $${MIN_BUDGET} and $${MAX_BUDGET}`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      conditionId = legacyConditionId;
      marketSlug = legacyMarketSlug;
      side = legacySide;

      // Fetch market data
      console.log("Fetching market data for:", marketSlug);
      const market = await client.getMarketBySlug(marketSlug);

      if (!market) {
        return {
          success: false,
          error: `Market not found: ${marketSlug}`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (!market.acceptingOrders) {
        return {
          success: false,
          error: "Market is not accepting orders",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (market.closed) {
        return {
          success: false,
          error: "Market is closed",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      marketTitle = market.title;

      // Extract token IDs
      const tokenIds = client.extractTokenIds(market);

      // Determine which token to buy based on side
      const outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
      const prices = JSON.parse(market.outcomePrices || '["0.5", "0.5"]');

      const yesIndex = outcomes.findIndex((o: string) =>
        o.toLowerCase() === "yes" || o.toLowerCase() === "up"
      );
      const noIndex = outcomes.findIndex((o: string) =>
        o.toLowerCase() === "no" || o.toLowerCase() === "down"
      );

      let currentPrice: number;
      if (side === "YES") {
        tokenId = yesIndex === 0 ? tokenIds.up : tokenIds.down;
        currentPrice = parseFloat(prices[yesIndex >= 0 ? yesIndex : 0]);
      } else {
        tokenId = noIndex === 0 ? tokenIds.up : tokenIds.down;
        currentPrice = parseFloat(prices[noIndex >= 0 ? noIndex : 1]);
      }

      orderPrice = requestedPrice ?? currentPrice;
      size = budgetUsd! / orderPrice;

      // Validate minimum shares
      if (Math.floor(size) < 5) {
        return {
          success: false,
          error: `Budget too small. At current price (${(orderPrice * 100).toFixed(1)}%), minimum budget is $${(5 * orderPrice).toFixed(2)}`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }
    }

    console.log("Placing order:", {
      side,
      tokenId: `${tokenId.slice(0, 16)}...`,
      price: orderPrice,
      size: Math.floor(size),
    });

    // Place the order
    const orderResponse = await client.placeOrder({
      tokenId,
      price: orderPrice,
      size,
      side: "BUY",
    });

    const orderResult: OrderResult = {
      success: orderResponse.success,
      orderId: orderResponse.orderId,
      status: orderResponse.status,
      errorMsg: orderResponse.errorMsg,
      tokenId,
      side,
      price: orderPrice,
      size: Math.floor(size),
      costUsd: Math.round(size * orderPrice * 100) / 100,
    };

    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    if (!orderResponse.success) {
      return {
        success: false,
        error: orderResponse.errorMsg || "Order placement failed",
        data: {
          order: orderResult,
          market: {
            slug: marketSlug,
            title: marketTitle,
            conditionId,
          },
        },
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          processingTimeMs,
        },
      };
    }

    return {
      success: true,
      data: {
        order: orderResult,
        market: {
          slug: marketSlug,
          title: marketTitle,
          conditionId,
        },
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs,
      },
    };
  } catch (error) {
    console.error("Unhandled error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}
