/**
 * Kalshi market data client (via the DFlow API).
 *
 * DFlow provides Kalshi market data. Ported from the PredictOS `dflow`
 * shared client. The API key is read from the `apiKey` option, falling back
 * to `process.env.DFLOW_API_KEY`.
 */

const DFLOW_API_BASE_URL = "https://a.prediction-markets-api.dflow.net/api/v1";

export interface DFlowRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  /** DFlow API key; falls back to `process.env.DFLOW_API_KEY`. */
  apiKey?: string;
}

// ============================================================================
// Kalshi Market Types (via DFlow)
// ============================================================================

export interface DFlowKalshiMarket {
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

export interface DFlowEventResponse {
  event_ticker: string;
  title?: string;
  markets: DFlowKalshiMarket[];
}

/**
 * Gets the DFlow API key from options or environment variables.
 */
function getDFlowApiKey(apiKey?: string): string {
  const key = apiKey ?? process.env.DFLOW_API_KEY;
  if (!key) {
    throw new Error(
      "DFLOW_API_KEY is not configured. Get your API key from DFlow: https://x.com/dflow",
    );
  }
  return key;
}

/**
 * Makes a request to the DFlow API.
 *
 * @param endpoint The API endpoint (e.g., '/event/{event_ticker}')
 * @param options Request options including method, headers, params, and apiKey
 * @returns Promise resolving to the parsed JSON response
 */
export async function dflowRequest<T>(
  endpoint: string,
  options: DFlowRequestOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, params = {}, apiKey } = options;
  const key = getDFlowApiKey(apiKey);

  // Build query string from params
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([k, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(k, String(value));
    }
  });

  const queryString = queryParams.toString();
  const url = `${DFLOW_API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DFlow API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Gets Kalshi markets by event ticker via DFlow API.
 *
 * @param eventTicker Event ticker identifier
 * @param apiKey Optional DFlow API key (falls back to `DFLOW_API_KEY`)
 * @returns Promise resolving to markets list
 *
 * @example
 * getKalshiMarketsByEvent("KXBTC-25DEC")
 */
export async function getKalshiMarketsByEvent(
  eventTicker: string,
  apiKey?: string,
): Promise<DFlowKalshiMarket[]> {
  const response = await dflowRequest<DFlowEventResponse>(`/event/${eventTicker}`, {
    params: { withNestedMarkets: true },
    apiKey,
  });
  return response.markets;
}

/**
 * Builds a Kalshi market URL from a market ticker.
 *
 * @example
 * buildKalshiMarketUrl("KXBTCD-25DEC1217-T89999.99") // "https://kalshi.com/markets/KXBTCD"
 *
 * @param ticker Market ticker string
 * @returns Kalshi market URL
 */
export function buildKalshiMarketUrl(ticker: string): string {
  const firstElement = ticker.split("-")[0];
  return `https://kalshi.com/markets/${firstElement}`;
}
