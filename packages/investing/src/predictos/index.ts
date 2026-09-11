/**
 * investing/predictos - PredictOS "Super Intelligence" core, refactored for
 * Node/TypeScript ESM and merged into the `investing` package.
 *
 * Adapted from PredictOS by PredictionXBT (https://github.com/PredictionXBT/PredictOS),
 * MIT licensed. The original Deno/Supabase edge functions have been refactored into
 * plain, typed async library functions.
 *
 * This module provides:
 * - AI provider clients (OpenAI, Grok/xAI, BlockRun) and prompt builders
 * - Prediction market data clients (Kalshi via DFlow, Polymarket via Dome/Gamma)
 * - The multi-agent analysis pipeline (event analysis, bookmaker, mapper)
 * - Cross-platform arbitrage detection
 * - Event/market URL fetching
 */

// Shared domain types (AIConfig, DataConfig, MarketAnalysis, etc.)
export * from "./types.js";

// AI provider clients + prompt builders
export * from "./ai/index.js";

// Market data clients.
// The Kalshi (DFlow) client is the canonical one exported at the top level.
// The Polymarket (Dome) client also exposes Kalshi helpers under the same
// names; to avoid ambiguity those two are re-exported here with `Dome`/`dome`
// prefixes. Import from `investing/predictos/data/polymarket` for their
// original names.
export * from "./data/kalshi.js";
export {
  domeRequest,
  getPolymarketMarkets,
  buildPolymarketUrl,
  getKalshiMarketsByEvent as getDomeKalshiMarketsByEvent,
  buildKalshiMarketUrl as buildDomeKalshiMarketUrl,
} from "./data/polymarket.js";
export type {
  DomeRequestOptions,
  PolymarketMarket,
  PolymarketMarketsResponse,
  KalshiMarket as DomeKalshiMarket,
  KalshiMarketsResponse as DomeKalshiMarketsResponse,
  PaginationParams,
} from "./data/polymarket.js";

// Multi-agent analysis pipeline
export * from "./agents/index.js";

// Cross-platform arbitrage detection
export { findArbitrage } from "./arbitrage.js";

// Event/market URL fetching
export { getEvents } from "./events.js";

// Additional API clients used by the research/execution agents.
// These are namespaced to avoid name collisions with the market-data clients
// above (e.g. `PolymarketMarket` exists in both `data/polymarket` and the
// Gamma/CLOB trading client `clients/polymarket`).
export * as polyfactual from "./clients/polyfactual.js";
export * as x402 from "./clients/x402.js";
export * as polymarketClob from "./clients/polymarket.js";
