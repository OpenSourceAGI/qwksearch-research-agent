import { describe, expect, it } from "vitest";
import { AlpacaApiError, createAlpacaRest } from "../src/alpaca/rest";

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  let i = 0;
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses[Math.min(i++, responses.length - 1)];
    const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    return new Response(text, { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const keys = { keyId: "PKTEST", secretKey: "secret" };

describe("createAlpacaRest", () => {
  it("defaults to paper and sends auth headers", async () => {
    const { fn, calls } = mockFetch([{ body: { equity: "1000" } }]);
    const alpaca = createAlpacaRest({ ...keys, fetch: fn });
    expect(alpaca.paper).toBe(true);
    const account = await alpaca.getAccount();
    expect(account.equity).toBe("1000");
    expect(calls[0].url).toBe("https://paper-api.alpaca.markets/v2/account");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["APCA-API-KEY-ID"]).toBe("PKTEST");
    expect(headers["APCA-API-SECRET-KEY"]).toBe("secret");
  });

  it("reads keys from a Worker-style env object and honours ALPACA_PAPER=false", () => {
    const alpaca = createAlpacaRest({
      env: { ALPACA_API_KEY: "a", ALPACA_SECRET: "b", ALPACA_PAPER: "false" },
      fetch: mockFetch([{ body: {} }]).fn,
    });
    expect(alpaca.hasKeys).toBe(true);
    expect(alpaca.baseUrl).toBe("https://api.alpaca.markets");
  });

  it("throws a clear error when keys are missing", async () => {
    const alpaca = createAlpacaRest({ keyId: "", secretKey: "", env: {}, fetch: mockFetch([{ body: {} }]).fn });
    await expect(alpaca.getAccount()).rejects.toThrow(/keys missing/);
  });

  it("stringifies numeric order fields and applies defaults", async () => {
    const { fn, calls } = mockFetch([{ body: { id: "o1" } }]);
    const alpaca = createAlpacaRest({ ...keys, fetch: fn });
    await alpaca.createOrder({ symbol: "SPY", side: "buy", notional: 100 });
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      symbol: "SPY",
      side: "buy",
      notional: "100",
      type: "market",
      time_in_force: "day",
    });
  });

  it("computes bracket prices from the reference price", async () => {
    const { fn, calls } = mockFetch([{ body: { id: "o2" } }]);
    const alpaca = createAlpacaRest({ ...keys, fetch: fn });
    await alpaca.placeBracketOrder({ symbol: "NVDA", qty: 1, referencePrice: 100, takeProfitPct: 0.06, stopLossPct: 0.03 });
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.order_class).toBe("bracket");
    expect(body.take_profit).toEqual({ limit_price: 106 });
    expect(body.stop_loss).toEqual({ stop_price: 97 });
  });

  it("follows bar pagination and uses the data host and feed", async () => {
    const { fn, calls } = mockFetch([
      { body: { bars: [{ t: "1", o: 1, h: 1, l: 1, c: 1, v: 1 }], next_page_token: "p2" } },
      { body: { bars: [{ t: "2", o: 2, h: 2, l: 2, c: 2, v: 2 }], next_page_token: null } },
    ]);
    const alpaca = createAlpacaRest({ ...keys, fetch: fn });
    const bars = await alpaca.getBars("AAPL", { limit: 5 });
    expect(bars.map((b) => b.c)).toEqual([1, 2]);
    expect(calls[0].url).toContain("https://data.alpaca.markets/v2/stocks/AAPL/bars?");
    expect(calls[0].url).toContain("feed=iex");
    expect(calls[1].url).toContain("page_token=p2");
  });

  it("returns null for a missing position and raises AlpacaApiError otherwise", async () => {
    const alpaca = createAlpacaRest({ ...keys, fetch: mockFetch([{ status: 404, body: "position does not exist" }]).fn });
    expect(await alpaca.getPosition("TSLA")).toBeNull();
    const failing = createAlpacaRest({ ...keys, fetch: mockFetch([{ status: 403, body: "forbidden" }]).fn });
    await expect(failing.getPositions()).rejects.toBeInstanceOf(AlpacaApiError);
  });
});
