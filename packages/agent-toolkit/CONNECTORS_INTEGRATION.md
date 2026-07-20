# OpenConnector Integration Guide

This document describes how the OpenConnector (OOMOL) integration has been added to the agent-toolkit package.

## What Changed

### New Files

```
packages/agent-toolkit/src/connectors/
├── index.ts                          # Main exports & utilities
├── server.ts                         # Express server (Node.js runtime)
├── smoke-test.ts                     # Build-time validation
├── catalog.json                      # 900+ provider catalog (basic)
├── openconnector-providers-index.json # Detailed provider metadata
├── package.json                      # Sub-package dependencies (node_modules only)
├── package-lock.json
└── README.md                         # Detailed usage guide
```

### Updated Files

1. **packages/agent-toolkit/package.json**
   - Added `./connectors` export path
   - Added optional dependencies: `@oomol-lab/connector`, `express`
   - Updated `files` array to include connector assets

2. **packages/agent-toolkit/src/index.ts**
   - Added exports: `export * from "./connectors"`
   - Added namespace export: `export * as connectors from "./connectors"`

### Migration Path

**Old Way** (if you had connectors elsewhere):
```typescript
// import directly from nested paths
```

**New Way** (unified in agent-toolkit):
```typescript
// Single import
import { ProjectConnector, catalog, searchCatalog } from "chat-agent-toolkit/connectors";

// Or namespaced
import { connectors } from "chat-agent-toolkit";
const { ProjectConnector, catalog } = connectors;
```

## Usage Patterns

### Pattern 1: Client-Side (Browser)

Use catalog utilities in your React/Vue/Svelte UI:

```typescript
import {
  catalog,
  searchCatalog,
  getCatalogByAuthType,
  getCatalogCategories,
} from "chat-agent-toolkit/connectors";

// In your component:
const [search, setSearch] = useState("");
const results = searchCatalog(search);

<Select options={results} />
```

**What's available:**
- `catalog` — full provider list
- `providerIndex` — detailed provider info with actions
- `searchCatalog(query, limit)` — search by name
- `getCatalogProvider(serviceId)` — lookup by ID
- `getProviderDetails(serviceId)` — detailed lookup
- `getCatalogByAuthType(type)` — filter by auth method
- `getCatalogByCategory(category)` — filter by category
- `getCatalogCategories()` — list all categories

### Pattern 2: Server-Side Express Integration

Run the connector server alongside your app:

```typescript
// Backend: Node.js/Express
import express from "express";
import { app as connectorApp } from "chat-agent-toolkit/connectors/server";

const app = express();

// Your auth middleware
app.use(authenticate);

// Mount connector routes
app.use("/connectors", connectorApp);

// Your routes that use connectors
app.post("/actions/:actionId", async (req, res) => {
  // Forward to connector server
  const result = await fetch("http://localhost:8787/api/actions/" + actionId, {
    method: "POST",
    body: JSON.stringify(req.body),
  });
  res.json(await result.json());
});
```

### Pattern 3: Standalone Connector Server

Run the server as a separate Node.js process:

```bash
# Start server
OOMOL_PROJECT_API_KEY=oo_proj_xxx PORT=8787 npm run start

# Your frontend calls:
fetch("http://localhost:8787/api/connections", { ... })
fetch("http://localhost:8787/api/actions/gmail.send", { ... })
```

## Build & Deploy

### Development

```bash
# Install dependencies (agent-toolkit workspaces)
bun install

# Build agent-toolkit with connectors
bun run build

# If running connector server separately:
cd packages/agent-toolkit/src/connectors
npm install
npm start
```

### Production

1. **Include in published npm package:**
   - Connectors automatically included in `chat-agent-toolkit` npm publish
   - Client code can import from agent-toolkit

2. **Deploy connector server (if used):**
   - Option A: Run as separate Node.js service
   - Option B: Deploy to Heroku, Railway, Fly.io, etc.
   - Option C: Embed in existing Express app

3. **Set OOMOL_PROJECT_API_KEY:**
   - Environment variable on server
   - Create project in OOMOL console → copy API key

## Architecture Decisions

### Why Optional Dependencies?

