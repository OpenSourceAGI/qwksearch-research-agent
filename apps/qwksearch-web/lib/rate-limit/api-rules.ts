/**
 * @fileoverview The `/api/*` rate limiter's settings and how they decide which
 * limit a path gets. Pure: no database, no request — so the admin page can run
 * the same matcher in the browser to show which rule a path falls under.
 *
 * Storage is in `./api-settings.ts`; counting and the 429 are in
 * `./api-limiter.ts`.
 */

export type RateLimitOverride = {
  /** Path pattern. `*` matches anything; a trailing `/*` also matches the bare path. */
  pattern: string;
  limit: number;
  windowSeconds: number;
};

export type ApiRateLimitSettings = {
  enabled: boolean;
  requestsPerWindow: number;
  windowSeconds: number;
  /** First match wins; each override counts in its own bucket. */
  overrides: RateLimitOverride[];
  /** One pattern per line. Matching requests are never counted. */
  exemptPaths: string;
};

/**
 * Exempt by default:
 * - `/api/auth/*` — Better Auth limits its own sign-in routes, `get-session`
 *   is polled on every page, and Stripe's webhook arrives there.
 * - `/api/admin/*` — so a limit set too tight cannot lock the admin out of the
 *   page that loosens it.
 * - `/api/collaboration/*` — called by the Hocuspocus server, one IP speaking
 *   for every editor in every room.
 */
export const DEFAULT_EXEMPT_PATHS = ["/api/auth/*", "/api/admin/*", "/api/collaboration/*"];

export const DEFAULT_API_RATE_LIMIT_SETTINGS: ApiRateLimitSettings = {
  enabled: true,
  // About five a second, sustained for a minute: no person clicking through
  // the app gets near it (a page load is a handful of calls), and a script
  // hammering the API hits it inside a minute.
  requestsPerWindow: 300,
  windowSeconds: 60,
  // The routes that spend money per call — a model, a scraper, speech — get
  // their own, tighter bucket.
  overrides: [
    { pattern: "/api/agent/chat", limit: 30, windowSeconds: 60 },
    { pattern: "/api/speech/*", limit: 30, windowSeconds: 60 },
    { pattern: "/api/scraper", limit: 60, windowSeconds: 60 },
  ],
  exemptPaths: DEFAULT_EXEMPT_PATHS.join("\n"),
};

export const RATE_LIMIT_BOUNDS = {
  limit: { min: 1, max: 1_000_000 },
  windowSeconds: { min: 1, max: 24 * 60 * 60 },
  overrides: 50,
  exemptPaths: 100,
  patternLength: 200,
} as const;

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

/**
 * A pattern we are willing to store, or null. Must be an absolute path; the
 * only special character is `*`. Whitespace is dropped rather than rejected
 * because it is never part of a real route.
 */
export function normalizePattern(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let pattern = raw.trim().replace(/\s+/g, "");
  if (!pattern) return null;
  if (!pattern.startsWith("/")) pattern = `/${pattern}`;
  pattern = pattern.replace(/\*+/g, "*");
  if (pattern.length > 1 && pattern.endsWith("/")) pattern = pattern.slice(0, -1);
  if (pattern.length > RATE_LIMIT_BOUNDS.patternLength) return null;
  return pattern;
}

function parseOverrides(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeOverrides(
  raw: unknown,
  fallback: RateLimitOverride[],
  defaultWindowSeconds: number,
): RateLimitOverride[] {
  const list = parseOverrides(raw);
  if (!list) return fallback.map((o) => ({ ...o }));

  const seen = new Set<string>();
  const out: RateLimitOverride[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const pattern = normalizePattern(entry.pattern);
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);
    out.push({
      pattern,
      limit: clampInt(entry.limit, 60, RATE_LIMIT_BOUNDS.limit.min, RATE_LIMIT_BOUNDS.limit.max),
      windowSeconds: clampInt(
        entry.windowSeconds,
        defaultWindowSeconds,
        RATE_LIMIT_BOUNDS.windowSeconds.min,
        RATE_LIMIT_BOUNDS.windowSeconds.max,
      ),
    });
    if (out.length >= RATE_LIMIT_BOUNDS.overrides) break;
  }
  return out;
}

