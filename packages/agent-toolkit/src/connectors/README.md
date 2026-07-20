# OpenConnector Integration

Multi-tenant OAuth & credential management for your agent toolkit. Securely link 900+ external services (Gmail, Slack, GitHub, Airtable, Stripe, etc.) on behalf of your users.

Built on [OOMOL Cloud](https://connector.oomol.com) — OAuth apps, token refresh, and credential vault managed by OOMOL, not your infrastructure.

## Quick Start

### As a Client (Importing from agent-toolkit)

```typescript
import {
  ProjectConnector,
  catalog,
  searchCatalog,
  getCatalogByAuthType,
} from "chat-agent-toolkit/connectors";

// Search available providers
const gmailProviders = searchCatalog("gmail");
const oauthProviders = getCatalogByAuthType("oauth2");

console.log(oauthProviders.slice(0, 5).map((p) => p.displayName));
// → ["Airtable", "Calendly", "Discord", "Dropbox", "Gmail"]
```

### As a Server Runtime (Running the connector server)

```bash
cd packages/agent-toolkit/src/connectors

# Install dependencies
npm install

# Start the server
OOMOL_PROJECT_API_KEY=oo_proj_... npm start

# Server runs on http://localhost:8787
```

Then make API calls from your frontend:

```typescript
// POST /api/connections (start OAuth for Gmail)
const response = await fetch("http://localhost:8787/api/connections", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    service: "gmail",
    connectionName: "My Work Email",
  }),
});

const { authorizationUrl, requestId } = await response.json();
// Redirect user to authorizationUrl
// Then poll GET /api/connections/requests/{requestId} until connected
```

## Module Exports

### Utilities

```typescript
import {
  // Re-exported from @oomol-lab/connector
  ProjectConnector,
  ConnectorError,

  // Catalog data
  catalog,           // Basic provider info (900+ entries)
  providerIndex,     // Detailed provider info with action lists

  // Search & filter functions
  searchCatalog,
  getCatalogProvider,
  getProviderDetails,
  getCatalogByAuthType,
  getCatalogByCategory,
  getCatalogCategories,
} from "chat-agent-toolkit/connectors";
```

### Server

```typescript
// Node.js runtime only — not for browser code
import { app, server } from "chat-agent-toolkit/connectors/server";

// Use express app in your own middleware stack
const myApp = express();
myApp.use("/oomol", app);
```

## API Endpoints (Server)

### GET /api/catalog

List or search providers.

**Query Parameters:**
- `q` (string, optional): Search term (case-insensitive)
- `limit` (number, default: 100): Max results

**Response:**
```json
[
  {
    "service": "gmail",
    "displayName": "Gmail",
    "categories": ["Productivity"],
    "authTypes": ["oauth2"],
    "actionCount": 46
  }
]
```

### POST /api/connections

Start a connection for the logged-in user.

**Request Body:**
```json
{
  "service": "gmail",
  "connectionName": "My Work Email",
  "apiKey": "sk_...",        // For API-key auth
  "values": {...}             // For custom credential auth
}
```

**OAuth Response (pending):**
```json
{
  "pending": true,
  "requestId": "conn_req_abc123",
  "authorizationUrl": "https://accounts.google.com/o/oauth2/auth?...",
  "status": "initiated"
}
```

**API-key Response (synchronous):**
```json
{
  "pending": false,
  "connectedAccountId": "conn_abc123",
  "status": "connected",
  "available": true
}
```

### GET /api/connections/requests/:id

Poll OAuth connection status.

**Response:**
```json
{
  "status": "connected",         // initiated | connected | failed | expired
  "connectedAccountId": "conn_...",
  "available": true
}
```

### POST /api/actions/:actionId

Execute a provider action (e.g., "gmail.search_threads").

**Request Body:**
```json
{
  "input": {
    "query": "from:boss subject:urgent",
    "maxResults": 10
  },
  "connectionName": "My Work Email"  // Optional, if user has multiple connections
}
```

**Response:**
```json
{
  "data": [...],
  "executionId": "exec_xyz",
  "actionId": "gmail.search_threads",
  "message": "Success"
}
```

## Architecture

### Client Side (Browser)

1. Import utilities from agent-toolkit
2. Search/display catalog to user
3. Call `/api/connections` to start auth flow
4. For OAuth: redirect user to `authorizationUrl`
5. After user authorizes, poll `/api/connections/requests/{requestId}`
6. Once connected, call `/api/actions/{actionId}` to execute actions

### Server Side (Node.js)

1. Express server handles OAuth callbacks
2. Credentials stored encrypted in OOMOL Cloud vault
3. Token refresh handled by OOMOL
4. Your app calls `/api/actions/...` on behalf of users
5. OOMOL makes the actual provider API calls

### OOMOL Cloud

- Hosts OAuth apps (client IDs, secrets)
- Stores encrypted credentials
- Refreshes OAuth tokens
- Rate-limits & retries provider calls
- Provides audit logs

## Security

### Session User ID

The server **trusts** `req.userId` to identify the logged-in user. It uses this to scope credentials and actions.

```typescript
// DEMO (insecure): dev-only, uses x-user-id header
app.use((req, _res, next) => {
  req.userId = req.get("x-user-id") ?? "demo_user";
  next();
});
```

**In production**, derive `req.userId` from your auth system:

```typescript
import passport from "passport";

app.use(passport.initialize());
app.use(passport.session());

// After passport middleware:
app.use((req, _res, next) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  req.userId = req.user.id; // Your app's user ID
  next();
});
```

### Never Trust Client

- Don't let clients pick their own user ID
- Don't pass user ID in request body or query params
- Always derive from authenticated session server-side

## Catalog Data

Two JSON files ship with the module:

1. **catalog.json** (~150 KB)
   - Basic info: service ID, display name, auth types, action count
   - Use for fast provider pickers
   - Search/filter with `searchCatalog()`

2. **openconnector-providers-index.json** (~600 KB)
   - Detailed: homepage URL, action list, categories
   - Use for detailed provider pages
   - Access with `getProviderDetails()`

Both are pre-filtered from OOMOL's master catalog (~900 providers).

## Environment Variables

When running the server:

| Variable | Default | Description |
| --- | --- | --- |
| `OOMOL_PROJECT_API_KEY` | N/A | Your OOMOL project API key (required) |
| `PORT` | `8787` | Server port |
| `APP_ORIGIN` | `http://localhost:8787` | Your app's origin (for OAuth redirect) |

## Error Handling

OOMOL returns structured error responses:

```json
{
  "error": "provider_config_not_found",
  "message": "The OAuth app for 'slack' is not configured in your OOMOL project."
}
```

Common error codes:
- `provider_config_not_found` — OAuth app not set up in OOMOL console
- `connection_alias_conflict` — Connection name already used by this user
- `app_not_ready` — OOMOL project not fully set up
- `client_wait_timeout` — User didn't complete OAuth in time
- `invalid_action_id` — Action doesn't exist for this provider

## Example: Complete Flow

### Frontend

```typescript
// 1. Search for Gmail
import { searchCatalog } from "chat-agent-toolkit/connectors";
const providers = searchCatalog("gmail");

// 2. Display to user, user clicks "Connect Gmail"
// 3. Call backend to start OAuth
const res = await fetch("/api/connections", {
  method: "POST",
  body: JSON.stringify({ service: "gmail", connectionName: "Gmail" }),
});
const { authorizationUrl, requestId } = await res.json();

// 4. Redirect user to Google's OAuth consent screen
window.location.href = authorizationUrl;

// 5. After user consents, they return to /connected
// 6. Poll backend to check if connection succeeded
while (true) {
  const status = await fetch(`/api/connections/requests/${requestId}`);
  const { status: connStatus } = await status.json();
  if (connStatus === "connected") break;
  await new Promise((r) => setTimeout(r, 1000));
}

// 7. Now you can call actions
const messages = await fetch("/api/actions/gmail.search_threads", {
  method: "POST",
  body: JSON.stringify({
    input: { query: "from:boss" },
    connectionName: "Gmail",
  }),
});
```

### Backend (Node.js)

```typescript
import express from "express";
import { app as connectorApp } from "chat-agent-toolkit/connectors/server";

const app = express();

// Your auth middleware
app.use(authMiddleware);

// Mount connector server
app.use("/oomol", connectorApp);

// Your routes
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body;
  const result = await fetch("http://localhost:8787/api/actions/gmail.send", {
    method: "POST",
    body: JSON.stringify({
      input: { to, subject, body },
      connectionName: req.user.gmailConnection,
    }),
  });
  res.json(await result.json());
});

app.listen(3000);
```

## Links

- [OOMOL Documentation](https://docs.oomol.com)
- [Connector SDK Reference](https://docs.oomol.com/connector-sdk)
- [Provider Catalog](https://connector.oomol.com/catalog)

## License

Part of [chat-agent-toolkit](https://github.com/opensourceagi/qwksearch-research-agent).
Licensed under PROSPER (rights.institute/PROSPER).
