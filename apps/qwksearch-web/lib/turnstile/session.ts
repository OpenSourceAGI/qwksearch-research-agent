/**
 * @fileoverview The "this browser already passed" cookie.
 *
 * Rendering the Turnstile widget is not protection, and neither is a cookie
 * that merely *says* `verified=1` — a bot can set that with one `document.cookie`
 * write, or one `curl -b`. So the pass this module mints is an HMAC-SHA-256
 * token over its own expiry and a random nonce, keyed by `TURNSTILE_SECRET_KEY`
 * (which never leaves the Worker):
 *
 *     v1.<expiry-unix-seconds>.<nonce>.<base64url HMAC of "v1.<expiry>.<nonce>">
 *
 * Forging one requires the secret; replaying one is bounded by the expiry; and
 * verification is a single WebCrypto call with no storage behind it, so the
 * happy path — every request after the first — costs no KV read and no D1 query.
 *
 * A KV- or Durable-Object-backed session would additionally allow *revoking* an
 * individual pass. That is deliberately not built: this gate exists to stop
 * cheap unattended scraping of a first page load, not to carry a security
 * boundary, and the app's real authentication is untouched by it.
 */

const TOKEN_VERSION = "v1";
const NONCE_BYTES = 16;

/**
 * WebCrypto key import is not free, and one Worker isolate serves many
 * requests with the same secret, so the derived key is memoised per secret
 * string rather than re-imported per request.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    keyCache.set(secret, key);
  }
  return key;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Mints a pass valid for `ttlSeconds` from now.
 *
 * @param nowSeconds injectable clock, so the tests can assert expiry without
 *   waiting a week for one.
 */
export async function mintPassToken(
  secret: string,
  ttlSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const expiry = nowSeconds + ttlSeconds;
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));
  const payload = `${TOKEN_VERSION}.${expiry}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${base64UrlEncode(signature)}`;
}

/**
 * True only for a token this Worker signed, that is not past its expiry and
 * whose signature covers the very expiry being checked.
 *
 * The comparison goes through `crypto.subtle.verify` rather than `===` so a
 * forged signature cannot be recovered byte-by-byte from response timing.
 */
export async function verifyPassToken(
  secret: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [version, expiryRaw, nonce, signatureRaw] = parts;
  if (version !== TOKEN_VERSION || !nonce) return false;

  const expiry = Number.parseInt(expiryRaw, 10);
  if (!Number.isFinite(expiry) || expiry <= nowSeconds) return false;

  const signature = base64UrlDecode(signatureRaw);
  if (!signature) return false;

  const payload = new TextEncoder().encode(`${version}.${expiryRaw}.${nonce}`);
  try {
    // `signature` is a Uint8Array view; pass its backing buffer slice so the
    // runtime never sees a detached or over-long BufferSource.
    return await crypto.subtle.verify("HMAC", await hmacKey(secret), signature as unknown as BufferSource, payload);
  } catch {
    return false;
  }
}

/** Reads one cookie out of a request's `Cookie` header. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(pair.slice(index + 1).trim());
  }
  return null;
}

/**
 * Builds the `Set-Cookie` value for a freshly minted pass.
 *
 * `HttpOnly` keeps it away from page scripts, `SameSite=Lax` lets it ride a
 * top-level navigation in from a search result (which is exactly the first load
 * being protected) while staying off cross-site subresource requests, and
 * `Secure` is attached on https only so a plain-http local dev server can still
 * complete the flow.
 */
export function buildPassCookie(options: {
  name: string;
  token: string;
  ttlSeconds: number;
  secure: boolean;
  domain?: string;
}): string {
  const attributes = [
    `${options.name}=${options.token}`,
    "Path=/",
    `Max-Age=${options.ttlSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.domain) attributes.push(`Domain=${options.domain}`);
  if (options.secure) attributes.push("Secure");
  return attributes.join("; ");
}
