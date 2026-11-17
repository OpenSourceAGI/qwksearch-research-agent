/**
 * One run of the momentum agent. Shared by the Worker's cron trigger
 * (src/worker.ts) and the local runner (src/run-once.ts).
 */
import { createAlpacaRest } from "investing/alpaca/rest";
import { computeSignal, pickTargets, planTrades, type Signal, type TargetTrade } from "./strategy";

export interface AgentEnv {
  ALPACA_API_KEY?: string;
  ALPACA_SECRET?: string;
  /** "false" for a live account. Paper by default. */
  ALPACA_PAPER?: string;
  WATCHLIST?: string;
  TOP_N?: string;
  /** "false" to place paper orders. Anything else is a dry run. */
  DRY_RUN?: string;
}

export interface RunReport {
  ranAt: string;
  marketOpen: boolean;
  dryRun: boolean;
  equity: number;
  signals: Signal[];
  basket: string[];
  trades: TargetTrade[];
  orders: { symbol: string; side: string; status: string; id: string }[];
  skipped?: string;
}

export async function runAgent(env: AgentEnv): Promise<RunReport> {
  const alpaca = createAlpacaRest({ env });
  const watchlist = (env.WATCHLIST ?? "AAPL,MSFT,NVDA,AMZN,GOOGL,META,AVGO,JPM,LLY,COST")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const topN = Number(env.TOP_N ?? 3);
  const dryRun = env.DRY_RUN !== "false";
  const report: RunReport = {
    ranAt: new Date().toISOString(),
    marketOpen: false,
    dryRun,
    equity: 0,
    signals: [],
    basket: [],
    trades: [],
    orders: [],
  };

  if (!alpaca.hasKeys) {
    report.skipped = "ALPACA_API_KEY / ALPACA_SECRET not set";
    return report;
  }

  report.marketOpen = await alpaca.isMarketOpen();
  const start = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
  for (const symbol of watchlist) {
    const bars = await alpaca.getBars(symbol, { timeframe: "1Day", start, limit: 200, adjustment: "all" });
    const signal = computeSignal(symbol, bars.map((b) => b.c));
    if (signal) report.signals.push(signal);
  }

  const targets = pickTargets(report.signals, topN);
  report.basket = targets.map((t) => t.symbol);

  const account = await alpaca.getAccount();
  report.equity = Number(account.equity);
  const holdings = Object.fromEntries(
    (await alpaca.getPositions()).map((p) => [p.symbol, Number(p.market_value)]),
  );
  report.trades = planTrades({ targets, equity: report.equity, holdings });

  if (dryRun) return { ...report, skipped: "dry run" };
  if (!report.marketOpen) return { ...report, skipped: "market closed" };

  for (const t of report.trades) {
    const order = await alpaca.createOrder({
      symbol: t.symbol,
      side: t.side,
      notional: t.notional,
      type: "market",
      time_in_force: "day",
      client_order_id: `momentum-${report.ranAt.slice(0, 16)}-${t.symbol}`,
    });
    report.orders.push({ symbol: order.symbol, side: order.side, status: order.status, id: order.id });
  }
  return report;
}
