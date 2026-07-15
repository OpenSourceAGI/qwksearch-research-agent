/**
 * @file scraper-cloudflare.ts
 * @description Cloudflare Worker entry point for the Puppeteer rendering API.
 * Routes incoming requests to the Swagger UI, the OpenAPI JSON spec, or the
 * {@link BrowserDurableObject} that performs the actual page rendering.
 * Authentication is enforced here before any request is forwarded.
 *
 * Re-exports {@link BrowserDurableObject} so Cloudflare Wrangler can bind it
 * as a Durable Object class in `wrangler.toml`.
 */

import { parseRequestParams, authenticateRequest } from "./scraper-utils.js";
import type { Env } from "./scraper-utils.js";
import { serveSwagger, serveOpenAPI } from "./scraper-openapi.js";
import { handleLogin, handleFetchAsSession } from "./scraper-login.js";
export { BrowserDurableObject } from "./browser-durable-object.js";

/** Cloudflare Worker `fetch` handler with auth + routing logic. */
export default {
  /**
   * Handles all inbound HTTP requests.
   *
   * Routes:
   * - `GET /api/swagger` or `/swagger` → Swagger UI
   * - `GET /api/openapi.json` → OpenAPI JSON spec
   * - `GET|POST /api/render` or `/` → Puppeteer rendering via Durable Object
   *
   * @param request - Incoming Fetch request.
   * @param env - Cloudflare Worker environment bindings.
   * @returns HTTP response appropriate to the matched route.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/swagger" ||
      url.pathname === "/swagger"
    ) {
      return serveSwagger();
    }

    if (url.pathname === "/api/openapi.json") {
      return serveOpenAPI();
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      const authResult = await authenticateRequest(request, env, await parseRequestParams(request.clone()));
      if (!authResult.success) {
        return new Response(authResult.error, { status: 401 });
      }
      return handleLogin(request, env);
    }

    if (url.pathname === "/api/fetch" && request.method === "POST") {
      const authResult = await authenticateRequest(request, env, await parseRequestParams(request.clone()));
      if (!authResult.success) {
        return new Response(authResult.error, { status: 401 });
      }
      return handleFetchAsSession(request, env);
    }

    if (url.pathname !== "/api/render" && url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    const params = await parseRequestParams(request);

    const authResult = await authenticateRequest(request, env, params);
    if (!authResult.success) {
      return new Response(authResult.error, {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="API"' },
      });
    }

    if (!params.url) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const id = env.BROWSER_DO.idFromName(
      `browser-${params.sessionId ?? "default"}`,
    );
    const browserDO = env.BROWSER_DO.get(id);

    return browserDO.fetch(request);
  },
};
