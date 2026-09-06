/**
 * @fileoverview CORS helpers for the small set of public, unauthenticated
 * agent API routes (search, chat, discover, autocomplete, suggestions,
 * providers, test-models) that external sites embed research-agent-ui
 * against directly from the browser instead of iframing qwksearch.com.
 * Everything else (chats, messages, uploads, auth, admin) stays same-origin
 * only, so this allowlist deliberately isn't wired into research-agent-ui's
 * shared handler factories — it's a deployment-specific policy for this app.
 */

const ALLOWED_ORIGINS = new Set([
  "https://debate-ai.com",
  "https://www.debate-ai.com",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
]);

function resolveAllowOrigin(request: Request): string | null {
  // Optional chaining: some route tests call handlers with a minimal
  // `{ nextUrl, url }` mock (no `.headers`) since the handler itself never
  // read headers before. Treat that the same as a same-origin request.
  const origin = request.headers?.get("origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

/**
 * Wraps a route handler, adding `Access-Control-Allow-Origin` to its
 * response when the caller's origin is allowlisted. Same-origin requests
 * (no `Origin` header) pass through unchanged. Streams the original
 * response body through untouched, so this is safe to use on the streaming
 * `/api/agent/chat` route as well as plain JSON handlers.
 */
export function withCors<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response> | Response,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const response = await handler(request, ...args);
    const allowOrigin = resolveAllowOrigin(request);
    if (!allowOrigin) return response;

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowOrigin);
    headers.append("Vary", "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/** OPTIONS handler for CORS preflight on routes wrapped with `withCors`. */
export function corsPreflight(request: Request): Response {
  const allowOrigin = resolveAllowOrigin(request);
  if (!allowOrigin) return new Response(null, { status: 204 });

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    },
  });
}
