/**
 * Multi-tenant connector server on OOMOL Cloud (https://connector.oomol.com/v1).
 *
 * OOMOL hosts everything: OAuth apps, credential vault, token refresh, provider calls.
 * Each of YOUR app's users links THEIR OWN accounts (Gmail, Slack, GitHub, ...) via
 * ProjectConnector — the composio/pipedream "managed auth" model.
 *
 * Setup:
 *   1. Create a project in the OOMOL console and copy its API key (oo_proj_...).
 *   2. OOMOL_PROJECT_API_KEY=oo_proj_... npm start
 *
 * externalUserId = your app's own user id (from your auth/session layer). NEVER let the
 * client pick another user's id — derive it server-side from the authenticated session.
 */
import express from "express";
import { readFile } from "node:fs/promises";
import { ConnectorError, ProjectConnector } from "@oomol-lab/connector";

const PORT = process.env.PORT ?? 8787;
const APP_ORIGIN = process.env.APP_ORIGIN ?? `http://localhost:${PORT}`;

const project = new ProjectConnector({
  apiKey: process.env.OOMOL_PROJECT_API_KEY ?? "oo_proj_missing",
  // baseUrl defaults to OOMOL Cloud: https://connector.oomol.com/v1
});

const catalog = JSON.parse(await readFile(new URL("./catalog.json", import.meta.url), "utf8"));
const byService = new Map(catalog.map((p) => [p.service, p]));

const app = express();
app.use(express.json());

// DEMO ONLY: replace with your real session auth. Everything below trusts req.userId.
app.use((req, _res, next) => {
  req.userId = req.get("x-user-id") ?? "demo_user";
  next();
});

/** Provider catalog for your "add a connection" picker. */
app.get("/api/catalog", (req, res) => {
  const q = (req.query.q ?? "").toString().toLowerCase();
  const list = q
    ? catalog.filter((p) => p.service.includes(q) || p.displayName.toLowerCase().includes(q))
    : catalog;
  res.json(list.slice(0, Number(req.query.limit ?? 100)));
});

/**
 * Start a connection for the logged-in user.
 * OAuth providers  -> returns { authorizationUrl, requestId } — redirect the user there.
 * API-key/custom   -> pass { apiKey } or { values } — connects synchronously.
 */
app.post("/api/connections", async (req, res) => {
  const { service, connectionName, apiKey, values } = req.body ?? {};
  const provider = byService.get(service);
  if (!provider) return res.status(404).json({ error: "unknown_service", service });

  const user = project.forUser(req.userId);
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
      : await user.connect.customCredential({ service, values: values ?? {}, connectionName });
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

/** Poll an OAuth connection request until the user finishes authorizing. */
app.get("/api/connections/requests/:id", async (req, res) => {
  try {
    const request = await project.getConnectionRequest(req.params.id);
    res.json(request); // status: initiated | connected | failed | expired
  } catch (err) {
    sendConnectorError(res, err);
  }
});

/** Run any catalog action as the logged-in user (e.g. "gmail.search_threads"). */
app.post("/api/actions/:actionId", async (req, res) => {
  const { input = {}, connectionName } = req.body ?? {};
  try {
    const out = await project
      .forUser(req.userId)
      .executeRaw(req.params.actionId, input, connectionName ? { connectionName } : undefined);
    res.json(out); // { data, executionId, actionId, message }
  } catch (err) {
    sendConnectorError(res, err);
  }
});

/** Landing page OOMOL returns the user to after OAuth consent. */
app.get("/connected", (req, res) => {
  res.send(`<p>${req.query.service ?? "Account"} connected — you can close this tab.</p>`);
});

function sendConnectorError(res, err) {
  if (err instanceof ConnectorError) {
    // e.g. provider_config_not_found, connection_alias_conflict, app_not_ready, client_wait_timeout
    return res.status(err.status || 502).json({ error: err.code, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "internal_error" });
}

app.listen(PORT, () => console.log(`OOMOL SaaS connector server on :${PORT} (gateway: connector.oomol.com)`));
