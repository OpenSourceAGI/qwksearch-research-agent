# Quick Start: OpenConnector Integration

Get OAuth + multi-provider connectivity in 5 minutes.

## Installation

Already included in `chat-agent-toolkit`. No extra steps needed!

```bash
# In your project using agent-toolkit
import { ProjectConnector, catalog, searchCatalog } from "chat-agent-toolkit/connectors";
```

## Step 1: Set Up OOMOL Project (2 min)

1. Go to https://console.oomol.com
2. Sign up / log in
3. Create a new project
4. Copy your API key: `oo_proj_...`

Done! You now have:
- Encrypted credential vault for your users
- OAuth app management
- 900+ provider integrations ready to use

## Step 2: Search Available Providers (1 min)

```typescript
import { searchCatalog, getCatalogByAuthType } from "chat-agent-toolkit/connectors";

// Search for a provider
const gmail = searchCatalog("gmail")[0];
console.log(gmail);
// {
//   service: "gmail",
//   displayName: "Gmail",
//   categories: ["Productivity"],
//   authTypes: ["oauth2"],
//   actionCount: 46
// }

// Find all providers that support OAuth
const oauthProviders = getCatalogByAuthType("oauth2");
console.log(oauthProviders.length); // ~150 providers
```

## Step 3: Start OAuth Flow (2 min)

### Backend (Node.js/Express)

```typescript
import express from "express";
import { app as connectorApp } from "chat-agent-toolkit/connectors/server";

const app = express();

// Replace with your real auth (passport, JWT, etc.)
app.use((req, res, next) => {
  req.userId = req.user?.id; // Your session user ID
  next();
});

// Mount connector endpoints
app.use("/api/connectors", connectorApp);

// Start server
app.listen(3000);
// Now available:
// POST /api/connectors/connections
// GET  /api/connectors/connections/requests/:id
// POST /api/connectors/actions/:actionId
```

### Frontend (React example)

```typescript
// 1. User clicks "Connect Gmail"
async function startGmailOAuth() {
  const res = await fetch("/api/connectors/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service: "gmail",
      connectionName: "Gmail Account",
    }),
  });

  const { authorizationUrl, requestId } = await res.json();

  // 2. Redirect to Google
  window.location.href = authorizationUrl;

  // 3. Google redirects back to /connected, then we poll
  await pollUntilConnected(requestId);
}

// 4. Poll until connection is ready
async function pollUntilConnected(requestId) {
  while (true) {
    const res = await fetch(`/api/connectors/connections/requests/${requestId}`);
    const { status } = await res.json();

    if (status === "connected") {
      console.log("✅ Connected!");
      break;
    }

    if (status === "failed" || status === "expired") {
      throw new Error(`Connection failed: ${status}`);
    }

    // Wait 1 second and try again
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

## Step 4: Execute Provider Actions (30 sec)

Once connected, call provider actions:

```typescript
// Example: Search Gmail threads
async function searchGmailThreads() {
  const res = await fetch("/api/connectors/actions/gmail.search_threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        query: "from:boss subject:urgent",
        maxResults: 10,
      },
      connectionName: "Gmail Account", // Name from step 3
    }),
  });

  const { data } = await res.json();
  console.log("Found threads:", data);
}

// Example: Send Slack message
async function sendSlackMessage() {
  const res = await fetch("/api/connectors/actions/slack.send_message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        channel: "#general",
        text: "Hello from agent!",
      },
      connectionName: "My Slack",
    }),
  });

  console.log(await res.json());
}
```

## Environment Variables

```bash
# Required
OOMOL_PROJECT_API_KEY=oo_proj_...

# Optional
PORT=8787  # Server port (default)
APP_ORIGIN=http://localhost:3000  # Your frontend origin for OAuth redirect
```

## Running the Server

```bash
# Development
OOMOL_PROJECT_API_KEY=oo_proj_... npm start

# Production (e.g., Railway, Heroku)
# Set env vars in your deployment platform
# Then start the app
PORT=8787 node src/connectors/server.ts
```

## API Endpoints Quick Reference

```bash
# Search providers
GET /api/connectors/catalog?q=gmail&limit=100

# Start OAuth
POST /api/connectors/connections
{
  "service": "gmail",
  "connectionName": "My Gmail"
}

# Check OAuth status
GET /api/connectors/connections/requests/{requestId}

# Run an action
POST /api/connectors/actions/gmail.send
{
  "input": { "to": "user@example.com", "subject": "...", "body": "..." },
  "connectionName": "My Gmail"
}
```

## List of Popular Providers

OAuth providers (auto-redirect user to provider's auth page):
- Gmail, Microsoft 365, Yahoo Mail
- Slack, Discord, Teams
- GitHub, GitLab, Bitbucket
- Google Drive, Dropbox, OneDrive
- Airtable, Notion, Asana
- HubSpot, Salesforce, Pipedrive
- Stripe, PayPal, Square
- Twilio, SendGrid, Brevo
- ...and ~100+ more

API Key providers (user enters API key directly):
- OpenAI, Anthropic, Groq
- Amazon S3, DigitalOcean
- Database: PostgreSQL, MongoDB, MySQL
- ...and ~200+ more

## Troubleshooting

### "Cannot find module '@oomol-lab/connector'"
```bash
npm install @oomol-lab/connector
# or in monorepo:
bun add -w @oomol-lab/connector
```

### "OOMOL_PROJECT_API_KEY is missing"
```bash
# Set the env var
export OOMOL_PROJECT_API_KEY=oo_proj_...
npm start
```

### "404 on /api/connectors/connections"
Make sure you mounted the app:
```typescript
import { app as connectorApp } from "chat-agent-toolkit/connectors/server";
app.use("/api/connectors", connectorApp);
```

### "OAuth redirect not working"
Set `APP_ORIGIN` to your frontend URL:
```bash
APP_ORIGIN=https://myapp.com npm start
```

## Example: Complete Full-Stack App

See [src/connectors/README.md](./src/connectors/README.md) for a complete example with React + Express + OOMOL.

## Next Steps

1. **Read full docs:** [src/connectors/README.md](./src/connectors/README.md)
2. **Integration guide:** [CONNECTORS_INTEGRATION.md](./CONNECTORS_INTEGRATION.md)
3. **OOMOL docs:** https://docs.oomol.com
4. **Provider catalog:** https://connector.oomol.com/catalog

## Support

- Issues: https://github.com/opensourceagi/qwksearch-research-agent/issues
- OOMOL support: https://docs.oomol.com/support

---

**That's it!** You now have OAuth connectivity to 900+ services. 🚀
