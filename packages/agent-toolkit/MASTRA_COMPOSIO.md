# Composio + Mastra Integration Guide

## Overview

Integrate Composio's 200+ tool integrations with Mastra's agent framework. Composio provides the MCP endpoint with tools, Mastra provides the agent orchestration and execution.

## Architecture

```
┌─────────────────┐
│   Your App      │
└────────┬────────┘
         │
         ↓ toolsets.create()
┌─────────────────┐
│  Composio API   │ → Returns { mcp: { url, headers } }
└────────┬────────┘
         │
         ↓ MCPClient connects
┌─────────────────┐
│  Mastra MCP     │ → listTools() or listToolsets()
│     Client      │
└────────┬────────┘
         │
         ↓ Agent with tools
┌─────────────────┐
│  Mastra Agent   │ → agent.generate()
└─────────────────┘
```

## Installation

```bash
npm install @composio/core @mastra/core @mastra/mcp @ai-sdk/openai dotenv
```

## Environment Setup

```bash
# .env
COMPOSIO_API_KEY=your-composio-key
COMPOSIO_USER_ID=your-user-id
OPENAI_API_KEY=sk-...
```

Get Composio key: https://app.composio.dev/settings

## Quick Start

### 1. Basic Integration

```typescript
import 'dotenv/config';
import { Composio } from '@composio/core';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { openai } from '@ai-sdk/openai';

async function main() {
  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY!,
  });

  // 1. Create Composio session → Get MCP endpoint
  const session = await composio.toolsets.create({
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL', 'SLACK'],
  });

  // 2. Connect Mastra MCP client
  const mcp = new MCPClient({
    id: 'composio-mcp',
    servers: {
      composio: {
        url: new URL(session.mcp.url),
        requestInit: {
          headers: {
            'x-api-key': process.env.COMPOSIO_API_KEY!,
          },
        },
      },
    },
  });

  // 3. Get tools from MCP
  const tools = await mcp.listTools();

  // 4. Create Mastra agent
  const agent = new Agent({
    id: 'composio-agent',
    name: 'Composio Assistant',
    instructions: 'Use available tools to help the user.',
    model: openai('gpt-4o'),
    tools,
  });

  // 5. Execute
  const result = await agent.generate('Check my unread emails', {
    maxSteps: 5,
  });

  console.log(result.text);

  await mcp.disconnect();
}

main();
```

### 2. Using the Toolkit Wrapper

```typescript
import { ComposioMastraSession } from 'chat-agent-toolkit';
import { openai } from '@ai-sdk/openai';

const session = new ComposioMastraSession({
  composioApiKey: process.env.COMPOSIO_API_KEY!,
  userId: 'user-123',
  toolkits: ['GMAIL', 'NOTION'],
  agent: {
    id: 'email-notion-agent',
    name: 'Email & Notion Assistant',
    instructions: 'Help with emails and Notion tasks',
    model: openai('gpt-4o'),
    maxSteps: 10,
  },
});

try {
  const result = await session.generate(
    'Create a Notion page for each unread email'
  );
  console.log(result.text);
} finally {
  await session.cleanup();
}
```

### 3. One-Shot Agent

```typescript
import { createComposioMastraAgent } from 'chat-agent-toolkit';

const session = await createComposioMastraAgent({
  composioApiKey: process.env.COMPOSIO_API_KEY!,
  userId: 'user-123',
  toolkits: ['SLACK'],
  agent: {
    id: 'slack-agent',
    name: 'Slack Assistant',
    instructions: 'Help with Slack communications',
    model: openai('gpt-4o'),
  },
});

const result = await session.generate('Post "Hello team!" to #general');
console.log(result.text);

await session.cleanup();
```

## Tools vs Toolsets

### Static Tools (listTools)
Best when all agents use the same tools:

```typescript
const tools = await mcp.listTools();

const agent = new Agent({
  id: 'static-agent',
  name: 'Static Agent',
  instructions: 'Fixed tool set',
  model: openai('gpt-4o'),
  tools, // Same for all requests
});
```

### Dynamic Toolsets (listToolsets)
Best when tools vary per user/request:

```typescript
const toolsets = await mcp.listToolsets();

const agent = new Agent({
  id: 'dynamic-agent',
  name: 'Dynamic Agent',
  instructions: 'Variable tool set',
  model: openai('gpt-4o'),
  toolsets, // Can change per request
});
```

### Dynamic Per-Request Pattern

```typescript
import { createDynamicComposioAgent } from 'chat-agent-toolkit';

const agent = await createDynamicComposioAgent({
  composioApiKey: process.env.COMPOSIO_API_KEY!,
  agent: {
    id: 'multi-user-agent',
    name: 'Multi-User Agent',
    instructions: 'Per-user tools',
    model: openai('gpt-4o'),
  },
});

// User 1: Gmail only
const result1 = await agent.generate({
  userId: 'user-1',
  toolkits: ['GMAIL'],
  prompt: 'Check my emails',
});

// User 2: Slack only
const result2 = await agent.generate({
  userId: 'user-2',
  toolkits: ['SLACK'],
  prompt: 'Post to Slack',
});
```

## Multi-Step Workflows

Mastra agents support multi-step execution with `maxSteps`:

```typescript
const result = await agent.generate(
  `Workflow:
