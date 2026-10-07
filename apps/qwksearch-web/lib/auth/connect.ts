/**
 * @fileoverview "Sign in with QwkSearch" — the OAuth-style connect flow that
 * lets a site embedding the QwkSearch research agent (debate-ai.com first)
 * link a visitor's QwkSearch account and receive that account's API key.
 *
 * The flow is the OAuth 2.0 authorization-code grant with PKCE, trimmed to
 * what a handful of first-party partner sites need:
 *
 *   1. The partner's server makes a PKCE verifier, keeps it (a cookie), and
 *      sends the browser to `/connect?redirect_uri=…&state=…&code_challenge=…`.
 *   2. `/connect` signs the visitor in to QwkSearch if they aren't already and
 *      asks them to approve the link.
 *   3. Approving POSTs to `/api/connect/authorize`, which redirects back to
 *      `redirect_uri?code=…&state=…`.
 *   4. The partner's server POSTs the code and the verifier to
 *      `/api/connect/token` and receives the user's API key, profile and plan.
 *
 * Partners are not registered in the database: a redirect URI is accepted
 * when its origin is on the allowlist below (plus `QWKSEARCH_CONNECT_ORIGINS`).
 * The code is stateless — an HMAC-signed, two-minute envelope binding the
 * user, the redirect URI and the PKCE challenge — so no table is needed. It is
 * not single-use; PKCE is what keeps a leaked code worthless, because only
 * the server that started the flow holds the verifier.
 *
 * Everything here is pure (Web Crypto only) so it runs on Workers and in
 * tests alike.
 */

/** How long an authorization code stays redeemable, in seconds. */
export const CONNECT_CODE_TTL_SECONDS = 120;

/** Partner origins accepted out of the box. Globs match one subdomain level or more. */
export const DEFAULT_CONNECT_ORIGINS = [
  "https://debate-ai.com",
  "https://*.debate-ai.com",
  "http://localhost:*",
];

/** Display names for known partners, keyed by registrable host. */
const KNOWN_CLIENTS: Record<string, string> = {
  "debate-ai.com": "Debate AI",
};

export interface ConnectClient {
  /** Origin the user will be sent back to. */
  origin: string;
  /** Human-readable name shown on the consent screen. */
  name: string;
}

/** Origins allowed as `redirect_uri` targets: the defaults plus any from the env. */
export function connectAllowedOrigins(env: string | undefined = process.env.QWKSEARCH_CONNECT_ORIGINS): string[] {
  const extra = (env ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...DEFAULT_CONNECT_ORIGINS, ...extra];
}

function originMatches(origin: string, pattern: string): boolean {
  if (!pattern.includes("*")) return origin === pattern;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[A-Za-z0-9.-]+");
  return new RegExp(`^${escaped}$`).test(origin);
}

/**
 * Validates a `redirect_uri` and describes the partner it belongs to, or
 * returns null when the URI may not receive a code. Only http(s) URLs whose
 * origin is allowlisted pass; plain http is accepted for localhost alone.
 */
export function resolveConnectClient(
  redirectUri: string | null | undefined,
  allowed: string[] = connectAllowedOrigins(),
): ConnectClient | null {
  if (!redirectUri) return null;
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return null;
  if (!allowed.some((pattern) => originMatches(url.origin, pattern))) return null;

  const host = url.hostname;
  const known = Object.keys(KNOWN_CLIENTS).find((domain) => host === domain || host.endsWith(`.${domain}`));
  return { origin: url.origin, name: known ? KNOWN_CLIENTS[known] : host };
}

/** Appends query parameters to a redirect URI, preserving any it already has. */
export function withQuery(base: string, params: Record<string, string | undefined | null>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Encoding + crypto helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** The PKCE S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/** RFC 7636 §4.1: 43–128 characters from the unreserved set. */
export function isValidPkceValue(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export interface ConnectCodePayload {
  /** QwkSearch user id the code was issued for. */
  uid: string;
  /** The exact redirect URI the code was sent to. */
  redirectUri: string;
  /** PKCE S256 challenge the token request must satisfy. */
  challenge: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
}

/** Issues a signed authorization code. `now` is in milliseconds. */
export async function signConnectCode(
  payload: Omit<ConnectCodePayload, "exp">,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const body: ConnectCodePayload = { ...payload, exp: Math.floor(now / 1000) + CONNECT_CODE_TTL_SECONDS };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(body)));
  const signature = base64UrlEncode(await hmac(secret, `connect.${encoded}`));
  return `${encoded}.${signature}`;
}

/** Verifies a code's signature and expiry; returns its payload or null. */
export async function verifyConnectCode(
  code: string | null | undefined,
  secret: string,
  now: number = Date.now(),
): Promise<ConnectCodePayload | null> {
  if (!code || typeof code !== "string") return null;
  const [encoded, signature, ...rest] = code.split(".");
  if (!encoded || !signature || rest.length) return null;
  const given = base64UrlDecode(signature);
  if (!given || !timingSafeEqual(given, await hmac(secret, `connect.${encoded}`))) return null;

  const raw = base64UrlDecode(encoded);
  if (!raw) return null;
  let payload: ConnectCodePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (
    typeof payload?.uid !== "string" ||
    typeof payload.redirectUri !== "string" ||
    typeof payload.challenge !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp < Math.floor(now / 1000)) return null;
  return payload;
}

export type ConnectExchangeError =
  | "invalid_request"
  | "invalid_grant";

/**
 * Checks a token request against its code: signature, expiry, the redirect
 * URI it was issued for, and the PKCE verifier. Returns the user id on success.
 */
export async function redeemConnectCode(
  input: { code?: unknown; redirectUri?: unknown; codeVerifier?: unknown },
  secret: string,
  now: number = Date.now(),
): Promise<{ ok: true; uid: string } | { ok: false; error: ConnectExchangeError }> {
  const { code, redirectUri, codeVerifier } = input;
  if (typeof code !== "string" || typeof redirectUri !== "string" || !isValidPkceValue(codeVerifier as string)) {
    return { ok: false, error: "invalid_request" };
  }
  const payload = await verifyConnectCode(code, secret, now);
  if (!payload || payload.redirectUri !== redirectUri) return { ok: false, error: "invalid_grant" };
  if ((await pkceChallenge(codeVerifier as string)) !== payload.challenge) {
    return { ok: false, error: "invalid_grant" };
  }
  return { ok: true, uid: payload.uid };
}

/** The signing secret: the same one better-auth signs its cookies with. */
export function connectSecret(): string | undefined {
  return process.env.QWKSEARCH_CONNECT_SECRET || process.env.BETTER_AUTH_SECRET || undefined;
}

/** A fresh API key in the format `/api/user` issues. */
export function newApiKey(): string {
  return `qwk_${crypto.randomUUID().replace(/-/g, "")}`;
}
