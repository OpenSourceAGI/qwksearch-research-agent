/**
 * D1 read replication via the Sessions API.
 *
 * With read replication enabled, D1 answers reads from a replica in the region
 * nearest the request instead of from the single primary instance in WNAM —
 * the win is round trips, not query time. A replica can lag the primary,
 * though, so reads have to be pinned to a database version or a user can write
 * a row and then not see it. That is what a *session* is for: every query in a
 * session carries a bookmark, and D1 only lets the session read a version at
 * least as new as everything it has already seen (sequential consistency), no
 * matter which replica answers.
 *
 * The lifecycle of one request:
 *
 *   1. The Worker entry opens a session scope (`runWithD1Session`), seeded
 *      with the bookmark the client returned from its previous request.
 *   2. `sessionedD1()` wraps the raw `DB` binding so every statement
 *      drizzle prepares runs inside that request's single session.
 *   3. The Worker entry writes the session's closing bookmark back onto the
 *      response (`applyD1Bookmark`), so the next request picks up where this
 *      one left off.
 *
 * Requests that never touch D1 never open a session, and outside a session
 * scope (prerendering, scripts, unit tests) the wrapper is a pass-through to
 * the plain binding. The Sessions API is also a no-op on databases with read
 * replication turned off, so this is safe to deploy before — and independently
 * of — flipping the switch in the D1 dashboard.
 *
 * @see https://developers.cloudflare.com/d1/best-practices/read-replication/
 */

import { AsyncLocalStorage } from "node:async_hooks";

/** Header an API client can use to carry a bookmark across requests. */
export const D1_BOOKMARK_HEADER = "x-d1-bookmark";

/** Cookie used to carry a bookmark across browser navigations. */
export const D1_BOOKMARK_COOKIE = "d1_bookmark";

/**
 * How long a returned bookmark stays useful. A bookmark only pins a *floor* on
 * the database version, so letting one expire costs a consistency guarantee,
 * never correctness — 15 minutes comfortably covers a browsing session while
 * keeping a long-idle tab from pinning its reads to an ancient version.
 */
const BOOKMARK_MAX_AGE_SECONDS = 900;

/**
 * Bookmarks are opaque strings minted by D1 (`<hex>-<hex>-<hex>-<hex>`), but
 * they reach us from a client-controlled cookie or header, so anything not
 * shaped like one is dropped rather than handed to the binding.
 */
const BOOKMARK_PATTERN = /^[0-9a-zA-Z_-]{1,255}$/;

/** Start the session anywhere — the first query may be served by any replica. */
export const FIRST_UNCONSTRAINED = "first-unconstrained";

/** Start the session on the primary — the first query sees the latest version. */
export const FIRST_PRIMARY = "first-primary";

/**
 * `D1_SESSION_MODE` (a plain Worker variable, so it can be changed in the
 * dashboard without a redeploy) overrides the per-request choice below:
 *
 *   auto (default)  bookmark if the client has one, else the primary for
 *                   writes and any replica for reads
 *   primary         always start on the primary — replicas still serve, but
 *                   only from the latest version
 *   unconstrained   always start anywhere — lowest latency, weakest freshness
 *   off             bypass the Sessions API entirely (rollback switch)
 */
export type D1SessionMode = "auto" | "primary" | "unconstrained" | "off";

/**
 * The slice of the D1 surface this module touches, declared structurally so
 * the module does not depend on which `@cloudflare/workers-types` happen to be
 * in scope. `sessionedD1()` preserves its argument's real type for callers.
 */
interface D1Meta {
  served_by_region?: string;
  served_by_primary?: boolean;
}

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first(colName?: string): Promise<unknown>;
  run(): Promise<{ meta?: D1Meta }>;
  all(): Promise<{ meta?: D1Meta }>;
  raw(options?: unknown): Promise<unknown>;
}

interface D1SessionLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<{ meta?: D1Meta }[]>;
  getBookmark(): string | null;
}

interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<{ meta?: D1Meta }[]>;
  withSession?(constraintOrBookmark?: string): D1SessionLike;
}

