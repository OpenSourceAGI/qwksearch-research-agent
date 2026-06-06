# Composio MCP Integration Guide

## Overview

Composio provides **dynamic MCP endpoints** that expose 200+ tool integrations (Gmail, Slack, Notion, GitHub, etc.) to AI SDK v5 models. Instead of managing individual MCP servers, you get a unified HTTP endpoint with all your enabled toolkits.

## Architecture

```
┌─────────────────┐
│   Your App      │
│  (Next.js/Node) │
└────────┬────────┘
         │ 1. Create session
         ↓
┌─────────────────┐
│  Composio API   │ ← toolkits.authorize({ userId, toolkits })
│                 │
└────────┬────────┘
         │ 2. Returns MCP endpoint
         │    { url, headers }
         ↓
┌─────────────────┐
│  MCP Client     │ ← createMCPClient({ type: 'http', url, headers })
│  (@ai-sdk/mcp)  │
└────────┬────────┘
         │ 3. Fetch tools
         ↓
┌─────────────────┐
│  AI SDK Model   │ ← streamText({ model, messages, tools })
│  (GPT-4, etc.)  │
└─────────────────┘
```

## Installation

```bash
npm install ai @ai-sdk/mcp @ai-sdk/openai @composio/core
```

## Environment Setup

```bash
# .env.local
OPENAI_API_KEY=sk-...
COMPOSIO_API_KEY=your-composio-key
COMPOSIO_USER_ID=your-user-identifier
```

Get Composio key: https://app.composio.dev/settings

## Quick Start

### 1. Basic Usage

```typescript
import { Composio } from '@composio/core';
import { createMCPClient } from '@ai-sdk/mcp';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!,
});

// Create Composio session → Get MCP endpoint
const session = await composio.toolkits.authorize({
  userId: 'user-123',
  toolkits: ['GMAIL', 'SLACK'],
});

// Connect to MCP endpoint via HTTP
const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: session.mcp.url,
    headers: session.mcp.headers,
    redirect: 'error',
  },
});

try {
  // Fetch tools from MCP
  const tools = await mcpClient.tools();

  // Use tools with AI model
  const result = streamText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'user', content: 'Check my unread emails and summarize them' },
    ],
    tools,
    maxSteps: 10,
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
} finally {
  await mcpClient.close();
}
```

### 2. Using the Wrapper

```typescript
import { ComposioMCPSession } from 'chat-agent-toolkit';

const session = new ComposioMCPSession({
  apiKey: process.env.COMPOSIO_API_KEY!,
  userId: 'user-123',
  toolkits: ['GMAIL', 'NOTION', 'GITHUB'],
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

## Next.js Integration

### API Route

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getComposioTools } from '@/lib/composio';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  const tools = await getComposioTools({
    userId,
    toolkits: ['GMAIL', 'SLACK', 'NOTION'],
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

### Client Component

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { userId: 'user-123' },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Available Toolkits

Popular toolkits (200+ total):

**Communication**
- GMAIL, OUTLOOK, SLACK, DISCORD, TEAMS, TELEGRAM

**Productivity**
- NOTION, CALENDAR, TODOIST, ASANA, TRELLO

**Development**
- GITHUB, GITLAB, JIRA, LINEAR, BITBUCKET

**CRM**
- SALESFORCE, HUBSPOT, PIPEDRIVE, ZENDESK

**Storage**
- DRIVE, DROPBOX, ONEDRIVE, BOX

See all: https://composio.dev/tools

## Authentication

Users must authenticate each toolkit before use:

### Via CLI
```bash
composio auth gmail --user-id user-123
composio auth slack --user-id user-123
```

### Via Dashboard
Visit: https://app.composio.dev/apps

### Check Auth Status
```typescript
const session = new ComposioMCPSession(config);
const isAuth = await session.isToolkitAuthenticated('GMAIL');
console.log('Gmail:', isAuth ? 'Authenticated' : 'Not authenticated');
```

## Multi-Step Workflows

Composio tools work best with multi-step execution:

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages: [
    {
      role: 'user',
      content: `Workflow:
1. Find emails with "bug report" in subject
2. Create Notion pages for each bug
3. Post summary to #engineering on Slack
4. Create GitHub issues for critical bugs`,
    },
  ],
  tools,
  maxSteps: 20, // Allow complex workflows
});
```

