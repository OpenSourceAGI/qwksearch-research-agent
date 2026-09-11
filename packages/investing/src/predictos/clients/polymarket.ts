/**
 * Polymarket CLOB client (ported from the PredictOS `polymarket` shared client).
 *
 * Provides functionality to:
 * - Fetch market data from the Gamma API
 * - Place orders on the Polymarket CLOB using the official
 *   `@polymarket/clob-client`
 * - Read positions/activity from the public Data API
 *
 * This is distinct from the Dome-based market-data client in
 * `data/polymarket.ts`: this module is the order-placement / trading-bot client
 * for the 15-minute up/down markets.
 */

import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";

// ============================================================================
// Types
// ============================================================================

/** Supported assets for 15-minute up/down markets. */
export type SupportedAsset = "BTC" | "SOL" | "ETH" | "XRP";

/** Market data from the Gamma API. */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  title: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: number;
  clobTokenIds: string;
  acceptingOrders: boolean;
  active: boolean;
  closed: boolean;
  endDate: string;
  startDate: string;
}

/** Parsed token IDs for Up and Down outcomes. */
export interface TokenIds {
  up: string;
  down: string;
}

/** Order side type. */
export type OrderSideType = "BUY" | "SELL";

/** Order arguments for creating a new order. */
export interface OrderArgs {
  tokenId: string;
  price: number;
  size: number;
  side: OrderSideType;
}

/** Order response from the CLOB API. */
export interface OrderResponse {
  success: boolean;
  orderId?: string;
  errorMsg?: string;
  transactionHash?: string;
  status?: string;
}

/** Log entry for bot execution. */
export interface BotLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  details?: Record<string, unknown>;
}

/** Polymarket client configuration. */
export interface PolymarketClientConfig {
  /** Private key for signing orders */
  privateKey: string;
  /** Proxy/funder address (shown under profile pic on Polymarket) */
  proxyAddress: string;
  /** Signature type: 0 = EOA, 1 = Magic/Email, 2 = Browser Wallet */
  signatureType?: number;
}

/** Order status from CLOB API. */
export type OrderStatus = "LIVE" | "MATCHED" | "CANCELLED" | "EXPIRED" | "FILLED" | "PARTIALLY_FILLED";

/** Open order from CLOB API. */
export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  side: OrderSideType;
  price: string;
  size_matched: string;
  original_size: string;
  status: OrderStatus;
  created_at: number;
  expiration: number;
}

/** Trade/fill from CLOB API. */
export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: OrderSideType;
  price: string;
  size: string;
  fee_rate_bps: string;
  status: string;
  match_time: number;
  owner: string;
  transaction_hash?: string;
}

/** Position for a single side (YES or NO). */
export interface SidePosition {
  /** Total shares filled */
  shares: number;
  /** Total cost in USD */
  costUsd: number;
  /** Average price per share */
  avgPrice: number;
  /** Number of orders placed */
  ordersPlaced: number;
  /** Number of orders filled (partially or fully) */
  ordersFilled: number;
  /** Pending shares (orders placed but not filled) */
  pendingShares: number;
}

/** Pair position status. */
export type PairStatus =
  | "PROFIT_LOCKED"     // Both sides filled, avg_YES + avg_NO < 1.00
  | "BREAK_EVEN"        // Both sides filled, avg_YES + avg_NO = 1.00
  | "LOSS_RISK"         // Both sides filled, avg_YES + avg_NO > 1.00
  | "DIRECTIONAL_YES"   // Only YES filled - directional risk
  | "DIRECTIONAL_NO"    // Only NO filled - directional risk
  | "PENDING"           // Orders placed but neither side filled yet
  | "NO_POSITION";      // No orders placed

