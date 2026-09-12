/**
 * @fileoverview Configuration for the first-load Cloudflare Turnstile gate.
 *
 * The gate is **opt-in and fail-open**: with no `TURNSTILE_SITE_KEY` /
 * `TURNSTILE_SECRET_KEY` set on the Worker, `resolveTurnstileConfig` returns
 * `null` and the Worker serves the app exactly as it did before. That keeps
 * local `vite dev`, preview deploys and the test suite unchallenged, and makes
 * the feature switchable from the Cloudflare dashboard alone — set the two
 * values to turn it on, set `TURNSTILE_ENABLED=false` to turn it back off
 * without deleting them.
 *
 * The site key is public (it ships in the challenge page's HTML); the secret
 * key is server-only. It is used for two things: calling Cloudflare's
 * siteverify endpoint, and as the HMAC key that signs the "this browser passed"
 * cookie — so no *second* secret has to be provisioned for the gate to be
 * tamper-proof. See `session.ts`.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/
 */

/** The subset of Worker bindings this feature reads. */
export interface TurnstileEnv {
  /** Public Turnstile site key, rendered into the challenge page. */
  TURNSTILE_SITE_KEY?: string;
  /** Turnstile secret key — siteverify + the cookie's HMAC key. Never sent to the browser. */
  TURNSTILE_SECRET_KEY?: string;
  /** Set to "false"/"0"/"off" to disable the gate while keeping the keys in place. */
  TURNSTILE_ENABLED?: string;
  /** How long one pass is good for, in seconds. Default 7 days. */
  TURNSTILE_TTL_SECONDS?: string;
  /** Optional cookie `Domain=`, e.g. `.example.com` to share a pass across subdomains. */
  TURNSTILE_COOKIE_DOMAIN?: string;
}

export interface TurnstileConfig {
  siteKey: string;
  secretKey: string;
  ttlSeconds: number;
  cookieDomain?: string;
}

/** Where the challenge page POSTs its token. Must never itself be gated. */
export const TURNSTILE_VERIFY_PATH = "/__turnstile/verify";

/** Cloudflare's token validation endpoint. */
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** One week: long enough that a returning reader is only ever challenged once. */
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;

const FALSEY = new Set(["false", "0", "off", "no", "disabled"]);

/**
 * Reads the gate's configuration off the Worker environment, or returns `null`
 * when the gate should not run at all. Callers treat `null` as "pass every
 * request straight through" — a missing key must never mean a locked-out site.
 */
export function resolveTurnstileConfig(env: TurnstileEnv | undefined | null): TurnstileConfig | null {
  if (!env) return null;

  const enabled = env.TURNSTILE_ENABLED?.trim().toLowerCase();
  if (enabled && FALSEY.has(enabled)) return null;

  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey || !secretKey) return null;

  const cookieDomain = env.TURNSTILE_COOKIE_DOMAIN?.trim();

  return {
    siteKey,
    secretKey,
    ttlSeconds: resolveTtlSeconds(env.TURNSTILE_TTL_SECONDS),
    ...(cookieDomain ? { cookieDomain } : {}),
  };
}

/**
 * A dashboard-entered TTL is a string typed by a human, so anything unparseable
 * falls back to the default rather than producing a cookie that expires
 * immediately (`NaN` → always challenged) or never.
 */
function resolveTtlSeconds(raw: string | undefined): number {
  const parsed = Number.parseInt(raw?.trim() ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_SECONDS;
  return Math.min(Math.max(parsed, MIN_TTL_SECONDS), MAX_TTL_SECONDS);
}