The model will:
1. Call `gmail_search` to find bug reports
2. Call `notion_create_page` for each email
3. Call `slack_post_message` with summary
4. Call `github_create_issue` for critical items
5. Generate final summary

## Session Management

### One-shot (Simple)
```typescript
import { getComposioTools } from 'chat-agent-toolkit';

const tools = await getComposioTools({
  apiKey: process.env.COMPOSIO_API_KEY!,
  userId: 'user-123',
  toolkits: ['GMAIL'],
});
```

### Reusable Session (Better Performance)
```typescript
const session = new ComposioMCPSession(config);

// Use multiple times
const tools1 = await session.getTools();
// ... do work ...
const tools2 = await session.getTools();

// Cleanup when done
await session.close();
```

### With Caching (Production)
```typescript
const sessionCache = new Map();

function getCachedSession(userId: string) {
  if (!sessionCache.has(userId)) {
    sessionCache.set(
      userId,
      new ComposioMCPSession({ userId, /* ... */ })
    );
  }
  return sessionCache.get(userId);
}
```

## Error Handling

```typescript
const session = new ComposioMCPSession(config);

try {
  const tools = await session.getTools();

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'Send email',
    tools,
  });

  return result;
} catch (error) {
  if (error.message.includes('authentication')) {
    // Toolkit not authenticated
    return 'Please authenticate your Gmail account';
  }
  if (error.message.includes('rate limit')) {
    // Rate limited
    return 'Too many requests, try again later';
  }
  throw error;
} finally {
  await session.close();
}
```

## Custom Headers

If your org requires `x-api-key` header:

```typescript
const session = new ComposioMCPSession({
  apiKey: process.env.COMPOSIO_API_KEY!,
  userId: 'user-123',
  toolkits: ['GMAIL'],
  additionalHeaders: {
    'x-api-key': process.env.COMPOSIO_MCP_API_KEY!,
  },
});
```

## Best Practices

1. **Use HTTP transport** - Required by Composio, works in serverless
2. **Cache sessions** - Reuse MCP clients to avoid overhead
3. **Set maxSteps** - Limit tool call chains (10-20 is reasonable)
4. **Clean up** - Always call `session.close()` in finally blocks
5. **Check auth** - Verify toolkit authentication before using
6. **Handle errors** - Catch auth and rate limit errors specifically
7. **Use toolChoice: 'auto'** - Let the model decide when to use tools

## Examples

- [Basic usage](examples/composio-mcp-basic.ts) - 7 comprehensive examples
- [Next.js App Router](examples/composio-nextjs/) - Full chat interface
- [Session management](src/tools/composio-mcp.ts) - Reusable wrapper

## Resources

- [Composio Docs](https://composio.dev/docs)
- [Composio Dashboard](https://app.composio.dev)
- [AI SDK MCP Guide](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [Available Tools](https://composio.dev/tools)
- [Composio AI SDK Guide](https://composio.dev/toolkits/ai_ml_api/framework/ai-sdk)

## FAQ

**Q: Session vs Single-Toolkit MCP?**  
A: Use sessions (recommended) for dynamic multi-app agents. Use single-toolkit MCP only for fixed, narrow servers.

**Q: Why HTTP not stdio?**  
A: Composio MCP uses HTTP endpoints, not stdio processes. Works better in serverless/edge.

**Q: How to handle tool failures?**  
A: The model will receive the error and can retry or explain the issue. Set `maxSteps` to allow retries.

**Q: Can I use multiple toolkits?**  
A: Yes! Pass multiple toolkits to `toolkits: ['GMAIL', 'SLACK', 'NOTION']`. The model gets all tools.

**Q: Session lifetime?**  
A: Sessions last ~30 minutes. Cache and reuse, but implement cleanup for expired sessions.

**Q: Cost?**  
A: Composio charges per tool execution. See https://composio.dev/pricing

## Troubleshooting

**"Authentication required"**
- User needs to authenticate toolkit at https://app.composio.dev/apps
- Check with `session.isToolkitAuthenticated('GMAIL')`

**"Rate limit exceeded"**
- Implement exponential backoff
- Cache sessions to reduce overhead

**"Tool not found"**
- Verify toolkit name is correct (case-sensitive)
- Check toolkit is enabled for your org

**"Connection timeout"**
- MCP endpoint may be slow, increase timeout
- Check network connectivity

---

**Need help?** Join Composio Discord: https://discord.gg/composio