/**
 * Back-reference from a tracked statement to the real D1 statement. `batch()`
 * is handed the statements `prepare()` returned, and the runtime only accepts
 * its own objects there, so they are unwrapped on the way through.
 */
const NATIVE_STATEMENT = Symbol("d1.nativeStatement");

interface TrackedStatement extends D1StatementLike {
  [NATIVE_STATEMENT]: D1StatementLike;
}

interface D1SessionScope {
  /** Bookmark or constraint this request's sessions start from. */
  start: string;
  /** Sessions API disabled for this request (`D1_SESSION_MODE=off`). */
  bypass: boolean;
  /** Created on first use and keyed by binding, so one scope can span bindings. */
  sessions: Map<D1DatabaseLike, D1SessionLike>;
  /** `meta` of the most recent query, for the replica-routing debug headers. */
  lastMeta?: D1Meta;
}

const scopeStorage = new AsyncLocalStorage<D1SessionScope>();

/** A bookmark from the untrusted client, or null if missing or malformed. */
function readClientBookmark(request: Request): string | null {
  const header = request.headers.get(D1_BOOKMARK_HEADER);
  if (header && BOOKMARK_PATTERN.test(header)) return header;

  const cookies = request.headers.get("cookie");
  if (!cookies) return null;
  for (const pair of cookies.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() !== D1_BOOKMARK_COOKIE) continue;
    const value = decodeURIComponent(pair.slice(eq + 1).trim());
    return BOOKMARK_PATTERN.test(value) ? value : null;
  }
  return null;
}

/**
 * Where this request's session should start. A bookmark always wins: it is
 * both the fastest option (any replica that has caught up can answer it) and
 * the strictest one (never older than what this client already saw). Without
 * one, mutations start on the primary so a handler that writes and then reads
 * back cannot miss its own write, and plain reads start anywhere.
 */
function resolveStart(request: Request, mode: D1SessionMode): string {
  if (mode === "primary") return FIRST_PRIMARY;
  if (mode === "unconstrained") return FIRST_UNCONSTRAINED;

  const bookmark = readClientBookmark(request);
  if (bookmark) return bookmark;

  const method = request.method.toUpperCase();
  return method === "GET" || method === "HEAD" ? FIRST_UNCONSTRAINED : FIRST_PRIMARY;
}

function normalizeMode(raw: unknown): D1SessionMode {
  return raw === "primary" || raw === "unconstrained" || raw === "off" ? raw : "auto";
}

/**
 * Open a D1 session scope for the duration of `fn`. Everything the request
 * does through `sessionedD1()` — in any handler, on any binding — shares one
 * session and therefore one consistent view of the database.
 */
export function runWithD1Session<T>(request: Request, mode: unknown, fn: () => T): T {
  const resolved = normalizeMode(mode);
  return scopeStorage.run(
    { start: resolveStart(request, resolved), bypass: resolved === "off", sessions: new Map() },
    fn,
  );
}

/**
 * Open a session scope outside of a request — background jobs, which have no
 * client bookmark to resume from and generally write.
 */
export function runWithPrimaryD1Session<T>(fn: () => T): T {
  return scopeStorage.run({ start: FIRST_PRIMARY, bypass: false, sessions: new Map() }, fn);
}

function currentTarget(binding: D1DatabaseLike): D1DatabaseLike | D1SessionLike {
  const scope = scopeStorage.getStore();
  if (!scope || scope.bypass || typeof binding.withSession !== "function") return binding;

  let session = scope.sessions.get(binding);
  if (!session) {
    session = binding.withSession(scope.start);
    scope.sessions.set(binding, session);
  }
  return session;
}

function record(scope: D1SessionScope | undefined, meta: D1Meta | undefined) {
  if (scope && meta) scope.lastMeta = meta;
}

/**
 * Re-expose a prepared statement so the `meta` D1 attaches to every remote
 * query — including the region that served it — reaches `getD1ReplicaInfo()`.
 * `bind()` returns a fresh statement, so the result is re-wrapped.
 */