/** Combined position for a market. */
export interface MarketPosition {
  /** Market slug identifier */
  marketSlug: string;
  /** Market title */
  marketTitle?: string;
  /** Token IDs */
  tokenIds: TokenIds;
  /** YES side position */
  yes: SidePosition;
  /** NO side position */
  no: SidePosition;
  /** Combined pair cost (avgYes + avgNo) - only valid when both sides have shares */
  pairCost: number | null;
  /** Position status */
  status: PairStatus;
  /** Minimum shares between YES and NO (determines guaranteed payout) */
  minShares: number;
  /** Guaranteed payout (minShares * $1.00) */
  guaranteedPayout: number;
  /** Total cost for matched pairs */
  totalCost: number;
  /** Guaranteed profit for matched pairs */
  guaranteedProfit: number;
  /** Return percentage for matched pairs */
  returnPercent: number;
  /** Timestamp of last update */
  lastUpdated: string;
}

// ============================================================================
// Utilities
// ============================================================================

/** Asset slug prefixes for 15-minute up/down markets. */
export const ASSET_SLUG_PREFIXES: Record<SupportedAsset, string> = {
  BTC: "btc-updown-15m-",
  SOL: "sol-updown-15m-",
  ETH: "eth-updown-15m-",
  XRP: "xrp-updown-15m-",
};

/** Get the market slug for a given asset and timestamp. */
export function buildMarketSlug(asset: SupportedAsset, timestamp: number): string {
  const prefix = ASSET_SLUG_PREFIXES[asset];
  return `${prefix}${timestamp}`;
}

/** Format a Unix timestamp to a short time string (HH:MM:SS UTC). */
export function formatTimeShort(ts: number): string {
  const dt = new Date(ts * 1000);
  return dt.toISOString().slice(11, 19) + " UTC";
}

/** Create a log entry with current timestamp. */
export function createLogEntry(
  level: BotLogEntry["level"],
  message: string,
  details?: Record<string, unknown>
): BotLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
}

/**
 * Parse token IDs from market data.
 * Returns [upTokenId, downTokenId].
 */
export function parseTokenIds(clobTokenIdsStr: string): [string, string] {
  const tokenIds = JSON.parse(clobTokenIdsStr);
  if (!Array.isArray(tokenIds) || tokenIds.length < 2) {
    throw new Error(`Expected 2 token IDs, got ${tokenIds.length}`);
  }
  // First token is Up, second is Down (based on outcomes: ["Up", "Down"])
  return [tokenIds[0], tokenIds[1]];
}

// ============================================================================
// Client
// ============================================================================

// API endpoints
const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const CLOB_HOST = "https://clob.polymarket.com";
const DATA_API_URL = "https://data-api.polymarket.com"; // Public API (no auth required)
const CHAIN_ID = 137; // Polygon

// Default tick size for 15-min up/down markets
const DEFAULT_TICK_SIZE = "0.01";
const DEFAULT_NEG_RISK = false;

/**
 * Polymarket Client Class
 */
export class PolymarketClient {
  private config: PolymarketClientConfig;
  private logs: BotLogEntry[] = [];
  private clobClient: ClobClient | null = null;

  constructor(config: PolymarketClientConfig) {
    this.config = {
      ...config,
      signatureType: config.signatureType ?? 1, // Default to Magic/Email login
    };
  }

  /**
   * Get collected logs
   */
  getLogs(): BotLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Add a log entry
   */
  private log(level: BotLogEntry["level"], message: string, details?: Record<string, unknown>): void {
    this.logs.push(createLogEntry(level, message, details));
    console.log(`[${level}] ${message}`, details || "");
  }

  /**
   * Initialize the CLOB client with API credentials
   */
  private async initClobClient(): Promise<ClobClient> {
    if (this.clobClient) {
      return this.clobClient;
    }

    const { privateKey, proxyAddress, signatureType } = this.config;

    this.log("INFO", "Initializing Polymarket CLOB client...");

    try {
      // Create wallet signer from private key
      const signer = new Wallet(privateKey);

      // Create initial client to derive API credentials
      const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, signer as never);

      // Derive or create API credentials
      const creds = await tempClient.createOrDeriveApiKey();
      this.log("INFO", "API credentials derived successfully");

      // Create the full client with credentials and funder
      this.clobClient = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        signer as never,
        creds,
        signatureType,
        proxyAddress
      );