```json
{
  "optionalDependencies": {
    "@oomol-lab/connector": "^1.0.0",
    "express": "^5.2.1"
  }
}
```

- **@oomol-lab/connector**: Only needed if using connectors client-side
- **express**: Only needed if running the server
- If you only need catalog utilities, these won't be installed by default
- Reduces bundle size for users who don't use connectors

### Why Keep server.ts?

The server is **Node.js runtime code**, not a library to import. It:
- Requires Express (not available in browsers)
- Uses `readFile` (Node.js only)
- Stays in `src/` as a build artifact (excluded from browser builds via external deps)
- Can be run standalone or embedded in your Express app

### Why Two Catalog Files?

1. **catalog.json** (151 KB) — Basic: service ID, display name, auth types, count
   - Fast to load & search
   - Good for provider pickers
   - Used by server's `/api/catalog`

2. **openconnector-providers-index.json** (616 KB) — Detailed: actions, homepage, full metadata
   - Use for detailed provider pages
   - Access via `getProviderDetails()`
   - Referenced but not loaded by default in browser builds

## Testing

### Smoke Test

Validates the OOMOL SDK boots correctly:

```bash
cd packages/agent-toolkit
npm run build
```

Runs `smoke-test.ts`, which:
- Imports `ProjectConnector` and `ConnectorError`
- Creates instances
- Verifies expected methods exist
- Boots the Express server briefly
- Exits with success

### Integration Tests

Add tests in your app that uses connectors:

```typescript
import { catalog, getCatalogProvider, searchCatalog } from "chat-agent-toolkit/connectors";

describe("connectors", () => {
  test("catalog loads", () => {
    expect(catalog.length).toBeGreaterThan(0);
  });

  test("search works", () => {
    const results = searchCatalog("gmail");
    expect(results.some((p) => p.service === "gmail")).toBe(true);
  });

  test("getCatalogProvider works", () => {
    const gmail = getCatalogProvider("gmail");
    expect(gmail?.displayName).toBe("Gmail");
  });
});
```

## Troubleshooting

### Import Errors

**Problem:** `Cannot find module '@oomol-lab/connector'`

**Solution:** This is an optional dependency. Install it:
```bash
npm install @oomol-lab/connector
# or in monorepo:
bun add -w @oomol-lab/connector
```

### Server Won't Start

**Problem:** `Error: Missing OOMOL_PROJECT_API_KEY`

**Solution:** Set the environment variable:
```bash
OOMOL_PROJECT_API_KEY=oo_proj_... npm start
```

Get your API key from the [OOMOL console](https://console.oomol.com).

### 404 on /api/connections

**Problem:** Server running but routes 404

**Solution:** Check the server mounted correctly. If using Express:

```typescript
import { app as connectorApp } from "chat-agent-toolkit/connectors/server";

// Correct: app.use() mounts all routes
app.use(connectorApp);

// Also correct: mount at subpath
app.use("/oomol", connectorApp);
```

### Type Errors

**Problem:** TypeScript can't find types for connectors

**Solution:** Types are included. Verify:
1. `tsconfig.json` has `"moduleResolution": "bundler"` or `"node"`
2. You're importing from the correct path:
   ```typescript
   import { /* ... */ } from "chat-agent-toolkit/connectors";
   // Not: from "chat-agent-toolkit/src/connectors"
   ```

## Next Steps

1. **Read the full guide:** [src/connectors/README.md](./src/connectors/README.md)
2. **Create OOMOL project:** https://console.oomol.com
3. **Set up OAuth apps:** Configure apps for Gmail, Slack, etc. in the OOMOL console
4. **Implement auth flow:** Use `/api/connections` + `/api/actions`
5. **Deploy connector server:** Choose deployment platform

## Links

- [OOMOL Documentation](https://docs.oomol.com)
- [Connector SDK Docs](https://docs.oomol.com/connector-sdk)
- [Provider Catalog](https://connector.oomol.com/catalog)
- [GitHub Repository](https://github.com/opensourceagi/qwksearch-research-agent)

## Support

- Issues: https://github.com/opensourceagi/qwksearch-research-agent/issues
- OOMOL Support: https://docs.oomol.com/support
