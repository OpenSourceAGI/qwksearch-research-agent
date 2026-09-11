/**
 * Polymarket (and Kalshi) market data client via the Dome API.
 *
 * Ported from the PredictOS `dome` shared client. The API key is read from
 * the `apiKey` option, falling back to `process.env.DOME_API_KEY`.
 *
 * @see https://docs.domeapi.io/
 */

const DOME_API_BASE_URL = "https://api.domeapi.io/v1";

export interface DomeRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  /** Dome API key; falls back to `process.env.DOME_API_KEY`. */
  apiKey?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface PolymarketMarket {
  token_id: string;
  condition_id: string;
  question: string;
  slug: string;
  end_date: string;
  description?: string;
  outcomes: string[];
  outcome_prices: number[];
  volume: number;
  liquidity: number;
  active: boolean;
  closed: boolean;
  image?: string;
  icon?: string;
}

export interface PolymarketMarketsResponse {
  markets: PolymarketMarket[];
  next_cursor?: string;
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  status: string;
  close_time: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  liquidity: number;
  open_interest: number;
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/**
 * Gets the Dome API key from options or environment variables.
 */
function getDomeApiKey(apiKey?: string): string {
  const key = apiKey ?? process.env.DOME_API_KEY;
  if (!key) {
    throw new Error("DOME_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Makes a request to the Dome API.
 *
 * @param endpoint The API endpoint (e.g., '/polymarket/markets')
 * @param options Request options including method, headers, params, and apiKey
 * @returns Promise resolving to the parsed JSON response
 */
export async function domeRequest<T>(
  endpoint: string,
  options: DomeRequestOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, params = {}, apiKey } = options;

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([k, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(k, String(value));
    }
  });

  const queryString = queryParams.toString();
  const url = `${DOME_API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getDomeApiKey(apiKey)}`,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Dome API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return (await response.json()) as T;
}

// ============================================================================
// Polymarket Endpoints
// ============================================================================

/**
 * Gets Polymarket markets.
 *
 * @param params Pagination and filter parameters
 * @param apiKey Optional Dome API key (falls back to `DOME_API_KEY`)
 * @returns Promise resolving to markets list
 */
export async function getPolymarketMarkets(
  params?: PaginationParams & {
    active?: boolean;
    closed?: boolean;
    market_slug?: string;
    slug?: string;
  },
  apiKey?: string,
): Promise<PolymarketMarketsResponse> {
  return domeRequest<PolymarketMarketsResponse>("/polymarket/markets", {
    params: params as Record<string, string | number | boolean | undefined>,
    apiKey,
  });
}

// ============================================================================
// Kalshi Endpoints (via Dome)
// ============================================================================

/**
 * Gets Kalshi markets.
 */
async function getKalshiMarkets(
  params?: PaginationParams & {
    eventTicker?: string;
    status?: "open" | "closed" | "settled";
  },
  apiKey?: string,
): Promise<KalshiMarketsResponse> {
  return domeRequest<KalshiMarketsResponse>("/kalshi/markets", {
    params: {
      cursor: params?.cursor,
      limit: params?.limit,
      event_ticker: params?.eventTicker,
      status: params?.status,
    },
    apiKey,
  });
}

/**
 * Gets Kalshi markets by event ticker via Dome.
 *
 * @param eventTicker Event ticker identifier
 * @param status Market status filter
 * @param apiKey Optional Dome API key (falls back to `DOME_API_KEY`)
 * @returns Promise resolving to markets list
 *
 * @example
 * getKalshiMarketsByEvent("KXBTC-25DEC")
 */
export async function getKalshiMarketsByEvent(
  eventTicker: string,
  status: "open" | "closed" | "settled" = "open",
  apiKey?: string,
): Promise<KalshiMarket[]> {
  const response = await getKalshiMarkets(
    {
      eventTicker,
      status,
      limit: 100, // Dome API max limit is 100
    },
    apiKey,
  );
  return response.markets;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds a Kalshi market URL from a market ticker.
 *
 * @example
 * buildKalshiMarketUrl("KXBTCD-25DEC1217-T89999.99") // "https://kalshi.com/markets/KXBTCD"
 */
export function buildKalshiMarketUrl(ticker: string): string {
  const firstElement = ticker.split("-")[0];
  return `https://kalshi.com/markets/${firstElement}`;
}

/**
 * Builds a Polymarket event URL from a market slug.
 */
export function buildPolymarketUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`;
}
