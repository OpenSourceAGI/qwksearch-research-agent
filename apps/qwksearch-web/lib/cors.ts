/**
 * @fileoverview CORS helpers for the public agent API routes and web services.
 * Allows cross-origin requests from any site so external applications and browser clients
 * can access the search, agent, extraction, and research APIs.
 * Supports configurable API key enforcement when requireApiKey is enabled in site config.
 */

import { checkApiAuth } from "./auth/api-key";

export interface CorsOptions {
  skipApiKeyCheck?: boolean;
}

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD";
const ALLOWED_HEADERS =
  "Content-Type, Authorization, X-API-Key, x-api-key, X-Requested-With, Accept, Origin";

export function resolveAllowOrigin(request?: Request): string | null {
  if (!request) return null;
  // Optional chaining: some route tests call handlers with a minimal
  // `{ nextUrl, url }` mock (no `.headers`) or with no arguments.
  const origin = request.headers?.get?.("origin");
  return origin ? origin.trim() : null;
}

/**
 * Applies CORS headers to a response based on the request's origin.
 */
export function applyCorsHeaders(request: Request | undefined, response: Response): Response {
  if (!request || !response) return response;
  const allowOrigin = resolveAllowOrigin(request);
  if (!allowOrigin) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.append("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Wraps a route handler, adding CORS headers to its response for any cross-origin
 * request. Same-origin requests (no `Origin` header) pass through unchanged.
 * Streams the response body untouched (safe for SSE / streaming chat endpoints).
 * Enforces API key requirement if enabled in site config (unless skipApiKeyCheck is true).
 */
export function withCors<Args extends unknown[]>(
  handler: (request?: Request, ...args: Args) => Promise<Response> | Response,
  options?: CorsOptions,
) {
  return async (request?: Request, ...args: Args): Promise<Response> => {
    // If API key check is not skipped and request exists, check authorization
    if (request && !options?.skipApiKeyCheck) {
      const auth = await checkApiAuth(request);
      if (!auth.authorized) {
        const errorRes =
          auth.response ||
          new Response(
            JSON.stringify({
              error: "Unauthorized",
              message: "API key is required",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        return applyCorsHeaders(request, errorRes);
      }
    }

    const response = await handler(request, ...args);
    return applyCorsHeaders(request, response);
  };
}

/** OPTIONS handler for CORS preflight on routes wrapped with `withCors`. */
export function corsPreflight(request?: Request): Response {
  const allowOrigin = (request && resolveAllowOrigin(request)) || "*";

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