      this.log("SUCCESS", "CLOB client initialized", {
        funder: `${proxyAddress.slice(0, 10)}...${proxyAddress.slice(-8)}`,
        signatureType,
      });

      return this.clobClient;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to initialize CLOB client: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Fetch market data from Gamma API by slug
   */
  async getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
    const url = `${GAMMA_API_URL}/markets/slug/${slug}`;
    this.log("INFO", `Fetching market data for slug: ${slug}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.log("WARN", `Market not found: ${slug}`);
          return null;
        }
        throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as PolymarketMarket;
      this.log("SUCCESS", `Found market: ${data.title || slug}`);
      return data as PolymarketMarket;
    } catch (error) {
      this.log("ERROR", `Failed to fetch market: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Extract Up and Down token IDs from market data
   */
  extractTokenIds(market: PolymarketMarket): TokenIds {
    const clobTokenIdsStr = market.clobTokenIds;

    if (!clobTokenIdsStr) {
      throw new Error("No clobTokenIds found in market data");
    }

    const [up, down] = parseTokenIds(clobTokenIdsStr);
    this.log("INFO", "Extracted token IDs", {
      up: `${up.slice(0, 16)}...${up.slice(-8)}`,
      down: `${down.slice(0, 16)}...${down.slice(-8)}`
    });

    return { up, down };
  }

  /**
   * Place a limit buy order on Polymarket CLOB
   */
  async placeOrder(order: OrderArgs): Promise<OrderResponse> {
    const { privateKey, proxyAddress } = this.config;

    if (!privateKey) {
      this.log("ERROR", "Missing private key for order placement");
      return {
        success: false,
        errorMsg: "Missing private key. Please set POLYMARKET_WALLET_PRIVATE_KEY.",
      };
    }

    if (!proxyAddress) {
      this.log("ERROR", "Missing proxy address for order placement");
      return {
        success: false,
        errorMsg: "Missing proxy address. Please set POLYMARKET_PROXY_WALLET_ADDRESS.",
      };
    }

    this.log("INFO", `Placing ${order.side} order`, {
      tokenId: `${order.tokenId.slice(0, 16)}...`,
      price: order.price,
      size: Math.floor(order.size),
    });

    try {
      // Initialize the CLOB client if not already done
      const client = await this.initClobClient();

      // Create and post the order using the official client
      const orderResponse = await client.createAndPostOrder(
        {
          tokenID: order.tokenId,
          price: order.price,
          side: order.side === "BUY" ? Side.BUY : Side.SELL,
          size: Math.floor(order.size),
          feeRateBps: 0,
        },
        {
          tickSize: DEFAULT_TICK_SIZE,
          negRisk: DEFAULT_NEG_RISK,
        },
        OrderType.GTC // Good Till Cancelled
      );

      this.log("SUCCESS", `Order placed successfully`, {
        orderId: orderResponse?.orderID || orderResponse?.id,
        status: orderResponse?.status,
      });

      return {
        success: true,
        orderId: orderResponse?.orderID || orderResponse?.id,
        status: orderResponse?.status || "submitted",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to place order: ${errorMsg}`);
      return {
        success: false,
        errorMsg,
      };
    }
  }

  /**
   * Place straddle orders (buy both Up and Down) at a given price
   */
  async placeStraddleOrders(
    tokenIds: TokenIds,
    price: number,
    sizeUsd: number
  ): Promise<{ up: OrderResponse; down: OrderResponse }> {
    const size = sizeUsd / price;

    this.log("INFO", `Placing straddle orders`, {
      price: `${(price * 100).toFixed(1)}%`,
      sizeUsd: `$${sizeUsd}`,
      shares: Math.floor(size),
    });

    // Place Up order
    const upResult = await this.placeOrder({
      tokenId: tokenIds.up,
      price,
      size,
      side: "BUY",
    });

    // Place Down order
    const downResult = await this.placeOrder({
      tokenId: tokenIds.down,
      price,
      size,
      side: "BUY",
    });

    return { up: upResult, down: downResult };
  }

  /**
   * Calculate ladder rungs with exponential taper allocation
   * Heavy allocation at top (maxPrice), tapering down to minPrice
   * Ensures minimum allocation per rung to guarantee 5+ shares at any price level
   */
  calculateLadderRungs(
    totalBankroll: number,
    maxPrice: number = 49,
    minPrice: number = 35,
    taperFactor: number = 1.5
  ): Array<{ pricePercent: number; priceDecimal: number; sizeUsd: number; allocationPercent: number }> {
    // Calculate minimum USD needed for 5 shares at the highest price level
    // At maxPrice%, need: 5 shares * (maxPrice/100) = minimum USD
    const MIN_SHARES = 5;
    const MIN_RUNG_USD = Math.ceil(MIN_SHARES * (maxPrice / 100) * 100) / 100; // Round up to 2 decimals

    // Generate all potential price levels from maxPrice down to minPrice
    const allPriceLevels: number[] = [];
    for (let p = maxPrice; p >= minPrice; p--) {
      allPriceLevels.push(p);
    }

    // Calculate how many rungs we can afford with minimum allocation
    // We need to find rungs that can be covered with taper while meeting minimum
    let priceLevels = [...allPriceLevels];
    let numRungs = priceLevels.length;

    // Iteratively reduce rungs until all can meet minimum allocation
    while (numRungs > 1) {
      // Calculate raw weights using exponential decay
      const rawWeights: number[] = [];
      for (let i = 0; i < numRungs; i++) {
        const weight = Math.exp(-taperFactor * i / numRungs);
        rawWeights.push(weight);
      }

      // Normalize weights to sum to 1
      const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
      const normalizedWeights = rawWeights.map(w => w / totalWeight);

      // Check if the smallest allocation (last rung) meets minimum
      const smallestAllocation = totalBankroll * normalizedWeights[numRungs - 1];

      if (smallestAllocation >= MIN_RUNG_USD) {
        // All rungs can meet minimum, we're done
        break;
      }

      // Remove the lowest price level and try again
      numRungs--;
      priceLevels = allPriceLevels.slice(0, numRungs);
    }

    // Now calculate final rungs with the adjusted price levels
    const rungs: Array<{ pricePercent: number; priceDecimal: number; sizeUsd: number; allocationPercent: number }> = [];

    // Recalculate weights for final set of rungs
    const rawWeights: number[] = [];
    for (let i = 0; i < numRungs; i++) {
      const weight = Math.exp(-taperFactor * i / numRungs);
      rawWeights.push(weight);
    }

    const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = rawWeights.map(w => w / totalWeight);

    // Create rungs with allocations
    for (let i = 0; i < numRungs; i++) {
      const pricePercent = priceLevels[i];
      const allocationPercent = normalizedWeights[i] * 100;
      const sizeUsd = totalBankroll * normalizedWeights[i];

      rungs.push({
        pricePercent,
        priceDecimal: pricePercent / 100,
        sizeUsd: Math.round(sizeUsd * 100) / 100, // Round to 2 decimal places
        allocationPercent: Math.round(allocationPercent * 100) / 100,
      });
    }

    // Calculate effective minPrice (might be higher than requested if bankroll too small)
    const effectiveMinPrice = priceLevels[priceLevels.length - 1];

    this.log("INFO", `Calculated ladder with ${numRungs} rungs`, {
      maxPrice: `${maxPrice}%`,
      effectiveMinPrice: `${effectiveMinPrice}%`,
      requestedMinPrice: `${minPrice}%`,
      taperFactor,
      totalBankroll: `$${totalBankroll}`,
      minRungAllocation: `$${rungs[rungs.length - 1]?.sizeUsd || 0}`,
    });

    if (effectiveMinPrice > minPrice) {
      this.log("WARN", `Bankroll too small for full ladder range. Adjusted min price from ${minPrice}% to ${effectiveMinPrice}%`);
    }

    return rungs;
  }

  /**
   * Place ladder orders - straddle orders at multiple price levels with tapered allocation
   */
  async placeLadderOrders(
    tokenIds: TokenIds,
    totalBankroll: number,
    maxPrice: number = 49,
    minPrice: number = 35,
    taperFactor: number = 1.5
  ): Promise<{
    rungs: Array<{ pricePercent: number; priceDecimal: number; sizeUsd: number; allocationPercent: number }>;
    results: Array<{ pricePercent: number; sizeUsd: number; up: OrderResponse; down: OrderResponse }>;
    totalOrders: number;
    successfulOrders: number;
  }> {
    const rungs = this.calculateLadderRungs(totalBankroll, maxPrice, minPrice, taperFactor);

    this.log("INFO", `Placing ladder orders`, {
      totalRungs: rungs.length,
      totalBankroll: `$${totalBankroll}`,
      priceRange: `${maxPrice}% → ${minPrice}%`,
    });

    const results: Array<{ pricePercent: number; sizeUsd: number; up: OrderResponse; down: OrderResponse }> = [];
    let successfulOrders = 0;
    const totalOrders = rungs.length * 2; // 2 orders per rung (up + down)

    // Place orders for each rung
    // Start from highest price (most allocation) and work down
    for (const rung of rungs) {
      // Skip rungs with allocation too small (less than $1 per side would result in < 5 shares)
      if (rung.sizeUsd < 1) {
        this.log("WARN", `Skipping rung at ${rung.pricePercent}% - allocation too small ($${rung.sizeUsd.toFixed(2)})`);
        continue;
      }

      const size = rung.sizeUsd / rung.priceDecimal;

      // Polymarket requires minimum 5 shares
      if (Math.floor(size) < 5) {
        this.log("WARN", `Skipping rung at ${rung.pricePercent}% - would result in < 5 shares`);
        continue;
      }

      this.log("INFO", `Placing ladder rung at ${rung.pricePercent}%`, {
        sizeUsd: `$${rung.sizeUsd.toFixed(2)}`,
        shares: Math.floor(size),
        allocation: `${rung.allocationPercent.toFixed(1)}%`,
      });

      // Place Up order
      const upResult = await this.placeOrder({
        tokenId: tokenIds.up,
        price: rung.priceDecimal,
        size,
        side: "BUY",
      });

      if (upResult.success) successfulOrders++;

      // Place Down order
      const downResult = await this.placeOrder({
        tokenId: tokenIds.down,
        price: rung.priceDecimal,
        size,
        side: "BUY",
      });

      if (downResult.success) successfulOrders++;

      results.push({
        pricePercent: rung.pricePercent,
        sizeUsd: rung.sizeUsd,
        up: upResult,
        down: downResult,
      });
    }

    this.log("SUCCESS", `Ladder orders complete`, {
      totalOrders,
      successfulOrders,
      successRate: `${((successfulOrders / totalOrders) * 100).toFixed(1)}%`,
    });

    return { rungs, results, totalOrders, successfulOrders };
  }

  /**
   * Get user positions from public Data API
   * No authentication required - uses proxy wallet address
   */
  async getPositions(options?: { market?: string }): Promise<Array<{
    asset: string;
    size: number;
    avgPrice: number;
    outcome: string;
    conditionId: string;
  }>> {
    try {
      const { proxyAddress } = this.config;

      const params = new URLSearchParams();
      params.append("user", proxyAddress);
      params.append("sizeThreshold", "0"); // Include all positions
      if (options?.market) params.append("market", options.market);

      const url = `${DATA_API_URL}/positions?${params.toString()}`;

      this.log("INFO", "Fetching positions from Data API", { user: `${proxyAddress.slice(0, 10)}...`, ...options });

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Data API error: ${response.status} ${response.statusText}`);
      }

      const positions = (await response.json()) as Array<{
        asset: string;
        size: number;
        avgPrice: number;
        outcome: string;
        conditionId: string;
      }>;

      this.log("SUCCESS", `Found ${(positions || []).length} positions`);

      return positions || [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to get positions: ${errorMsg}`);
      return [];
    }
  }

  /**
   * Get user activity (trades) from public Data API
   * No authentication required - uses proxy wallet address
   */
  async getActivity(options?: { market?: string; asset?: string }): Promise<Array<{
    asset: string;
    size: number;
    price: number;
    side: string;
    outcome: string;
    conditionId: string;
    timestamp: number;
    type: string;
  }>> {
    try {
      const { proxyAddress } = this.config;

      const params = new URLSearchParams();
      params.append("user", proxyAddress);
      params.append("type", "TRADE"); // Only get trades
      params.append("limit", "500"); // Get recent trades
      if (options?.market) params.append("market", options.market);

      const url = `${DATA_API_URL}/activity?${params.toString()}`;

      this.log("INFO", "Fetching activity from Data API", { user: `${proxyAddress.slice(0, 10)}...`, ...options });

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Data API error: ${response.status} ${response.statusText}`);
      }

      const activity = (await response.json()) as Array<{
        asset: string;
        size: number;
        price: number;
        side: string;
        outcome: string;
        conditionId: string;
        timestamp: number;
        type: string;
      }>;

      this.log("SUCCESS", `Found ${(activity || []).length} trades`);

      return activity || [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to get activity: ${errorMsg}`);
      return [];
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<OpenOrder | null> {
    try {
      const client = await this.initClobClient();

      this.log("INFO", `Fetching order: ${orderId.slice(0, 16)}...`);

      const order = await client.getOrder(orderId);

      if (order) {
        this.log("SUCCESS", `Order found`, {
          status: order.status,
          size_matched: order.size_matched,
          original_size: order.original_size,
        });
      } else {
        this.log("WARN", `Order not found: ${orderId}`);
      }

      return (order as unknown as OpenOrder | undefined) || null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to get order: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Determine pair status based on positions
   */
  private determinePairStatus(yes: SidePosition, no: SidePosition): PairStatus {
    const hasYes = yes.shares > 0;
    const hasNo = no.shares > 0;

    if (!hasYes && !hasNo) {
      if (yes.pendingShares > 0 || no.pendingShares > 0) {
        return "PENDING";
      }
      return "NO_POSITION";
    }

    if (hasYes && !hasNo) {
      return "DIRECTIONAL_YES";
    }

    if (!hasYes && hasNo) {
      return "DIRECTIONAL_NO";
    }

    // Both sides have shares - check pair cost
    const pairCost = yes.avgPrice + no.avgPrice;

    if (pairCost < 0.995) {
      return "PROFIT_LOCKED";
    } else if (pairCost <= 1.005) {
      return "BREAK_EVEN";
    } else {
      return "LOSS_RISK";
    }
  }

  /**
   * Get position for a specific market using public Data API
   * Uses the positions endpoint which returns size and avgPrice directly
   */
  async getMarketPosition(
    marketSlug: string,
    tokenIds: TokenIds,
    marketTitle?: string
  ): Promise<MarketPosition> {
    this.log("INFO", `Fetching position for ${marketSlug} via Data API`);

    try {
      // Fetch all positions for this user (no market filter to avoid extra API call)
      // We filter by token ID client-side which is fast
      const positions = await this.getPositions();

      // Find positions for Up (YES) and Down (NO) tokens by asset ID
      const yesPos = positions.find(p => p.asset === tokenIds.up);
      const noPos = positions.find(p => p.asset === tokenIds.down);

      // Build SidePosition from positions data
      const yesPosition: SidePosition = {
        shares: yesPos?.size || 0,
        costUsd: yesPos ? Math.round(yesPos.size * yesPos.avgPrice * 100) / 100 : 0,
        avgPrice: yesPos?.avgPrice || 0,
        ordersPlaced: 0, // Not available from positions endpoint
        ordersFilled: yesPos ? 1 : 0,
        pendingShares: 0, // We'll detect pending from activity if needed
      };

      const noPosition: SidePosition = {
        shares: noPos?.size || 0,
        costUsd: noPos ? Math.round(noPos.size * noPos.avgPrice * 100) / 100 : 0,
        avgPrice: noPos?.avgPrice || 0,
        ordersPlaced: 0,
        ordersFilled: noPos ? 1 : 0,
        pendingShares: 0,
      };

      // Determine status
      const status = this.determinePairStatus(yesPosition, noPosition);

      // Calculate pair metrics
      const hasYes = yesPosition.shares > 0;
      const hasNo = noPosition.shares > 0;

      let pairCost: number | null = null;
      let minShares = 0;
      let guaranteedPayout = 0;
      let totalCost = 0;
      let guaranteedProfit = 0;
      let returnPercent = 0;

      if (hasYes && hasNo) {
        pairCost = Math.round((yesPosition.avgPrice + noPosition.avgPrice) * 10000) / 10000;
        minShares = Math.min(yesPosition.shares, noPosition.shares);
        guaranteedPayout = minShares; // Each pair pays out $1.00

        // Calculate total cost for matched pairs only
        const yesMatchedCost = minShares * yesPosition.avgPrice;
        const noMatchedCost = minShares * noPosition.avgPrice;
        totalCost = Math.round((yesMatchedCost + noMatchedCost) * 100) / 100;

        guaranteedProfit = Math.round((guaranteedPayout - totalCost) * 100) / 100;
        returnPercent = totalCost > 0 ? Math.round((guaranteedProfit / totalCost) * 10000) / 100 : 0;
      }

      const position: MarketPosition = {
        marketSlug,
        marketTitle,
        tokenIds,
        yes: yesPosition,
        no: noPosition,
        pairCost,
        status,
        minShares,
        guaranteedPayout,
        totalCost,
        guaranteedProfit,
        returnPercent,
        lastUpdated: new Date().toISOString(),
      };

      this.log("SUCCESS", `Position fetched from Data API`, {
        status,
        pairCost,
        yesShares: yesPosition.shares,
        noShares: noPosition.shares,
        guaranteedProfit: guaranteedProfit > 0 ? `$${guaranteedProfit}` : "N/A",
      });

      return position;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log("ERROR", `Failed to get position: ${errorMsg}`);

      // Return empty position on error
      const emptyPosition: SidePosition = {
        shares: 0,
        costUsd: 0,
        avgPrice: 0,
        ordersPlaced: 0,
        ordersFilled: 0,
        pendingShares: 0,
      };

      return {
        marketSlug,
        marketTitle,
        tokenIds,
        yes: emptyPosition,
        no: emptyPosition,
        pairCost: null,
        status: "NO_POSITION",
        minShares: 0,
        guaranteedPayout: 0,
        totalCost: 0,
        guaranteedProfit: 0,
        returnPercent: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

/**
 * Create a Polymarket client from environment variables
 */
export function createClientFromEnv(): PolymarketClient {
  const privateKey = process.env.POLYMARKET_WALLET_PRIVATE_KEY;
  const proxyAddress = process.env.POLYMARKET_PROXY_WALLET_ADDRESS;
  const signatureType = parseInt(process.env.POLYMARKET_SIGNATURE_TYPE || "1", 10);

  if (!privateKey) {
    throw new Error("POLYMARKET_WALLET_PRIVATE_KEY environment variable is required");
  }

  if (!proxyAddress) {
    throw new Error("POLYMARKET_PROXY_WALLET_ADDRESS environment variable is required");
  }

  return new PolymarketClient({
    privateKey,
    proxyAddress,
    signatureType,
  });
}