1. Find bug report emails
2. Create Notion pages for each
3. Post summary to Slack
4. Create GitHub issues for critical bugs`,
  { maxSteps: 20 }
);

// Access tool call trace
if (result.steps) {
  result.steps.forEach((step, i) => {
    console.log(`Step ${i}: ${step.toolCalls?.length || 0} tool calls`);
  });
}
```

## Available Toolkits

Same 200+ integrations as AI SDK integration:

**Communication**: GMAIL, SLACK, DISCORD, TEAMS, TELEGRAM  
**Productivity**: NOTION, CALENDAR, TODOIST, ASANA  
**Development**: GITHUB, GITLAB, JIRA, LINEAR  
**CRM**: SALESFORCE, HUBSPOT, PIPEDRIVE  
**Storage**: DRIVE, DROPBOX, ONEDRIVE

See all: https://composio.dev/tools

## Authentication

Same as AI SDK - users must authenticate toolkits:

```bash
# CLI
composio auth gmail --user-id user-123

# Or via dashboard
https://app.composio.dev/apps
```

## Session Management

### Reusable Session
```typescript
const session = new ComposioMastraSession(config);

// Use multiple times
const result1 = await session.generate('Task 1');
const result2 = await session.generate('Task 2');

// Cleanup
await session.cleanup();
```

### One-Shot
```typescript
const session = await createComposioMastraAgent(config);
const result = await session.generate('Task');
await session.cleanup();
```

### Per-Request Dynamic
```typescript
const agent = await createDynamicComposioAgent(config);

// Each call gets fresh session
const result = await agent.generate({
  userId: 'user-123',
  toolkits: ['GMAIL'],
  prompt: 'Task',
});
```

## Error Handling

```typescript
const session = new ComposioMastraSession(config);

try {
  const result = await session.generate('Send email');
  console.log(result.text);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('authentication')) {
      console.error('Toolkit not authenticated');
    } else if (error.message.includes('rate limit')) {
      console.error('Rate limited, retry later');
    } else {
      throw error;
    }
  }
} finally {
  await session.cleanup();
}
```

## Tool Approval

Mastra supports `requireToolApproval` for human-in-the-loop:

```typescript
const mcp = new MCPClient({
  id: 'composio-mcp',
  servers: {
    composio: {
      url: new URL(session.mcp.url),
      requestInit: { headers: { 'x-api-key': apiKey } },
      requireToolApproval: true, // Require approval before execution
    },
  },
});
```

## Best Practices

1. **Use toolsets for multi-user** - Dynamic tools per user/request
2. **Set maxSteps** - Prevent runaway execution (5-20 is typical)
3. **Cache sessions** - Reuse for same user/toolkits
4. **Always cleanup** - Call `session.cleanup()` in finally blocks
5. **Handle auth errors** - Check toolkit authentication before use
6. **Monitor tool usage** - Log tool calls from `result.steps`

## Mastra vs AI SDK

| Feature | Mastra | AI SDK |
|---------|--------|--------|
| **Framework** | Agent-focused | Model-focused |
| **Tools** | `listTools()` / `listToolsets()` | `client.tools()` |
| **Execution** | `agent.generate()` | `streamText()` / `generateText()` |
| **Multi-step** | `maxSteps` option | `maxSteps` option |
| **Streaming** | Via model config | Native `streamText()` |
| **Session management** | Via wrapper | Via wrapper |
| **Tool approval** | Built-in flag | Manual implementation |

## Examples

- [Basic usage](examples/composio-mastra-basic.ts) - 7 examples
- [Dynamic agents](src/tools/composio-mastra.ts) - Session wrappers
- [AI SDK version](examples/composio-mcp-basic.ts) - For comparison

## Resources

- [Composio Mastra Guide](https://composio.dev/toolkits/composio/framework/mastra-ai)
- [Mastra Docs](https://mastra.ai/docs)
- [Composio Dashboard](https://app.composio.dev)
- [Available Tools](https://composio.dev/tools)

## FAQ

**Q: When to use Mastra vs AI SDK?**  
A: Use Mastra for agent-first architecture with built-in state management. Use AI SDK for direct model interaction with more control.

**Q: Can I use both?**  
A: Yes! Both connect to the same Composio MCP endpoint. Use whichever fits your architecture.

**Q: Tools vs Toolsets?**  
A: Tools = static (same for all requests). Toolsets = dynamic (varies per user/request).

**Q: How to handle tool failures?**  
A: Mastra agent will receive errors and can retry or explain. Set appropriate `maxSteps`.

**Q: Session lifetime?**  
A: ~30 minutes. Cache and reuse, but implement cleanup for expired sessions.

## Troubleshooting

**"Cannot connect to MCP"**
- Verify Composio API key is correct
- Check session.mcp.url is valid
- Ensure network connectivity

**"Authentication required"**
- User needs to auth at https://app.composio.dev/apps
- Use CLI: `composio auth <toolkit> --user-id <id>`

**"Tool not found"**
- Verify toolkit name (case-sensitive)
- Check toolkit is in session.toolkits array

**"Rate limit exceeded"**
- Implement exponential backoff
- Cache sessions to reduce API calls

---

**Need help?** Join Composio Discord: https://discord.gg/composio
