/**
 * Investing - Reusable investment utilities and trading tools
 *
 * This package provides:
 * - Trading agent frameworks
 * - Stock data and analysis tools
 * - Prediction market integrations
 * - Alpaca trading API client
 * - Constants and data files
 * - Utility functions
 */

// Database schemas (optional - requires drizzle-orm peer dependency)
export * from "./db";

// Correlate with XGBoost timeseries
export * from "./correlate/predict-statistics";

// Trading agents framework
export * from "./trading-agents";

// Alpaca trading client
export * from "./alpaca/client";

// Stock market tools
export * from "./stocks";

// Prediction markets (Polymarket integration)
export * from "./prediction";

// PredictOS core: multi-agent analysis, data clients, and arbitrage
// (adapted from PredictionXBT/PredictOS; see src/predictos and NOTICE)
export * from "./predictos";

// Trading strategies and algorithms
export * from "./algo-stategies/tv-scraper";

// Social trading and leader tracking
export * from "./leaders/nvsty-leaders";
export * from "./leaders/zulu";

// LLM and AI-powered analysis
export * from "./llm/debate-generator";

// API clients for various services
export * from "./alpaca/alpaca-mcp-client";

// Debate research
export * from "./debate-research/stock-agents-api";

// Wikipedia pageviews
export * from "./trending-topics/wiki-page-views";
