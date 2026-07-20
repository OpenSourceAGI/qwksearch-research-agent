/**
 * Multi-tenant connector server on OOMOL Cloud.
 *
 * This is a standalone Node.js Express server that manages OAuth credentials
 * and API key connections for your app's users. It's NOT for browser/client code.
 *
 * OOMOL handles everything server-side:
 * - OAuth apps & client secrets
 * - Credential vault (encrypted storage)
 * - Token refresh
 * - Provider API calls
 *
 * Your app's users link THEIR OWN accounts (Gmail, Slack, GitHub, ...) via
 * ProjectConnector — similar to Composio or Pipedream's "managed auth" model.
 *
 * @fileoverview OOMOL SaaS Connector Server
 * @module connectors/server
 *
 * Setup:
 *   1. Create a project in the OOMOL console and copy its API key (oo_proj_...).
 *   2. Set OOMOL_PROJECT_API_KEY=oo_proj_... and run:
 *      ```bash
 *      cd packages/agent-toolkit/src/connectors
 *      npm install
 *      npm start
 *      ```
 *
 * Environment variables:
 *   - OOMOL_PROJECT_API_KEY: Your OOMOL project API key (required)
 *   - PORT: Server port (default: 8787)
 *   - APP_ORIGIN: Your app's origin for OAuth redirect (default: http://localhost:8787)
 *
 * API Endpoints:
 *   GET    /api/catalog             - List/search providers
 *   POST   /api/connections         - Start OAuth or API-key connection
 *   GET    /api/connections/requests/:id - Poll OAuth status
 *   POST   /api/actions/:actionId   - Execute a provider action
 *   GET    /connected               - OAuth redirect landing page
 *
 * SECURITY: externalUserId = your app's own user id (from auth/session layer).
 * NEVER let the client pick another user's id — derive it server-side from
 * the authenticated session.
 */

import express, { Request, Response, NextFunction } from "express";
import { readFile } from "node:fs/promises";
import { ConnectorError, ProjectConnector } from "@oomol-lab/connector";
import { catalog } from "./index.js";

const PORT = process.env.PORT ?? 8787;
const APP_ORIGIN = process.env.APP_ORIGIN ?? `http://localhost:${PORT}`;

const project = new ProjectConnector({
  apiKey: process.env.OOMOL_PROJECT_API_KEY ?? "oo_proj_missing",
  // baseUrl defaults to OOMOL Cloud: https://connector.oomol.com/v1
});

// Build a Map for fast service lookup
const byService = new Map(catalog.map((p) => [p.service, p]));

const app = express();
app.use(express.json());

// DEMO ONLY: replace with your real session auth. Everything below trusts req.userId.
// In production, use middleware like passport, express-session, or JWT.
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).userId = req.get("x-user-id") ?? "demo_user";
  next();
});

/**
 * GET /api/catalog
 * Provider catalog for your "add a connection" picker.
 * @query q Search term (optional, case-insensitive)
 * @query limit Max results (default: 100)
 */
app.get("/api/catalog", (req: Request, res: Response) => {
  const q = (req.query.q ?? "").toString().toLowerCase();
  const list = q
    ? catalog.filter(
        (p) =>
          p.service.includes(q) || p.displayName.toLowerCase().includes(q)
      )
    : catalog;
  res.json(list.slice(0, Number(req.query.limit ?? 100)));
});

/**
 * POST /api/connections
 * Start a connection for the logged-in user.
 *
 * OAuth providers: returns { pending: true, authorizationUrl, requestId }
 * → redirect the user to authorizationUrl, then poll /api/connections/requests/:id
 *
 * API-key or custom credential: pass { apiKey } or { values }
 * → returns { pending: false, connectedAccountId, status, available }
 *
 * @body service The provider service ID (e.g., "gmail", "slack")
 * @body connectionName Optional friendly name for this connection
 * @body apiKey Optional API key (for api_key auth providers)
 * @body values Optional custom credential values object
 */
app.post("/api/connections", async (req: Request, res: Response) => {
  const { service, connectionName, apiKey, values } = req.body ?? {};
  const provider = byService.get(service);
  if (!provider)
    return res.status(404).json({ error: "unknown_service", service });

  const userId = (req as any).userId;
  const user = project.forUser(userId);
  try {
    if (provider.authTypes.includes("oauth2") && !apiKey && !values) {
      const request = await user.connect.oauth({
        service,
        connectionName,
        returnUri: `${APP_ORIGIN}/connected?service=${encodeURIComponent(service)}`,
      });
      // Redirect your user to authorizationUrl; poll GET /api/connections/requests/:id after.
      return res.json({
        pending: true,
        requestId: request.id,
        authorizationUrl: request.authorizationUrl,
        status: request.status,
      });
    }
    const account = apiKey
      ? await user.connect.apiKey({ service, apiKey, connectionName })
      : await user.connect.customCredential({
          service,
          values: values ?? {},
          connectionName,
        });
    return res.json({
      pending: false,
      connectedAccountId: account.connectedAccountId,
      status: account.status,
      available: account.available,
    });
  } catch (err) {
    return sendConnectorError(res, err);
  }
});

/**
 * GET /api/connections/requests/:id
 * Poll an OAuth connection request until the user finishes authorizing.
 * @param id The request ID from POST /api/connections
 * @returns { status: "initiated" | "connected" | "failed" | "expired", ... }
 */
app.get("/api/connections/requests/:id", async (req: Request, res: Response) => {
  try {
    const request = await project.getConnectionRequest(req.params.id);
    res.json(request);
  } catch (err) {
    sendConnectorError(res, err);
  }
});

/**
 * POST /api/actions/:actionId
 * Run any catalog action as the logged-in user.
 * @param actionId The action ID (e.g., "gmail.search_threads")
 * @body input Input parameters for the action
 * @body connectionName Optional connection name to use (if user has multiple)
 * @returns { data, executionId, actionId, message }
 */
app.post("/api/actions/:actionId", async (req: Request, res: Response) => {
  const { input = {}, connectionName } = req.body ?? {};
  try {
    const userId = (req as any).userId;
    const out = await project
      .forUser(userId)
      .executeRaw(
        req.params.actionId,
        input,
        connectionName ? { connectionName } : undefined
      );
    res.json(out);
  } catch (err) {
    sendConnectorError(res, err);
  }
});

/**
 * GET /connected
 * Landing page: OOMOL redirects the user here after OAuth consent.
 * You can customize this to show a success message or redirect to your app.
 */
app.get("/connected", (req: Request, res: Response) => {
  res.send(
    `<p>${req.query.service ?? "Account"} connected — you can close this tab.</p>`
  );
});

/**
 * Handle OOMOL connector errors with proper HTTP status codes.
 */
function sendConnectorError(res: Response, err: unknown) {
  if (err instanceof ConnectorError) {
    // OOMOL error codes: provider_config_not_found, connection_alias_conflict,
    // app_not_ready, client_wait_timeout, etc.
    return res
      .status(err.status || 502)
      .json({ error: err.code, message: err.message });
  }
  console.error("Server error:", err);
  return res.status(500).json({ error: "internal_error" });
}

const server = app.listen(PORT, () => {
  console.log(
    `\n✓ OOMOL SaaS Connector server started on http://localhost:${PORT}`
  );
  console.log(
    `  Gateway: https://connector.oomol.com/v1 (OOMOL_PROJECT_API_KEY required)`
  );
  console.log(`  Environment: APP_ORIGIN=${APP_ORIGIN}\n`);
});

export { app, server };
