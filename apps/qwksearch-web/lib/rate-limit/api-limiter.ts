/**
 * @fileoverview The `/api/*` rate limiter: one fixed-window counter per client
 * and rule, kept in D1 so every Worker isolate counts against the same number.
 *
 * Called once per request from `worker/index.ts`, before the framework, so it
 * covers every route under `/api` — including ones added later — without any
 * route opting in. Route-level limits (the guest chat quota, TTS) still apply
 * on top; this is the floor under all of them, not a replacement.
 *
 * Why D1 and not KV: KV allows one write per second per key and is eventually
 * consistent across locations, so a counter there both undercounts and throws
 * under exactly the load a limiter exists for. D1's upsert-and-return is one
 * atomic statement. Why not the Workers rate-limit binding: its limit and
 * period are fixed in `wrangler.jsonc`, and the point here is that an admin
 * can change them.
 *
 * The limiter fails open. If D1 is unreachable or the migration has not been
 * applied, the request goes through and the failure is logged — a limiter that
 * takes the API down with it has done more damage than the abuse it stops.
 */
import { desc, eq, gt, lt, sql } from "drizzle-orm";
import type { QueryDB } from "../database";
import { apiRateLimitCounters } from "../database/schema";
import { resolveRateLimitRule, type ApiRateLimitSettings, type RateLimitRule } from "./api-rules";
import { getApiRateLimitSettings } from "./api-settings";

/** One in this many counted requests also sweeps expired windows. */
const SWEEP_ONE_IN = 200;

export type CountedRule = Exclude<RateLimitRule, { kind: "exempt" }>;

export type ApiRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds at which the current window closes. */
  resetAt: number;
  rule: CountedRule;
  clientKey: string;
};

/**
 * Who is asking. Cloudflare sets `cf-connecting-ip` on every request that
 * reaches a Worker and a client cannot forge it; the other two only matter
 * outside Cloudflare (local `wrangler dev`, tests).
 */
export function getClientKey(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || "unknown";
}

export function bucketFor(clientKey: string, rule: CountedRule): string {
  return `${clientKey}|${rule.id}`;
}

export function windowStartFor(nowSeconds: number, windowSeconds: number): number {
  return Math.floor(nowSeconds / windowSeconds) * windowSeconds;
}

/**
 * Counts one request against `bucket`'s current window and returns the new
 * total. A single `INSERT … ON CONFLICT DO UPDATE … RETURNING`, so concurrent
 * isolates each get a distinct count.
 */
export async function incrementCounter(
  db: QueryDB,
  bucket: string,
  windowSeconds: number,
  nowSeconds: number,
): Promise<{ count: number; resetAt: number }> {
  const windowStart = windowStartFor(nowSeconds, windowSeconds);
  const resetAt = windowStart + windowSeconds;
  const rows = await db
    .insert(apiRateLimitCounters)
    .values({ bucket, windowStart, count: 1, expiresAt: resetAt })
    .onConflictDoUpdate({
      target: [apiRateLimitCounters.bucket, apiRateLimitCounters.windowStart],
      set: { count: sql`${apiRateLimitCounters.count} + 1` },
    })
    .returning({ count: apiRateLimitCounters.count });
  return { count: Number(rows[0]?.count ?? 1), resetAt };
}

/** Deletes windows that have closed. Returns how many rows went. */
export async function sweepExpiredCounters(db: QueryDB, nowSeconds: number): Promise<number> {
  const rows = await db
    .delete(apiRateLimitCounters)
    .where(lt(apiRateLimitCounters.expiresAt, nowSeconds))
    .returning({ bucket: apiRateLimitCounters.bucket });
  return rows.length;
}

/**
 * Counts `request` against the rule its path falls under. Returns null when
 * the request is not counted at all: not under `/api`, a CORS preflight, an
 * exempt path, or the limiter switched off.
 */
export async function checkApiRateLimit(
  db: QueryDB,
  request: Request,
  options: {
    settings?: ApiRateLimitSettings;
    now?: number;
    waitUntil?: (promise: Promise<unknown>) => void;
    random?: () => number;
  } = {},
): Promise<ApiRateLimitDecision | null> {
  if (request.method === "OPTIONS") return null;
  const pathname = new URL(request.url).pathname;
  // Cheap reject before touching the database for the settings.
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return null;

  const now = options.now ?? Date.now();
  const settings = options.settings ?? (await getApiRateLimitSettings(db, now));
  const rule = resolveRateLimitRule(settings, pathname);
  if (!rule || rule.kind === "exempt") return null;

  const clientKey = getClientKey(request);
  const nowSeconds = Math.floor(now / 1000);
  const { count, resetAt } = await incrementCounter(
    db,
    bucketFor(clientKey, rule),
    rule.windowSeconds,
    nowSeconds,
  );

  if (options.waitUntil && (options.random ?? Math.random)() < 1 / SWEEP_ONE_IN) {
    options.waitUntil(
      sweepExpiredCounters(db, nowSeconds).catch((error) => {
        console.error("[rate-limit] sweep failed:", error);
      }),
    );
  }

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    rule,
    clientKey,
  };
}

