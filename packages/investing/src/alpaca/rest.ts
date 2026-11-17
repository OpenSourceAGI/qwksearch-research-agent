/**
 * @file rest.ts
 * Dependency-free Alpaca REST client built on `fetch`.
 *
 * `createAlpacaClient()` wraps the official `@alpacahq/alpaca-trade-api` SDK,
 * which pulls in axios, websockets and Node built-ins. That is fine on a
 * server, but it does not bundle for Cloudflare Workers, Deno, Bun edge
 * runtimes or the browser. `createAlpacaRest()` covers the calls a trading
 * agent actually makes (account, positions, orders, clock, bars, quotes,
 * snapshots) with nothing but `fetch`, so the same agent code runs in a
 * Node script, a StackBlitz project and a Worker's `scheduled()` handler.
 *
 * Import it from `investing/alpaca/rest` when bundling for an edge runtime,
 * so the SDK-based client is never pulled in.
 */

export const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";
export const ALPACA_LIVE_URL = "https://api.alpaca.markets";
export const ALPACA_DATA_URL = "https://data.alpaca.markets";

/**
 * Where keys are read from: `process.env`, or a Worker's `env` bindings.
 * Typed as `object` so a Worker `Env` interface (which also holds KV and
 * other bindings) can be passed straight in; only string values are read.
 */
export type AlpacaEnv = object;

export interface AlpacaRestConfig {
  /** API key id. Falls back to ALPACA_API_KEY, ALPACA_KEY_ID, APCA_API_KEY_ID. */
  keyId?: string;
  /** API secret. Falls back to ALPACA_SECRET, ALPACA_SECRET_KEY, APCA_API_SECRET_KEY. */
  secretKey?: string;
  /** Paper account (default `true`). Ignored when `baseUrl` is set. */
  paper?: boolean;
  /** Trading API base URL. Falls back to ALPACA_BASE_URL / APCA_API_BASE_URL, then paper or live. */
  baseUrl?: string;
  /** Market data base URL (default https://data.alpaca.markets). */
  dataUrl?: string;
  /** Stock data feed: "iex" (free, default) or "sip" (paid). */
  feed?: "iex" | "sip" | "delayed_sip";
  /** Where to read keys from when they are not passed. Pass a Worker's `env` here. */
  env?: AlpacaEnv;
  /** Custom fetch (tests, proxies). Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
export type TimeInForce = "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  type?: OrderType;
  time_in_force?: TimeInForce;
  /** Share count. Give `qty` or `notional`, not both. */
  qty?: number | string;
  /** Dollar amount (fractional shares, market orders only). */
  notional?: number | string;
  limit_price?: number | string;
  stop_price?: number | string;
  trail_percent?: number | string;
  trail_price?: number | string;
  extended_hours?: boolean;
  client_order_id?: string;
  order_class?: "simple" | "bracket" | "oco" | "oto";
  take_profit?: { limit_price: number | string };
  stop_loss?: { stop_price: number | string; limit_price?: number | string };
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  equity: string;
  last_equity: string;
  buying_power: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  [key: string]: unknown;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: "long" | "short";
  avg_entry_price: string;
  market_value: string;
  current_price: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  [key: string]: unknown;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: string | null;
  notional: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  status: string;
  submitted_at: string;
  [key: string]: unknown;
}

export interface AlpacaClock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

/** One OHLCV bar as returned by the data API (short keys). */
export interface AlpacaBar {
  /** ISO timestamp */
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n?: number;
  vw?: number;
}

export interface AlpacaQuote {
  t: string;
  /** ask price */
  ap: number;
  /** ask size */
  as: number;
  /** bid price */
  bp: number;
  /** bid size */
  bs: number;
  [key: string]: unknown;
}

export interface AlpacaTrade {
  t: string;
  /** price */
  p: number;
  /** size */
  s: number;
  [key: string]: unknown;
}

export interface AlpacaSnapshot {
  latestTrade?: AlpacaTrade;
  latestQuote?: AlpacaQuote;
  minuteBar?: AlpacaBar;
  dailyBar?: AlpacaBar;
  prevDailyBar?: AlpacaBar;
}

export interface GetBarsOptions {
  /** e.g. "1Min", "15Min", "1Hour", "1Day" (default "1Day") */
  timeframe?: string;
  /** ISO date or RFC-3339 timestamp */
  start?: string;
  end?: string;
  /** Max bars (default 100, Alpaca max 10000 per page). */
  limit?: number;
  adjustment?: "raw" | "split" | "dividend" | "all";
}

/** Error thrown for any non-2xx Alpaca response. */
export class AlpacaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly path: string,
  ) {
    super(`Alpaca ${status} on ${path}: ${body.slice(0, 300)}`);
    this.name = "AlpacaApiError";
  }
}

