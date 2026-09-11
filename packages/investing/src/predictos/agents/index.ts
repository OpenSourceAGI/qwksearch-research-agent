/**
 * Multi-agent analysis and execution pipeline.
 *
 * Includes the analysis agents (event-analysis, bookmaker, mapper) plus the
 * execution/research agents ported from the fuller PredictOS surface
 * (Polyfactual deep research, x402 seller, and the Polymarket trading agents).
 */

// --- Analysis agents ---
export { runEventAnalysisAgent } from "./event-analysis-agent.js";
export { runBookmakerAgent } from "./bookmaker-agent.js";
export { runMapperAgent, NoTradeError } from "./mapper-agent.js";

// --- Research / execution agents ---
export { runPolyfactualResearch } from "./polyfactual-research.js";
export type {
  PolyfactualResearchRequest,
  PolyfactualResearchResponse,
} from "./polyfactual-research.js";

export { runX402Seller } from "./x402-seller.js";
export type {
  X402SellerAction,
  X402SellerRequest,
  X402SellerGenericResponse,
} from "./x402-seller.js";

export { runPolymarketPutOrder } from "./polymarket-put-order.js";
export type {
  MapperOrderParams,
  PolymarketPutOrderRequest,
  OrderResult,
  PolymarketPutOrderResponse,
} from "./polymarket-put-order.js";

export { runPolymarketPositionTracker } from "./polymarket-position-tracker.js";
export type {
  PositionTrackerRequest,
  PositionTrackerResponse,
} from "./polymarket-position-tracker.js";

export { runPolymarketUpDown15LimitOrderBot } from "./polymarket-updown-15-limit-order-bot.js";
export type {
  LadderConfig,
  LimitOrderBotRequest,
  OrderPlacementResult,
  LadderRungResult,
  MarketOrderResult,
  LimitOrderBotResponse,
} from "./polymarket-updown-15-limit-order-bot.js";