function trackStatement(statement: D1StatementLike, scope: D1SessionScope | undefined): TrackedStatement {
  return {
    [NATIVE_STATEMENT]: statement,
    bind: (...values: unknown[]) => trackStatement(statement.bind(...values), scope),
    first: (colName?: string) => statement.first(colName),
    raw: (options?: unknown) => statement.raw(options),
    run: async () => {
      const result = await statement.run();
      record(scope, result?.meta);
      return result;
    },
    all: async () => {
      const result = await statement.all();
      record(scope, result?.meta);
      return result;
    },
  };
}

function unwrapStatement(statement: D1StatementLike): D1StatementLike {
  return (statement as TrackedStatement)[NATIVE_STATEMENT] ?? statement;
}

/**
 * Wrap a D1 binding so its queries run inside the current request's session.
 *
 * The wrapper is stable — it resolves the session per *call*, not once at
 * construction — so a driver built over it and cached at module scope
 * (drizzle, for instance) keeps working while each request still gets its own
 * session. Methods this module does not intercept (`dump`, `exec`,
 * `withSession`) fall through to the binding. Returns the binding's own type,
 * so call sites need no cast.
 */
export function sessionedD1<T>(binding: T): T {
  const raw = binding as unknown as D1DatabaseLike;

  const overrides: D1DatabaseLike = {
    prepare(query: string) {
      const scope = scopeStorage.getStore();
      return trackStatement(currentTarget(raw).prepare(query), scope);
    },
    async batch(statements: D1StatementLike[]) {
      const scope = scopeStorage.getStore();
      const results = await currentTarget(raw).batch(statements.map(unwrapStatement));
      record(scope, results?.[results.length - 1]?.meta);
      return results;
    },
  };

  return new Proxy(overrides, {
    get(target, property) {
      if (property in target) return Reflect.get(target, property);
      const value = (raw as unknown as Record<PropertyKey, unknown>)[property];
      return typeof value === "function" ? (value as CallableFunction).bind(raw) : value;
    },
  }) as unknown as T;
}

/**
 * The closing bookmark of this request's session, or null when the request
 * never queried D1 (a static asset, a cache hit) and so has nothing to hand
 * forward.
 */
export function getD1Bookmark(): string | null {
  const scope = scopeStorage.getStore();
  if (!scope) return null;
  for (const session of scope.sessions.values()) {
    const bookmark = session.getBookmark();
    if (bookmark) return bookmark;
  }
  return null;
}

/** Which D1 instance answered this request's last query, for diagnostics. */
export function getD1ReplicaInfo(): { region?: string; primary?: boolean } | null {
  const meta = scopeStorage.getStore()?.lastMeta;
  if (!meta) return null;
  return { region: meta.served_by_region, primary: meta.served_by_primary };
}

/**
 * Hand this request's bookmark back to the client so its next request resumes
 * from the same database version — as a header for API clients, as a cookie
 * for browser navigations. No-ops when D1 was not used, which is what keeps
 * the `Set-Cookie` off static and otherwise cacheable responses.
 *
 * Returns the response to send: headers are set in place where the response
 * allows it, and on a copy where it does not.
 */
export function applyD1Bookmark(response: Response, options?: { debug?: boolean }): Response {
  const bookmark = getD1Bookmark();
  if (!bookmark) return response;
  // A 101 cannot be reconstructed and carries no headers worth setting.
  if (response.status === 101) return response;

  let target = response;
  const set = () => {
    target.headers.set(D1_BOOKMARK_HEADER, bookmark);
    target.headers.append(
      "set-cookie",
      `${D1_BOOKMARK_COOKIE}=${encodeURIComponent(bookmark)}; Path=/; Max-Age=${BOOKMARK_MAX_AGE_SECONDS}; SameSite=Lax; Secure; HttpOnly`,
    );
    if (options?.debug) {
      const info = getD1ReplicaInfo();
      if (info?.region) target.headers.set("x-d1-served-by-region", info.region);
      if (info?.primary !== undefined) target.headers.set("x-d1-served-by-primary", String(info.primary));
    }
  };

  try {
    set();
  } catch {
    target = new Response(response.body, response);
    set();
  }
  return target;
}