function readEnv(env: AlpacaEnv | undefined, ...names: string[]): string | undefined {
  const sources = [env, (globalThis as { process?: { env?: object } }).process?.env] as (
    | Record<string, unknown>
    | undefined
  )[];
  for (const source of sources) {
    if (!source) continue;
    for (const name of names) {
      const value = source[name];
      if (typeof value === "string" && value) return value;
    }
  }
  return undefined;
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * A small, typed Alpaca REST client. Create it with {@link createAlpacaRest}.
 */
export class AlpacaRest {
  readonly baseUrl: string;
  readonly dataUrl: string;
  readonly paper: boolean;
  readonly feed: string;
  private readonly keyId: string;
  private readonly secretKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: AlpacaRestConfig = {}) {
    const env = config.env;
    this.keyId =
      config.keyId ?? readEnv(env, "ALPACA_API_KEY", "ALPACA_KEY_ID", "APCA_API_KEY_ID") ?? "";
    this.secretKey =
      config.secretKey ??
      readEnv(env, "ALPACA_SECRET", "ALPACA_SECRET_KEY", "APCA_API_SECRET_KEY") ??
      "";
    const paperEnv = readEnv(env, "ALPACA_PAPER");
    this.paper = config.paper ?? (paperEnv ? paperEnv !== "false" : true);
    this.baseUrl = (
      config.baseUrl ??
      readEnv(env, "ALPACA_BASE_URL", "APCA_API_BASE_URL") ??
      (this.paper ? ALPACA_PAPER_URL : ALPACA_LIVE_URL)
    ).replace(/\/+$/, "").replace(/\/v2$/, "");
    this.dataUrl = (config.dataUrl ?? ALPACA_DATA_URL).replace(/\/+$/, "");
    this.feed = config.feed ?? readEnv(env, "ALPACA_DATA_FEED") ?? "iex";
    const f = config.fetch ?? globalThis.fetch;
    if (!f) throw new Error("AlpacaRest needs a global fetch (Node 18+) or a `fetch` option");
    this.fetchImpl = f.bind(globalThis);
  }

  /** True when both an API key id and secret were found. */
  get hasKeys(): boolean {
    return Boolean(this.keyId && this.secretKey);
  }

  private async request<T>(
    base: string,
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.hasKeys) {
      throw new Error(
        "Alpaca API keys missing: set ALPACA_API_KEY and ALPACA_SECRET (or pass keyId/secretKey)",
      );
    }
    const res = await this.fetchImpl(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new AlpacaApiError(res.status, text, path);
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private trading<T>(path: string, init?: { method?: string; body?: unknown }) {
    return this.request<T>(this.baseUrl, path, init);
  }

  private data<T>(path: string) {
    return this.request<T>(this.dataUrl, path);
  }

  // ── Account ────────────────────────────────────────────────────────────

  getAccount(): Promise<AlpacaAccount> {
    return this.trading("/v2/account");
  }

  getClock(): Promise<AlpacaClock> {
    return this.trading("/v2/clock");
  }

  /** Shortcut for `(await getClock()).is_open`. */
  async isMarketOpen(): Promise<boolean> {
    return (await this.getClock()).is_open;
  }

  // ── Positions ──────────────────────────────────────────────────────────

  getPositions(): Promise<AlpacaPosition[]> {
    return this.trading("/v2/positions");
  }

  /** Returns `null` when there is no open position in `symbol`. */
  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    try {
      return await this.trading<AlpacaPosition>(`/v2/positions/${encodeURIComponent(symbol)}`);
    } catch (err) {
      if (err instanceof AlpacaApiError && err.status === 404) return null;
      throw err;
    }
  }

  /** Liquidate one position (optionally a percentage of it). */
  closePosition(symbol: string, opts: { percentage?: number; qty?: number } = {}): Promise<AlpacaOrder> {
    return this.trading(
      `/v2/positions/${encodeURIComponent(symbol)}${toQuery({ percentage: opts.percentage, qty: opts.qty })}`,
      { method: "DELETE" },
    );
  }

  /** Liquidate every position; `cancelOrders` also cancels open orders first. */
  closeAllPositions(cancelOrders = false): Promise<unknown[]> {
    return this.trading(`/v2/positions${toQuery({ cancel_orders: cancelOrders || undefined })}`, {
      method: "DELETE",
    });
  }

  // ── Orders ─────────────────────────────────────────────────────────────

  /** Submit an order. `type` defaults to "market", `time_in_force` to "day". */
  createOrder(order: CreateOrderRequest): Promise<AlpacaOrder> {
    const body: Record<string, unknown> = { type: "market", time_in_force: "day", ...order };
    for (const key of ["qty", "notional", "limit_price", "stop_price", "trail_percent", "trail_price"]) {
      if (body[key] !== undefined) body[key] = String(body[key]);
    }
    return this.trading("/v2/orders", { method: "POST", body });
  }

  /**
   * Market entry with an attached take-profit and stop-loss, given as
   * fractions of `referencePrice` (e.g. 0.06 and 0.03 for +6 % / -3 %).
   */
  placeBracketOrder(opts: {
    symbol: string;
    qty: number;
    side?: OrderSide;
    referencePrice: number;
    takeProfitPct: number;
    stopLossPct: number;
    time_in_force?: TimeInForce;
  }): Promise<AlpacaOrder> {
    const side = opts.side ?? "buy";
    const dir = side === "buy" ? 1 : -1;
    const round = (n: number) => Number(n.toFixed(2));
    return this.createOrder({
      symbol: opts.symbol,
      qty: opts.qty,
      side,
      type: "market",
      time_in_force: opts.time_in_force ?? "gtc",
      order_class: "bracket",
      take_profit: { limit_price: round(opts.referencePrice * (1 + dir * opts.takeProfitPct)) },
      stop_loss: { stop_price: round(opts.referencePrice * (1 - dir * opts.stopLossPct)) },
    });
  }

  getOrders(
    opts: { status?: "open" | "closed" | "all"; limit?: number; symbols?: string[]; after?: string } = {},
  ): Promise<AlpacaOrder[]> {
    return this.trading(
      `/v2/orders${toQuery({
        status: opts.status,
        limit: opts.limit,
        symbols: opts.symbols?.join(","),
        after: opts.after,
      })}`,
    );
  }

  getOrder(id: string): Promise<AlpacaOrder> {
    return this.trading(`/v2/orders/${encodeURIComponent(id)}`);
  }

  async cancelOrder(id: string): Promise<void> {
    await this.trading(`/v2/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  cancelAllOrders(): Promise<unknown[]> {
    return this.trading("/v2/orders", { method: "DELETE" });
  }

  // ── Market data ────────────────────────────────────────────────────────

  /** Historical bars for one stock symbol, oldest first. Follows pagination up to `limit`. */
  async getBars(symbol: string, opts: GetBarsOptions = {}): Promise<AlpacaBar[]> {
    const limit = opts.limit ?? 100;
    const bars: AlpacaBar[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.data<{ bars: AlpacaBar[] | null; next_page_token?: string | null }>(
        `/v2/stocks/${encodeURIComponent(symbol)}/bars${toQuery({
          timeframe: opts.timeframe ?? "1Day",
          start: opts.start,
          end: opts.end,
          limit: Math.min(limit - bars.length, 10000),
          adjustment: opts.adjustment,
          feed: this.feed,
          page_token: pageToken,
        })}`,
      );
      bars.push(...(res.bars ?? []));
      pageToken = res.next_page_token ?? undefined;
    } while (pageToken && bars.length < limit);
    return bars;
  }

  /** Latest bid/ask for each symbol, keyed by symbol. */
  async getLatestQuotes(symbols: string[]): Promise<Record<string, AlpacaQuote>> {
    const res = await this.data<{ quotes: Record<string, AlpacaQuote> }>(
      `/v2/stocks/quotes/latest${toQuery({ symbols: symbols.join(","), feed: this.feed })}`,
    );
    return res.quotes ?? {};
  }

  /** Latest trade for each symbol, keyed by symbol. */
  async getLatestTrades(symbols: string[]): Promise<Record<string, AlpacaTrade>> {
    const res = await this.data<{ trades: Record<string, AlpacaTrade> }>(
      `/v2/stocks/trades/latest${toQuery({ symbols: symbols.join(","), feed: this.feed })}`,
    );
    return res.trades ?? {};
  }

  /** Latest trade, quote, minute bar and daily bars for each symbol. */
  async getSnapshots(symbols: string[]): Promise<Record<string, AlpacaSnapshot>> {
    return this.data<Record<string, AlpacaSnapshot>>(
      `/v2/stocks/snapshots${toQuery({ symbols: symbols.join(","), feed: this.feed })}`,
    );
  }

  /** Latest crypto quotes (e.g. "BTC/USD"), keyed by symbol. */
  async getLatestCryptoQuotes(symbols: string[]): Promise<Record<string, AlpacaQuote>> {
    const res = await this.data<{ quotes: Record<string, AlpacaQuote> }>(
      `/v1beta3/crypto/us/latest/quotes${toQuery({ symbols: symbols.join(",") })}`,
    );
    return res.quotes ?? {};
  }
}

/**
 * Create a fetch-based Alpaca client. Paper trading unless `paper: false`
 * (or `ALPACA_PAPER=false`). In a Cloudflare Worker pass `{ env }` so keys
 * are read from the Worker's secrets.
 *
 * @example
 * const alpaca = createAlpacaRest({ env });
 * if (await alpaca.isMarketOpen()) {
 *   await alpaca.createOrder({ symbol: "SPY", notional: 100, side: "buy" });
 * }
 */
export function createAlpacaRest(config: AlpacaRestConfig = {}): AlpacaRest {
  return new AlpacaRest(config);
}
