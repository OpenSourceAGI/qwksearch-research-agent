/**
 * Shared domain types for the PredictOS core pipeline.
 *
 * Consolidated from the per-function `types.ts` files of the original
 * PredictOS Supabase edge functions.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * API credentials for the AI providers used by the analysis agents.
 *
 * Any field left undefined falls back to the corresponding environment
 * variable (`OPENAI_API_KEY`, `XAI_API_KEY`, `BLOCKRUN_WALLET_KEY`).
 */
export interface AIConfig {
  /** OpenAI API key (falls back to `process.env.OPENAI_API_KEY`) */
  openaiApiKey?: string;
  /** xAI / Grok API key (falls back to `process.env.XAI_API_KEY`) */
  xaiApiKey?: string;
  /** BlockRun Base-chain wallet private key (falls back to `process.env.BLOCKRUN_WALLET_KEY`) */
  blockrunWalletKey?: string;
}

/**
 * API credentials for the market data providers.
 *
 * Any field left undefined falls back to the corresponding environment
 * variable (`DOME_API_KEY`, `DFLOW_API_KEY`).
 */
export interface DataConfig {
  /** Dome API key (falls back to `process.env.DOME_API_KEY`) */
  domeApiKey?: string;
  /** DFlow API key (falls back to `process.env.DFLOW_API_KEY`) */
  dflowApiKey?: string;
}

// ============================================================================
// Common enums
// ============================================================================

/** Prediction market platform. */
export type PmType = "Kalshi" | "Polymarket";

/** Source market platform (lowercase form used by the arbitrage module). */
export type ArbitrageMarketSource = "polymarket" | "kalshi";

/** URL source type (tracks if a URL came from a wrapper like Jupiter). */
export type UrlSource = "kalshi" | "polymarket" | "jupiter";

/** Data provider for market data. */
export type DataProvider = "dome" | "dflow" | "gamma";

/** Tool types available for Grok models. */
export type GrokTool = "x_search" | "web_search";

// ============================================================================
// Event analysis
// ============================================================================

/**
 * AI analysis result for an event's markets.
 */
export interface MarketAnalysis {
  /** Event ticker identifier */
  event_ticker: string;
  /** Market ticker with the best alpha opportunity (if any) */
  ticker: string;
  /** Market title/question */
  title: string;
  /** Current market probability (0-100) */
  marketProbability: number;
  /** AI's estimated actual probability (0-100) */
  estimatedActualProbability: number;
  /** Difference between estimated and market probability (positive = buy yes, negative = buy no) */
  alphaOpportunity: number;
  /** Whether there is meaningful alpha opportunity */
  hasAlpha: boolean;
  /** Which side the AI predicts will win */
  predictedWinner: "YES" | "NO";
  /** Confidence that the predicted winner will win (0-100) */
  winnerConfidence: number;
  /** Recommended trading action */
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  /** Detailed explanation of the analysis */
  reasoning: string;
  /** AI's confidence in this overall assessment (0-100) */
  confidence: number;
  /** Key factors influencing the assessment */
  keyFactors: string[];
  /** Risks that could affect the prediction */
  risks: string[];
  /** Direct answer to the user's specific question */
  questionAnswer: string;
  /** Brief summary of the analysis findings (under 270 characters) */
  analysisSummary: string;
  /** X (Twitter) post URLs backing the analysis (when x_search tool is used) */
  xSources?: string[];
  /** Web URLs (news, articles) backing the analysis (when web_search tool is used) */
  webSources?: string[];
}

/**
 * Input for the event analysis agent.
 */
export interface EventAnalysisAgentRequest {
  /** Raw market data from the provider */
  markets: unknown[];
  /** Event identifier (ticker for Kalshi, slug for Polymarket) */
  eventIdentifier: string;
  /** Prediction market type */
  pmType: PmType;
  /** AI model to use for analysis */
  model: string;
  /** Optional custom question for analysis */
  question?: string;
  /** Optional tools for Grok models (X Search, Web Search) */
  tools?: GrokTool[];
  /** Optional user command to prioritize in the analysis */
  userCommand?: string;
}

/**
 * Result of the event analysis agent.
 */