function rateLimitHeaders(decision: ApiRateLimitDecision, nowSeconds: number): Record<string, string> {
  const resetIn = Math.max(0, decision.resetAt - nowSeconds);
  return {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "RateLimit-Reset": String(resetIn),
    "RateLimit-Policy": `${decision.limit};w=${decision.rule.windowSeconds}`,
  };
}

/** The 429 a limited client receives. JSON, because every caller is an API client. */
export function rateLimitedResponse(decision: ApiRateLimitDecision, now: number = Date.now()): Response {
  const nowSeconds = Math.floor(now / 1000);
  const retryAfter = Math.max(1, decision.resetAt - nowSeconds);
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: `Too many requests. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
      retryAfter,
      limit: decision.limit,
      windowSeconds: decision.rule.windowSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        ...rateLimitHeaders(decision, nowSeconds),
      },
    },
  );
}

/**
 * Adds the `RateLimit-*` headers to a response that was let through, so a
 * well-behaved client can slow down before it is refused. A WebSocket upgrade
 * is returned untouched — rebuilding it would drop the socket.
 */
export function withRateLimitHeaders(
  response: Response,
  decision: ApiRateLimitDecision,
  now: number = Date.now(),
): Response {
  if (response.status === 101 || (response as { webSocket?: unknown }).webSocket) return response;
  const headers = rateLimitHeaders(decision, Math.floor(now / 1000));
  try {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  } catch {
    // Immutable headers (a fetched response passed straight through): copy.
    const copy = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value);
    return copy;
  }
}

/**
 * The worker's entry point to all of the above. Returns a 429 to send instead
 * of calling the app, or a function that decorates the app's response — or
 * null when the request is not counted. Never throws.
 */
export async function enforceApiRateLimit(
  db: QueryDB,
  request: Request,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<
  | { limited: Response; decorate?: undefined; decision: ApiRateLimitDecision }
  | { limited?: undefined; decorate: (response: Response) => Response; decision: ApiRateLimitDecision }
  | null
> {
  try {
    const decision = await checkApiRateLimit(db, request, { waitUntil });
    if (!decision) return null;
    if (!decision.allowed) return { limited: rateLimitedResponse(decision), decision };
    return { decorate: (response) => withRateLimitHeaders(response, decision), decision };
  } catch (error) {
    console.error("[rate-limit] check failed, letting the request through:", error);
    return null;
  }
}

export type ActiveBucket = {
  bucket: string;
  clientKey: string;
  rule: string;
  windowStart: number;
  count: number;
  expiresAt: number;
};

/** The busiest windows still open, for the admin page. */
export async function listActiveBuckets(
  db: QueryDB,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  limit = 50,
): Promise<ActiveBucket[]> {
  const rows = await db
    .select()
    .from(apiRateLimitCounters)
    .where(gt(apiRateLimitCounters.expiresAt, nowSeconds))
    .orderBy(desc(apiRateLimitCounters.count))
    .limit(limit);
  return rows.map((row) => {
    // The client key is an IP, which never contains `|`; the rule is a path
    // pattern, which might. Split on the first one.
    const at = row.bucket.indexOf("|");
    return {
      bucket: row.bucket,
      clientKey: at === -1 ? row.bucket : row.bucket.slice(0, at),
      rule: at === -1 ? "default" : row.bucket.slice(at + 1),
      windowStart: row.windowStart,
      count: row.count,
      expiresAt: row.expiresAt,
    };
  });
}

/**
 * Clears counters: one bucket's when `bucket` is given (unblocks one client on
 * one rule), otherwise all of them. Returns how many rows went.
 */
export async function resetCounters(db: QueryDB, bucket?: string): Promise<number> {
  const rows = await db
    .delete(apiRateLimitCounters)
    .where(bucket ? eq(apiRateLimitCounters.bucket, bucket) : sql`1 = 1`)
    .returning({ bucket: apiRateLimitCounters.bucket });
  return rows.length;
}

/** How many windows are open right now, across every client and rule. */
export async function countOpenWindows(
  db: QueryDB,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(apiRateLimitCounters)
    .where(gt(apiRateLimitCounters.expiresAt, nowSeconds));
  return Number(rows[0]?.n ?? 0);
}