/** Parses the exempt list (newlines or commas) into patterns. */
export function parseExemptPaths(raw: unknown): string[] {
  const text = Array.isArray(raw) ? raw.join("\n") : typeof raw === "string" ? raw : "";
  const seen = new Set<string>();
  for (const part of text.split(/[\n,]/)) {
    const pattern = normalizePattern(part);
    if (pattern) seen.add(pattern);
    if (seen.size >= RATE_LIMIT_BOUNDS.exemptPaths) break;
  }
  return [...seen];
}

/** Normalises a stored row or an admin's request body into settings we are willing to enforce. */
export function normalizeApiRateLimitSettings(
  input: Partial<Record<keyof ApiRateLimitSettings, unknown>> | null | undefined,
  base: ApiRateLimitSettings = DEFAULT_API_RATE_LIMIT_SETTINGS,
): ApiRateLimitSettings {
  const raw = input ?? {};
  const windowSeconds = clampInt(
    raw.windowSeconds,
    base.windowSeconds,
    RATE_LIMIT_BOUNDS.windowSeconds.min,
    RATE_LIMIT_BOUNDS.windowSeconds.max,
  );
  return {
    enabled: toBool(raw.enabled, base.enabled),
    requestsPerWindow: clampInt(
      raw.requestsPerWindow,
      base.requestsPerWindow,
      RATE_LIMIT_BOUNDS.limit.min,
      RATE_LIMIT_BOUNDS.limit.max,
    ),
    windowSeconds,
    overrides:
      raw.overrides === undefined
        ? base.overrides.map((o) => ({ ...o }))
        : normalizeOverrides(raw.overrides, base.overrides, windowSeconds),
    // Stored back in canonical form, one per line, so the admin field shows
    // exactly what is enforced.
    exemptPaths:
      raw.exemptPaths === undefined
        ? base.exemptPaths
        : parseExemptPaths(raw.exemptPaths).join("\n"),
  };
}

const patternCache = new Map<string, RegExp>();

function patternToRegExp(pattern: string): RegExp {
  let re = patternCache.get(pattern);
  if (re) return re;
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  // `/api/speech/*` should also cover `/api/speech` itself.
  const body = pattern.endsWith("/*") ? `${escaped.slice(0, -3)}(?:/.*)?` : escaped;
  re = new RegExp(`^${body}$`);
  if (patternCache.size > 500) patternCache.clear();
  patternCache.set(pattern, re);
  return re;
}

/** Strips a trailing slash so `/api/scraper/` and `/api/scraper` count as one route. */
export function normalizeRequestPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function matchesPattern(pattern: string, pathname: string): boolean {
  return patternToRegExp(pattern).test(normalizeRequestPath(pathname));
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export type RateLimitRule =
  | { kind: "exempt"; pattern: string }
  | { kind: "default"; id: "default"; limit: number; windowSeconds: number }
  | { kind: "override"; id: string; pattern: string; limit: number; windowSeconds: number };

/**
 * Which rule governs a path: an exemption, the first matching override, or
 * the default. Returns null for anything outside `/api`, or when the limiter
 * is off — the caller lets those through uncounted.
 */
export function resolveRateLimitRule(
  settings: ApiRateLimitSettings,
  pathname: string,
): RateLimitRule | null {
  if (!settings.enabled || !isApiPath(pathname)) return null;

  for (const pattern of parseExemptPaths(settings.exemptPaths)) {
    if (matchesPattern(pattern, pathname)) return { kind: "exempt", pattern };
  }
  for (const override of settings.overrides) {
    if (matchesPattern(override.pattern, pathname)) {
      return {
        kind: "override",
        id: override.pattern,
        pattern: override.pattern,
        limit: override.limit,
        windowSeconds: override.windowSeconds,
      };
    }
  }
  return {
    kind: "default",
    id: "default",
    limit: settings.requestsPerWindow,
    windowSeconds: settings.windowSeconds,
  };
}
