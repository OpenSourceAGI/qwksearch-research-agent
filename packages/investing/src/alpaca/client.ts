import Alpaca from '@alpacahq/alpaca-trade-api'

export interface AlpacaConfig {
  paper?: boolean
  keyId?: string
  secretKey?: string
  baseUrl?: string
}

/**
 * Creates an Alpaca API client with the provided configuration
 * Supports both Trading API and Broker API
 * @param config - Configuration options for the Alpaca client
 * @returns Alpaca client instance
 */
export function createAlpacaClient(config?: Partial<AlpacaConfig>) {
  // Support multiple environment variable naming conventions
  const keyId = config?.keyId ||
    process.env.ALPACA_API_KEY ||
    process.env.ALPACA_KEY_ID ||
    process.env.APCA_API_KEY_ID ||  // Standard Alpaca SDK env var name
    ""
  const secretKey = config?.secretKey ||
    process.env.ALPACA_SECRET ||
    process.env.ALPACA_SECRET_KEY ||
    process.env.APCA_API_SECRET_KEY ||  // Standard Alpaca SDK env var name
    ""
  const paper = config?.paper ?? true

  if (!keyId || !secretKey) {
    console.warn("[Alpaca] API keys missing - check .env or user settings. Expected: ALPACA_API_KEY and ALPACA_SECRET (or APCA_API_KEY_ID and APCA_API_SECRET_KEY)")
  } else {
    console.log(`[Alpaca] Client initialized with API key: ${keyId.substring(0, 4)}...${keyId.substring(keyId.length - 4)}`)
  }

  // Determine base URL based on paper trading and config
  let baseUrl = config?.baseUrl
  if (!baseUrl) {
    if (paper) {
      baseUrl = process.env.ALPACA_BASE_URL || process.env.APCA_API_BASE_URL || 'https://paper-api.alpaca.markets'
    } else {
      baseUrl = process.env.ALPACA_BASE_URL || process.env.APCA_API_BASE_URL || 'https://api.alpaca.markets'
    }
  }

  return new Alpaca({
    keyId,
    secretKey,
    paper,
    baseUrl,
    usePolygon: false, // Use Alpaca data instead of Polygon
  })
}

/**
 * Creates an Alpaca Broker API client for creating and managing user accounts
 * @param config - Broker API configuration
 * @returns Alpaca Broker client instance
 */
export function createAlpacaBrokerClient(config?: Partial<AlpacaConfig>) {
  const keyId = config?.keyId || process.env.ALPACA_BROKER_API_KEY || process.env.ALPACA_API_KEY || ""
  const secretKey = config?.secretKey || process.env.ALPACA_BROKER_SECRET_KEY || process.env.ALPACA_SECRET || ""
  const baseUrl = config?.baseUrl || process.env.ALPACA_BROKER_BASE_URL || 'https://broker-api.alpaca.markets'

  if (!keyId || !secretKey) {
    throw new Error("Alpaca Broker API keys missing - check .env")
  }

  return new Alpaca({
    keyId,
    secretKey,
    baseUrl,
    paper: false, // Broker API doesn't use paper trading flag
  })
}

// Fetch-based client for edge runtimes (Cloudflare Workers, Deno, browser).
// Import from `investing/alpaca/rest` when bundling for a Worker so the SDK
// above is never pulled in; it is re-exported here for convenience.
export { createAlpacaRest, AlpacaRest, AlpacaApiError } from "./rest";
export type { AlpacaRestConfig } from "./rest";
