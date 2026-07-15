# OpenConnector Quick Start

## What is This?

OpenConnector is a **self-hosted Cloudflare Worker** that provides OAuth-managed access to 100+ app integrations (Gmail, Slack, Notion, GitHub, etc.) via a single MCP endpoint. Instead of relying on a SaaS platform, you deploy your own Worker with D1, R2/KV backing.

## Installation

```bash
npm install ai @ai-sdk/openai @ai-sdk/mcp
```

No external SDK needed — OpenConnector is accessed via standard HTTP.

## Setup

```bash
# .env
OPENAI_API_KEY=sk-...
OPEN_CONNECTOR_ADMIN_TOKEN=your-admin-token
OPEN_CONNECTOR_URL=https://open-connector.example.workers.dev
```

## 30-Second Example

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 1. Connect to OpenConnector MCP via HTTP
const mcp = await createMCPClient({
  transport: {
    type: 'http',
    url: `${process.env.OPEN_CONNECTOR_URL}/mcp/sse`,
    headers: {
      Authorization: `Bearer ${process.env.OPEN_CONNECTOR_ADMIN_TOKEN}`,
    },
    redirect: 'error',
  },
});

// 2. Get tools
const tools = await mcp.tools();

// 3. Use with AI
const result = streamText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: 'Check my unread emails' }],
  tools,
  maxSteps: 10,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

await mcp.close();
```

## Using the Toolkit Wrapper

```typescript
import { OpenConnectorMCPSession } from 'chat-agent-toolkit';

const session = new OpenConnectorMCPSession({
  adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
  baseUrl: process.env.OPEN_CONNECTOR_URL!,
  userId: 'user-123',
  apps: ['gmail', 'notion', 'github'],
});

try {
  const tools = await session.getTools();

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'Create a GitHub issue for each unread email',
    tools,
    maxSteps: 15,
  });

  console.log(result.text);
} finally {
  await session.close();
}
```

## Deploying OpenConnector

See the Cloudflare deployment docs for full setup. In brief:

```bash
npm install
cp wrangler.example.jsonc wrangler.local.jsonc
npx wrangler d1 create open-connector
npx wrangler r2 bucket create open-connector-transit-files
# Fill wrangler.local.jsonc with resource IDs
npx wrangler d1 migrations apply open-connector --local --config wrangler.local.jsonc
npm run dev:cloudflare
```

Check health:
```bash
curl http://localhost:8787/health
# {"ok":true}
```

## Next.js API Route Example

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getOpenConnectorTools } from 'chat-agent-toolkit';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  const tools = await getOpenConnectorTools({
    adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
    baseUrl: process.env.OPEN_CONNECTOR_URL!,
    userId,
    apps: ['gmail', 'slack', 'notion'],
  });

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools,
    maxSteps: 10,
  });

  return result.toUIMessageStreamResponse();
}
```

## Available Connectors

| Category | Apps |
|----------|------|
| **Communication** | Gmail, Slack, Microsoft Teams, Outlook |
| **Productivity** | Notion, Google Calendar, Asana, Confluence |
| **Development** | GitHub, Jira, Linear |
| **CRM** | Salesforce, HubSpot, ServiceNow |
| **Storage** | Google Drive, OneDrive, SharePoint, Box, Dropbox |
| **Data** | Databricks, Snowflake |

## Multi-Step Workflows

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages: [{
    role: 'user',
    content: `Workflow:
1. Find bug report emails
2. Create Notion page for each
3. Post summary to Slack
4. Create GitHub issues for critical bugs`
  }],
  tools,
  maxSteps: 20,
});
```

## Complete API

### OpenConnectorMCPSession
```typescript
import { OpenConnectorMCPSession } from 'chat-agent-toolkit';

const session = new OpenConnectorMCPSession({
  adminToken: string,
  baseUrl: string,
  userId: string,
  apps: string[],
});

const tools = await session.getTools();
const healthy = await session.healthCheck();
await session.close();
```

### Helper Functions
```typescript
// One-shot usage
const tools = await getOpenConnectorTools(config);

// Create reusable session
const session = await createOpenConnectorSession(config);
```

## Best Practices

1. **Always close sessions** — call `session.close()` in a finally block
2. **Set maxSteps** — prevent infinite tool-calling loops (10-20 is typical)
3. **Health check first** — verify the Worker is running before connecting MCP
4. **Keep admin token secure** — never expose it client-side

## Examples

- [Basic Usage](./open-connector-mastra-basic.ts) - Integration examples
- [Next.js App](./open-connector-nextjs/) - Full chat interface