export interface EventAnalysisAgentResult {
  /** Parsed analysis */
  analysis: MarketAnalysis;
  /** Model that produced the analysis */
  model: string;
  /** Total tokens used, when reported by the provider */
  tokensUsed?: number;
  /** BlockRun-specific USDC cost, when applicable (e.g. "$0.001234") */
  paymentCost?: string;
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================================================
// Bookmaker (aggregator) agent
// ============================================================================

/**
 * Individual agent's analysis input for the bookmaker agent.
 */
export interface AgentAnalysisInput {
  /** Unique agent identifier */
  agentId: string;
  /** Model used by this agent */
  model: string;
  /** The analysis result from this agent */
  analysis: MarketAnalysis;
}

/**
 * External data-source (PayAI / x402 seller) result input.
 */
export interface X402ResultInput {
  /** Agent identifier that used this seller */
  agentId: string;
  /** Name of the PayAI seller */
  seller: string;
  /** Query sent to the seller */
  query: string;
  /** Response from the seller (truncated to 3000 chars) */
  response: string;
}

/** Agent consensus information. */
export interface AgentConsensus {
  /** Level of agreement among agents */
  agreementLevel: "high" | "medium" | "low";
  /** What most agents recommended */
  majorityRecommendation: string;
  /** Dissenting opinions summarized */
  dissenting: string[];
}

/** Aggregated analysis result. */
export interface AggregatedAnalysis extends MarketAnalysis {
  /** Information about agent consensus */
  agentConsensus: AgentConsensus;
}

/**
 * Input for the bookmaker (aggregator) agent.
 */
export interface BookmakerAgentRequest {
  /** List of all agent analyses to aggregate */
  analyses: AgentAnalysisInput[];
  /** List of external PayAI/x402 seller results to include */
  x402Results?: X402ResultInput[];
  /** Event identifier (ticker for Kalshi, slug for Polymarket) */
  eventIdentifier: string;
  /** Prediction market type */
  pmType: PmType;
  /** AI model to use for aggregation */
  model: string;
}

/**
 * Result of the bookmaker (aggregator) agent.
 */
export interface BookmakerAgentResult {
  /** Consolidated analysis */
  analysis: AggregatedAnalysis;
  /** Model that produced the analysis */
  model: string;
  /** Total tokens used, when reported by the provider */
  tokensUsed?: number;
  /** Number of data sources aggregated */
  agentsAggregated: number;
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================================================
// Mapper agent
// ============================================================================

/** Supported prediction market platforms for order mapping. */
export type PlatformType = "Polymarket" | "Kalshi";

/**
 * Analysis result consumed by the mapper agent.
 */
export interface AnalysisResult {
  /** Recommended trading action */
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  /** Which side is predicted to win */
  predictedWinner: "YES" | "NO";
  /** Confidence in the prediction (0-100) */
  winnerConfidence: number;
  /** Current market probability (0-100) */
  marketProbability: number;
  /** Estimated actual probability (0-100) */
  estimatedActualProbability: number;
  /** Market ticker */
  ticker: string;
  /** Market title */
  title: string;
}

/**
 * Raw market data from data providers (Dome/Gamma for Polymarket).
 */
export interface MarketData {
  /** Market condition ID */
  conditionId?: string;
  /** Market slug/identifier */
  slug?: string;
  /** CLOB token IDs (JSON string array) */
  clobTokenIds?: string;
  /** Outcomes (JSON string array like '["Yes", "No"]') */
  outcomes?: string;
  /** Outcome prices (JSON string array like '["0.65", "0.35"]') */
  outcomePrices?: string;
  /** Whether market is accepting orders */
  acceptingOrders?: boolean;
  /** Whether market is active */
  active?: boolean;
  /** Whether market is closed */
  closed?: boolean;
  /** Minimum tick size for orders */
  minimumTickSize?: string;
  /** Whether this is a negative risk market */
  negRisk?: boolean;
  /** Market title */
  title?: string;
  /** Market question */
  question?: string;
}

/**
 * Input for the mapper agent.
 */
export interface MapperAgentRequest {
  /** Platform type (Polymarket or Kalshi) */
  platform: PlatformType;
  /** Analysis result from bookmaker/analysis agent */
  analysisResult: AnalysisResult;
  /** Raw market data from data provider */
  marketData: MarketData;
  /** Budget in USD for the order */
  budgetUsd: number;
}

/** Polymarket-specific order parameters. */
export interface PolymarketOrderParams {
  /** Token ID for the outcome to buy */
  tokenId: string;
  /** Order price (0-1 decimal) */
  price: number;
  /** Order side (BUY or SELL) */
  side: "BUY" | "SELL";
  /** Number of shares to buy */
  size: number;
  /** Fee rate in basis points */
  feeRateBps: number;
  /** Tick size for the market */
  tickSize: string;
  /** Whether this is a negative risk market */
  negRisk: boolean;
  /** Market condition ID */
  conditionId: string;
  /** Market slug for reference */
  marketSlug: string;
  /** Human-readable description of the order */
  orderDescription: string;
}

/** Kalshi-specific order parameters (not yet implemented). */
export interface KalshiOrderParams {
  ticker: string;
  side: "yes" | "no";
  count: number;
  limitPrice: number;
}

/**
 * Result of the mapper agent.
 */
export interface MapperAgentResult {
  /** Platform the order targets */
  platform: PlatformType;
  /** Platform-specific order parameters */
  orderParams: PolymarketOrderParams | KalshiOrderParams;
  /** Summary of the analysis that produced the order */
  analysis: {
    recommendedAction: string;
    side: "YES" | "NO";
    confidence: number;
  };
}

// ============================================================================
// Arbitrage
// ============================================================================

/** Individual market data for arbitrage comparison. */
export interface ArbitrageMarketData {
  /** Source platform */
  source: ArbitrageMarketSource;
  /** Market/event name or title */
  name: string;
  /** Unique identifier (slug for Polymarket, ticker for Kalshi) */
  identifier: string;
  /** Yes price (normalized to 0-100) */
  yesPrice: number;
  /** No price (normalized to 0-100) */
  noPrice: number;
  /** Volume (if available) */
  volume?: number;
  /** Liquidity (if available) */
  liquidity?: number;
  /** Market URL */
  url: string;
  /** OkBet URL for this market */
  okbetUrl?: string;
  /** Raw market data from API */
  rawData?: unknown;
}

/** Arbitrage opportunity details. */
export interface ArbitrageOpportunity {
  /** Whether an arb opportunity exists */
  hasArbitrage: boolean;
  /** Profit percentage if arb exists */
  profitPercent?: number;
  /** Recommended strategy */
  strategy?: {
    /** Which market to buy YES on */
    buyYesOn: ArbitrageMarketSource;
    /** Price to buy YES */
    buyYesPrice: number;
    /** Which market to buy NO on */
    buyNoOn: ArbitrageMarketSource;
    /** Price to buy NO */
    buyNoPrice: number;
    /** Total cost for $100 bet on each side */
    totalCost: number;
    /** Guaranteed payout ($100) */
    guaranteedPayout: number;
    /** Net profit */
    netProfit: number;
  };
}

/** AI analysis result for arbitrage. */
export interface ArbitrageAnalysis {
  /** Whether the markets represent the same underlying event */
  isSameMarket: boolean;
  /** Confidence that markets are the same (0-100) */
  sameMarketConfidence: number;
  /** Explanation of why markets are/aren't the same */
  marketComparisonReasoning: string;
  /** Polymarket data (if found) */
  polymarketData?: ArbitrageMarketData;
  /** Kalshi data (if found) */
  kalshiData?: ArbitrageMarketData;
  /** Arbitrage opportunity analysis */
  arbitrage: ArbitrageOpportunity;
  /** Overall summary of findings */
  summary: string;
  /** Key risks or caveats */
  risks: string[];
  /** Recommended action */
  recommendation: string;
}

/** Input for the arbitrage finder. */
export interface ArbitrageRequest {
  /** URL pasted by user (Polymarket or Kalshi) */
  url: string;
  /** AI model to use */
  model: string;
}

/** Result of the arbitrage finder. */
export interface ArbitrageResult {
  /** Arbitrage analysis */
  analysis: ArbitrageAnalysis;
  /** Model that produced the analysis (may be "none" if no search results) */
  model: string;
  /** Total tokens used, when reported by the provider */
  tokensUsed?: number;
  /** Source platform (parsed from the URL) */
  sourceMarket: ArbitrageMarketSource;
  /** Platform that was searched for a matching market */
  searchedMarket: ArbitrageMarketSource;
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================================================
// Events
// ============================================================================

/** Input for the events fetcher. */
export interface GetEventsRequest {
  /** Prediction market URL */
  url: string;
}

/** Result of the events fetcher. */
export interface GetEventsResult {
  /** Event identifier (ticker for Kalshi, slug for Polymarket) */
  eventIdentifier: string;
  /** Event ID (for Polymarket - used for OkBet links) */
  eventId?: string;
  /** Prediction market type */
  pmType: PmType;
  /** Original URL source (e.g., 'jupiter' for Jupiter prediction market links) */
  urlSource: UrlSource;
  /** Raw market data from the provider */
  markets: unknown[];
  /** Number of markets found */
  marketsCount: number;
  /** Data provider used */
  dataProvider: DataProvider;
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: number;
}
