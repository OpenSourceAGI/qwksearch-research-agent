# Composio MCP Quick Start

## 🚀 What is This?

Composio gives you **200+ pre-built tool integrations** (Gmail, Slack, Notion, GitHub, etc.) accessible through a **single MCP endpoint**. Instead of building individual integrations, you connect to Composio's dynamic MCP server and get all tools instantly.

## 📦 Installation

```bash
npm install ai @ai-sdk/openai @ai-sdk/mcp @composio/core
```

## 🔑 Setup

```bash
# .env
OPENAI_API_KEY=sk-...
COMPOSIO_API_KEY=your-composio-key  # Get at https://app.composio.dev/settings
COMPOSIO_USER_ID=your-user-id       # Any unique identifier
```

## ⚡ 30-Second Example

```typescript
import { Composio } from '@composio/core';
import { createMCPClient } from '@ai-sdk/mcp';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

// 1. Create session → Get MCP endpoint
const session = await composio.toolkits.authorize({
  userId: 'user-123',
  toolkits: ['GMAIL', 'SLACK'],
});

// 2. Connect to MCP via HTTP
const mcp = await createMCPClient({
  transport: {
    type: 'http',
    url: session.mcp.url,
    headers: session.mcp.headers,
    redirect: 'error',
  },
});

// 3. Get tools
const tools = await mcp.tools();

// 4. Use with AI
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

## 🎯 Using the Toolkit Wrapper

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

## 🌐 Next.js Example

### API Route
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getComposioTools } from 'chat-agent-toolkit';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();
  
  const tools = await getComposioTools({
    apiKey: process.env.COMPOSIO_API_KEY!,
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

### Client
```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { userId: 'user-123' },
  });
  
  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button>Send</button>
      </form>
    </div>
  );
}
```

## 🔐 Authentication

Users must authenticate toolkits before use:

### Option 1: CLI
```bash
composio auth gmail --user-id user-123
composio auth slack --user-id user-123
```

### Option 2: Dashboard
Visit: https://app.composio.dev/apps

### Check Status
```typescript
const isAuth = await session.isToolkitAuthenticated('GMAIL');
console.log('Gmail:', isAuth ? '✓' : '✗');
```

## 🛠️ Popular Toolkits

| Category | Toolkits |
|----------|----------|
| **Communication** | GMAIL, SLACK, DISCORD, TEAMS, TELEGRAM |
| **Productivity** | NOTION, CALENDAR, TODOIST, ASANA, TRELLO |
| **Development** | GITHUB, GITLAB, JIRA, LINEAR, BITBUCKET |
| **CRM** | SALESFORCE, HUBSPOT, PIPEDRIVE, ZENDESK |
| **Storage** | DRIVE, DROPBOX, ONEDRIVE, BOX |

See all 200+: https://composio.dev/tools

## 🎯 Multi-Step Workflows

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
  maxSteps: 20,  // Allow complex workflows
});
```

The model automatically:
1. Calls `gmail_search`
2. Calls `notion_create_page` (multiple times)
3. Calls `slack_post_message`
4. Calls `github_create_issue` (multiple times)
5. Returns summary

## 📋 Complete API

### ComposioMCPSession
```typescript
import { ComposioMCPSession } from 'chat-agent-toolkit';

const session = new ComposioMCPSession({
  apiKey: string,
  userId: string,
  toolkits: string[],
  additionalHeaders?: Record<string, string>,
});

// Get tools
const tools = await session.getTools();

// Check auth
const isAuth = await session.isToolkitAuthenticated('GMAIL');

// Cleanup
await session.close();
```

### Helper Functions
```typescript
// One-shot usage
const tools = await getComposioTools({
  apiKey: string,
  userId: string,
  toolkits: string[],
});

// Create reusable session
const session = await createComposioSession(config);

// List available toolkits
const toolkits = await ComposioMCPSession.listAvailableToolkits(apiKey);
```

## ⚠️ Best Practices

1. **Always close sessions**
   ```typescript
   try {
     const tools = await session.getTools();
     // ... use tools
   } finally {
     await session.close();  // Cleanup
   }
   ```

2. **Set maxSteps**
   ```typescript
   streamText({
     model,
     messages,
     tools,
     maxSteps: 10,  // Prevent infinite loops
   });
   ```

3. **Cache sessions**
   ```typescript
   const cache = new Map();
   function getCached(userId) {
     if (!cache.has(userId)) {
       cache.set(userId, new ComposioMCPSession({ userId, ... }));
     }
     return cache.get(userId);
   }
   ```

4. **Handle errors**
   ```typescript
   try {
     const tools = await session.getTools();
   } catch (error) {
     if (error.message.includes('authentication')) {
       return 'Please authenticate at app.composio.dev';
     }
     throw error;
   }
   ```

5. **Use toolChoice: 'auto'**
   ```typescript
   streamText({
     model,
     messages,
     tools,
     toolChoice: 'auto',  // Let model decide
   });
   ```

## 📚 Examples

- [Basic Usage](./composio-mcp-basic.ts) - 7 comprehensive examples
- [Next.js App](./composio-nextjs/) - Full chat interface
- [Integration Guide](../COMPOSIO.md) - Complete documentation

## 🐛 Troubleshooting

**"Authentication required"**
- Authenticate at https://app.composio.dev/apps
- Or use CLI: `composio auth gmail --user-id user-123`

**"Rate limit exceeded"**
- Implement session caching
- Add retry logic with exponential backoff

**"Tool not found"**
- Verify toolkit name (case-sensitive)
- Check: https://composio.dev/tools

**"Connection timeout"**
- MCP endpoint may be slow
- Increase timeout in createMCPClient

## 🔗 Resources

- [Composio Dashboard](https://app.composio.dev)
- [Available Tools](https://composio.dev/tools)
- [Composio Docs](https://composio.dev/docs)
- [AI SDK MCP Guide](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [Full Integration Guide](../COMPOSIO.md)

## 💡 Pro Tips

1. **Use HTTP transport** - Required by Composio, works in serverless
2. **Enable only needed toolkits** - Faster session creation
3. **Test auth first** - Check `isToolkitAuthenticated()` before using
4. **Monitor tool calls** - Log which tools are being invoked
5. **Set reasonable maxSteps** - 10-20 is usually enough

---

**Need help?** Join Composio Discord: https://discord.gg/composio
