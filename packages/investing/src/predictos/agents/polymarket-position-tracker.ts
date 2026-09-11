/**
 * Polymarket position tracker agent.
 *
 * Fetches and calculates position data for Polymarket 15-minute up/down
 * markets. Shows filled orders, average costs, and profit-lock status.
 *
 * Refactored from the PredictOS `polymarket-position-tracker` Supabase edge
 * function into a plain async function.
 */

import { PolymarketClient, createClientFromEnv } from "../clients/polymarket.js";
import { buildMarketSlug, createLogEntry } from "../clients/polymarket.js";
import type {
  SupportedAsset,
  BotLogEntry,
  MarketPosition,
  TokenIds,
} from "../clients/polymarket.js";

/** Request body for the position tracker. */
export interface PositionTrackerRequest {
  /** Asset to check positions for (BTC, SOL, ETH, XRP) */
  asset: SupportedAsset;
  /** Market slug to check (optional - if not provided, checks latest 15-min market) */
  marketSlug?: string;
  /** Token IDs for the market (optional - required if marketSlug is custom) */
  tokenIds?: TokenIds;
}

/** Response from the position tracker. */
export interface PositionTrackerResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Position data (only present on success) */
  data?: {
    /** Asset checked */
    asset: SupportedAsset;
    /** Position for the market */
    position: MarketPosition;
  };
  /** Log entries from the execution */
  logs: BotLogEntry[];
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Validate that the asset is supported.
 */
function isValidAsset(asset: string): asset is SupportedAsset {
  return ["BTC", "SOL", "ETH", "XRP"].includes(asset.toUpperCase());
}

/**
 * Get current UTC timestamp in seconds.
 */
function nowUtcSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get the current 15-minute market timestamp.
 * Returns the most recent 15-minute block (the current active market).
 */
function getCurrent15MinTimestamp(): number {
  const now = nowUtcSeconds();
  return Math.floor(now / 900) * 900;
}

/**
 * Fetch the current position for a Polymarket 15-minute up/down market.
 */
export async function runPolymarketPositionTracker(
  input: PositionTrackerRequest,
): Promise<PositionTrackerResponse> {
  const logs: BotLogEntry[] = [];

  try {
    const { asset, marketSlug: customSlug, tokenIds: customTokenIds } = input;

    // Validate asset
    if (!asset || !isValidAsset(asset)) {
      logs.push(createLogEntry("ERROR", "Invalid or missing asset", { asset }));
      return {
        success: false,
        error: "Invalid asset. Must be one of: BTC, SOL, ETH, XRP",
        logs,
      };
    }

    const normalizedAsset = asset.toUpperCase() as SupportedAsset;

    // Initialize the Polymarket client
    let client: PolymarketClient;
    try {
      client = createClientFromEnv();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(createLogEntry("ERROR", `Failed to initialize client: ${errorMsg}`));
      return {
        success: false,
        error: `Client initialization failed: ${errorMsg}`,
        logs,
      };
    }

    // Determine market slug
    const timestamp = getCurrent15MinTimestamp();
    const marketSlug = customSlug || buildMarketSlug(normalizedAsset, timestamp);

    logs.push(createLogEntry("INFO", `Checking position for market: ${marketSlug}`));

    // Get token IDs (either from request or fetch from market)
    let tokenIds = customTokenIds;
    let marketTitle: string | undefined;

    if (!tokenIds) {
      // Fetch market to get token IDs
      const market = await client.getMarketBySlug(marketSlug);
      logs.push(...client.getLogs());
      client.clearLogs();

      if (!market) {
        logs.push(createLogEntry("WARN", "Market not found - may not be created yet"));
        return {
          success: false,
          error: "Market not found - may not be created yet",
          logs,
        };
      }

      marketTitle = market.title;

      try {
        tokenIds = client.extractTokenIds(market);
        logs.push(...client.getLogs());
        client.clearLogs();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logs.push(createLogEntry("ERROR", `Failed to extract token IDs: ${errorMsg}`));
        return {
          success: false,
          error: `Token extraction failed: ${errorMsg}`,
          logs,
        };
      }
    }

    // Get position
    const position = await client.getMarketPosition(marketSlug, tokenIds, marketTitle);
    logs.push(...client.getLogs());
    client.clearLogs();

    // Build response
    return {
      success: true,
      data: {
        asset: normalizedAsset,
        position,
      },
      logs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(createLogEntry("ERROR", `Unhandled error: ${errorMsg}`));

    return {
      success: false,
      error: errorMsg,
      logs,
    };
  }
}
