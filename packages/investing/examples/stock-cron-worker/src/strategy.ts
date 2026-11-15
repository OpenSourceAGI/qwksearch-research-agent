/**
 * Momentum + trend strategy, written as pure functions so the same code runs
 * in this Node script and in the Cloudflare Worker example.
 *
 * For each symbol:
 *   - trend:    close above its 50-day simple moving average
 *   - momentum: 3-month return (63 trading days), skipping the last 5 days
 * Pick the top N symbols that are in an uptrend, equal-weight them, and
 * hold cash for the rest.
 */

export interface Signal {
  symbol: string;
  close: number;
  sma50: number;
  momentum: number;
  uptrend: boolean;
}

export interface TargetTrade {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  reason: string;
}

export function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function computeSignal(symbol: string, closes: number[]): Signal | null {
  if (closes.length < 70) return null;
  const close = closes[closes.length - 1];
  const sma50 = sma(closes, 50);
  const recent = closes[closes.length - 6];
  const past = closes[closes.length - 69];
  return { symbol, close, sma50, momentum: recent / past - 1, uptrend: close > sma50 };
}

export function pickTargets(signals: Signal[], topN: number): Signal[] {
  return signals
    .filter((s) => s.uptrend && s.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, topN);
}

/**
 * Diff the target portfolio against current holdings and return the trades
 * needed. Trades smaller than `minTrade` dollars are skipped.
 */
export function planTrades(opts: {
  targets: Signal[];
  equity: number;
  holdings: Record<string, number>; // symbol -> current market value
  investFraction?: number; // share of equity to deploy, default 0.95
  minTrade?: number;
}): TargetTrade[] {
  const { targets, equity, holdings } = opts;
  const deploy = equity * (opts.investFraction ?? 0.95);
  const minTrade = opts.minTrade ?? 25;
  const perName = targets.length ? deploy / targets.length : 0;
  const want: Record<string, number> = Object.fromEntries(targets.map((t) => [t.symbol, perName]));
  const trades: TargetTrade[] = [];

  for (const symbol of new Set([...Object.keys(holdings), ...Object.keys(want)])) {
    const diff = (want[symbol] ?? 0) - (holdings[symbol] ?? 0);
    if (Math.abs(diff) < minTrade) continue;
    trades.push({
      symbol,
      side: diff > 0 ? "buy" : "sell",
      notional: Number(Math.abs(diff).toFixed(2)),
      reason: want[symbol] ? "in top momentum basket" : "dropped out of basket",
    });
  }
  // Sell first so buys have the cash.
  return trades.sort((a, b) => (a.side === b.side ? 0 : a.side === "sell" ? -1 : 1));
}

export function formatSignal(s: Signal): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`.padStart(7);
  return `${s.symbol.padEnd(6)} close ${s.close.toFixed(2).padStart(9)}  sma50 ${s.sma50
    .toFixed(2)
    .padStart(9)}  mom ${pct(s.momentum)}  ${s.uptrend ? "uptrend" : "downtrend"}`;
}
