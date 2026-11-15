/**
 * Stock momentum agent
 *
 *   npm start
 *
 * 1. Loads ~6 months of daily bars for a watchlist from Alpaca.
 * 2. Scores each symbol on trend (close vs 50-day SMA) and 3-month momentum.
 * 3. Plans an equal-weight rebalance into the top names.
 * 4. With DRY_RUN=false and paper keys, sends the orders to Alpaca paper trading.
 *
 * Env (put them in .env or the StackBlitz env panel):
 *   ALPACA_API_KEY, ALPACA_SECRET   free paper keys from https://app.alpaca.markets
 *   WATCHLIST                       comma-separated, default a mega-cap list
 *   TOP_N                           how many names to hold, default 3
 *   DRY_RUN                         "false" to place paper orders, default true
 *
 * With no keys it runs on generated demo prices so you can see the output.
 */
import "dotenv/config";
import { createAlpacaRest } from "investing/alpaca/rest";
import { computeSignal, formatSignal, pickTargets, planTrades, type Signal } from "./strategy";

const WATCHLIST = (process.env.WATCHLIST ?? "AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AVGO,JPM,LLY,XOM,COST")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const TOP_N = Number(process.env.TOP_N ?? 3);
const DRY_RUN = process.env.DRY_RUN !== "false";

const alpaca = createAlpacaRest(); // paper by default; reads ALPACA_API_KEY / ALPACA_SECRET

/** Deterministic random walk so the demo runs without keys or network. */
function demoCloses(symbol: string, days = 130): number[] {
  let seed = [...symbol].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const drift = (rand() - 0.45) * 0.004;
  let price = 50 + rand() * 400;
  return Array.from({ length: days }, () => (price *= 1 + drift + (rand() - 0.5) * 0.03));
}

async function loadCloses(symbol: string): Promise<number[]> {
  if (!alpaca.hasKeys) return demoCloses(symbol);
  const start = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
  const bars = await alpaca.getBars(symbol, { timeframe: "1Day", start, limit: 200, adjustment: "all" });
  return bars.map((b) => b.c);
}

async function main() {
  console.log(`\nMomentum agent: ${WATCHLIST.length} symbols, hold top ${TOP_N}, ${DRY_RUN ? "DRY RUN" : "PAPER ORDERS"}`);
  if (!alpaca.hasKeys) console.log("No ALPACA_API_KEY / ALPACA_SECRET found, using generated demo prices.\n");

  const signals: Signal[] = [];
  for (const symbol of WATCHLIST) {
    try {
      const signal = computeSignal(symbol, await loadCloses(symbol));
      if (signal) signals.push(signal);
    } catch (err) {
      console.warn(`  skip ${symbol}: ${(err as Error).message}`);
    }
  }
  signals.sort((a, b) => b.momentum - a.momentum).forEach((s) => console.log("  " + formatSignal(s)));

  const targets = pickTargets(signals, TOP_N);
  console.log(`\nTarget basket: ${targets.map((t) => t.symbol).join(", ") || "(all cash)"}`);

  let equity = 100_000;
  let holdings: Record<string, number> = {};
  if (alpaca.hasKeys) {
    const account = await alpaca.getAccount();
    equity = Number(account.equity);
    holdings = Object.fromEntries((await alpaca.getPositions()).map((p) => [p.symbol, Number(p.market_value)]));
  }
  const trades = planTrades({ targets, equity, holdings });
  console.log(`\nEquity $${equity.toLocaleString()}  planned trades: ${trades.length}`);
  for (const t of trades) console.log(`  ${t.side.toUpperCase().padEnd(4)} $${t.notional.toFixed(2).padStart(10)} ${t.symbol.padEnd(6)} ${t.reason}`);

  if (DRY_RUN || !alpaca.hasKeys) {
    console.log("\nDry run: no orders sent. Set DRY_RUN=false with paper keys to trade.");
    return;
  }
  if (!(await alpaca.isMarketOpen())) {
    console.log("\nMarket is closed; orders would queue for the open. Skipping.");
    return;
  }
  for (const t of trades) {
    const order = await alpaca.createOrder({ symbol: t.symbol, side: t.side, notional: t.notional, type: "market", time_in_force: "day" });
    console.log(`  sent ${order.side} ${order.symbol} -> ${order.status} (${order.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
