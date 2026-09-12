/**
 * @fileoverview The first-load Cloudflare Turnstile gate.
 *
 * One call at the top of the Worker's `fetch`:
 *
 *     const gated = await handleTurnstileGate(request, env);
 *     if (gated) return gated;
 *
 * It returns a `Response` only when it has something of its own to serve — the
 * challenge page, or the result of the verification POST — and `null` for every
 * request the app should handle as usual, which is all of them once the visitor
 * holds a valid pass (and all of them always, when the feature is unconfigured).
 *
 * The flow:
 *
 *   1. A desktop browser asks for a page and carries no pass cookie.
 *   2. The Worker answers with the challenge page instead of the app.
 *   3. Turnstile solves in the browser and the page POSTs its token here.
 *   4. This Worker — not the browser — calls Cloudflare's siteverify endpoint
 *      with the secret key. A token is single-use and short-lived, and nothing
 *      is trusted until siteverify says `success`.
 *   5. A signed pass cookie is set and the visitor is redirected to where they
 *      were going. Subsequent loads skip all of the above.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/
 */

import {
  SITEVERIFY_URL,
  TURNSTILE_VERIFY_PATH,
  resolveTurnstileConfig,
  type TurnstileConfig,
  type TurnstileEnv,
} from "./config";
import { renderChallengePage } from "./challenge-page";
import { decideChallenge } from "./request-filter";
import { buildPassCookie, mintPassToken, readCookie, verifyPassToken } from "./session";

/** Name of the cookie carrying a verified pass. */
export const TURNSTILE_COOKIE_NAME = "qs_human";

interface SiteverifyResult {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Runs the gate for one request. Returns a `Response` to short-circuit with, or
 * `null` to let the app serve the request.
 */
export async function handleTurnstileGate(
  request: Request,
  env: TurnstileEnv | undefined | null,
): Promise<Response | null> {
  const config = resolveTurnstileConfig(env);
  if (!config) return null;

  const url = new URL(request.url);

  if (url.pathname === TURNSTILE_VERIFY_PATH) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
    }
    return handleVerification(request, url, config);
  }

  if (!decideChallenge(request, url).challenge) return null;

  if (await verifyPassToken(config.secretKey, readCookie(request, TURNSTILE_COOKIE_NAME))) {
    return null;
  }

  return renderChallengePage({
    siteKey: config.siteKey,
    redirectTo: safeRedirectTarget(`${url.pathname}${url.search}`),
    verifyPath: TURNSTILE_VERIFY_PATH,
  });
}

/** Handles the POST from the challenge page. */
async function handleVerification(request: Request, url: URL, config: TurnstileConfig): Promise<Response> {
  let token: string | null = null;
  let redirectTo = "/";

  try {
    const form = await request.formData();
    const rawToken = form.get("cf-turnstile-response");
    token = typeof rawToken === "string" ? rawToken : null;
    const rawRedirect = form.get("redirect");
    redirectTo = safeRedirectTarget(typeof rawRedirect === "string" ? rawRedirect : "/");
  } catch {
    // A body that is not form-encoded is not a browser submitting this page.
    return challengeAgain(config, redirectTo, "That submission could not be read. Please try again.", 400);
  }

  if (!token) {
    return challengeAgain(config, redirectTo, "The check did not complete. Please try again.", 400);
  }

  let result: SiteverifyResult;
  try {
    result = await callSiteverify(token, config.secretKey, request.headers.get("cf-connecting-ip"));
  } catch (error) {
    console.error("[turnstile] siteverify request failed", error);
    return challengeAgain(config, redirectTo, "We could not reach the verification service. Please try again.", 502);
  }

  if (!result.success) {
    console.warn("[turnstile] verification rejected", JSON.stringify({ codes: result["error-codes"] ?? [] }));
    return challengeAgain(config, redirectTo, "That check could not be verified. Please try again.", 403);
  }

  // Defence in depth: a token solved against some other site's widget must not
  // open this one. The comparison allows apex/subdomain pairs so a widget
  // registered for the apex still passes visitors on `www.`.
  if (result.hostname && !hostnamesMatch(result.hostname, url.hostname)) {
    console.warn(
      "[turnstile] hostname mismatch",
      JSON.stringify({ solvedFor: result.hostname, requested: url.hostname }),
    );
    return challengeAgain(config, redirectTo, "That check was issued for a different site. Please try again.", 403);
  }

  const pass = await mintPassToken(config.secretKey, config.ttlSeconds);
  return new Response(null, {
    status: 303,
    headers: {
      location: redirectTo,
      "set-cookie": buildPassCookie({
        name: TURNSTILE_COOKIE_NAME,
        token: pass,
        ttlSeconds: config.ttlSeconds,
        secure: url.protocol === "https:",
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
      }),
      "cache-control": "no-store",
    },
  });
}

/** POSTs the token to Cloudflare for validation. The secret never leaves here. */
async function callSiteverify(
  token: string,
  secret: string,
  remoteIp: string | null,
): Promise<SiteverifyResult> {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  const response = await fetch(SITEVERIFY_URL, { method: "POST", body });
  if (!response.ok) {
    throw new Error(`siteverify responded ${response.status}`);
  }
  return (await response.json()) as SiteverifyResult;
}

/** Re-serves the challenge page with an explanation after a failed attempt. */
function challengeAgain(config: TurnstileConfig, redirectTo: string, error: string, status: number): Response {
  return renderChallengePage({
    siteKey: config.siteKey,
    redirectTo,
    verifyPath: TURNSTILE_VERIFY_PATH,
    error,
    status,
  });
}

/**
 * Narrows a client-supplied redirect to a same-origin path, so the challenge
 * page can never be turned into an open redirect. Anything else lands on `/`.
 */
export function safeRedirectTarget(raw: string): string {
  if (!raw || raw.length > 2048) return "/";
  // Reject protocol-relative (`//evil.com`), backslash-smuggled (`/\evil.com`)
  // and control-character values outright rather than trying to repair them.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(raw)) return "/";
  if (raw === TURNSTILE_VERIFY_PATH) return "/";
  return raw;
}

/** True for identical hostnames, or an apex/subdomain pair. */
function hostnamesMatch(solvedFor: string, requested: string): boolean {
  const a = solvedFor.toLowerCase();
  const b = requested.toLowerCase();
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}
