/**
 * Composio + Mastra Integration Examples
 * Shows how to use Composio tools with Mastra agents
 */

import 'dotenv/config';
import { Composio } from '@composio/core';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { openai } from '@ai-sdk/openai';
import {
  ComposioMastraSession,
  createComposioMastraAgent,
  createDynamicComposioAgent,
} from '../src/tools/composio-mastra';

// ============================================================================
// Example 1: Basic Composio + Mastra Agent
// ============================================================================

async function example1_BasicAgent() {
  console.log('Example 1: Basic Composio + Mastra agent\n');

  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY!,
  });

  // Create Composio Tool Router session
  const session = await composio.toolsets.create({
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL'],
  });

  // Connect Mastra MCP client
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

  // Get tools from Composio MCP
  const tools = await mcp.listTools();

  console.log('Tools available:', Object.keys(tools).length);

  // Create Mastra agent
  const agent = new Agent({
    id: 'email-agent',
    name: 'Email Assistant',
    instructions:
      'You are an email assistant. Use Gmail tools to help users manage their inbox.',
    model: openai('gpt-4o'),
    tools,
  });

  // Execute agent
  const result = await agent.generate(
    'Check my 5 most recent unread emails and summarize them',
    { maxSteps: 10 }
  );

  console.log('\nAgent response:', result.text);

  // Cleanup
  await mcp.disconnect();
}

// ============================================================================
// Example 2: Using the Session Wrapper
// ============================================================================

async function example2_SessionWrapper() {
  console.log('\nExample 2: Using ComposioMastraSession wrapper\n');

  const session = new ComposioMastraSession({
    composioApiKey: process.env.COMPOSIO_API_KEY!,
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL', 'SLACK'],
    agent: {
      id: 'multi-tool-agent',
      name: 'Multi-Tool Assistant',
      instructions: 'Use Gmail and Slack tools to help the user.',
      model: openai('gpt-4o'),
      maxSteps: 10,
    },
  });

  try {
    const result = await session.generate(
      'Check my unread emails and post a summary to #general on Slack'
    );

    console.log('Response:', result.text);
    console.log('\nTool calls:', result.steps?.length || 0);
  } finally {
    await session.cleanup();
  }
}

// ============================================================================
// Example 3: One-Shot Agent Creation
// ============================================================================

async function example3_QuickAgent() {
  console.log('\nExample 3: Quick agent creation\n');

  const session = await createComposioMastraAgent({
    composioApiKey: process.env.COMPOSIO_API_KEY!,
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['NOTION'],
    agent: {
      id: 'notion-agent',
      name: 'Notion Assistant',
      instructions: 'Help with Notion tasks using available tools.',
      model: openai('gpt-4o'),
    },
  });

  try {
    const result = await session.generate(
      'Create a new Notion page titled "Meeting Notes" with today\'s date'
    );

    console.log('Result:', result.text);
  } finally {
    await session.cleanup();
  }
}

// ============================================================================
// Example 4: Multi-Toolkit Workflow
// ============================================================================

async function example4_MultiToolkitWorkflow() {
  console.log('\nExample 4: Multi-toolkit workflow\n');

  const session = new ComposioMastraSession({
    composioApiKey: process.env.COMPOSIO_API_KEY!,
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL', 'NOTION', 'SLACK', 'GITHUB'],
    agent: {
      id: 'workflow-agent',
      name: 'Workflow Automation',
      instructions: `You are a workflow automation agent with access to Gmail, Notion, Slack, and GitHub.
Break down complex workflows into steps and execute them using the available tools.
Explain what you're doing at each step.`,
      model: openai('gpt-4o'),
      maxSteps: 20,
    },
  });

  try {
    const result = await session.generate(`
Automated workflow:
1. Find emails with "bug report" in subject
2. Create a Notion page for each bug with details
3. Post a summary to #engineering on Slack
4. Create GitHub issues for critical bugs
    `);

    console.log('Workflow result:', result.text);

    // Show tool usage
    if (result.steps) {
      console.log('\nTool execution trace:');
      result.steps.forEach((step, i) => {
        if (step.toolCalls) {
          step.toolCalls.forEach((call) => {
            console.log(`${i + 1}. ${call.toolName}`);
          });
        }
      });
    }
  } finally {
    await session.cleanup();
  }
}

// ============================================================================
// Example 5: Dynamic Per-Request Toolkits
// ============================================================================

async function example5_DynamicToolkits() {
  console.log('\nExample 5: Dynamic per-request toolkits\n');

  const agent = await createDynamicComposioAgent({
    composioApiKey: process.env.COMPOSIO_API_KEY!,
    agent: {
      id: 'dynamic-agent',
      name: 'Dynamic Assistant',
      instructions: 'Use the available tools to help the user.',
      model: openai('gpt-4o'),
      maxSteps: 10,
    },
  });

  // Request 1: Gmail only
  const result1 = await agent.generate({
    userId: 'user-1',
    toolkits: ['GMAIL'],
    prompt: 'How many unread emails do I have?',
  });

  console.log('User 1 (Gmail):', result1.text);

  // Request 2: Slack only
  const result2 = await agent.generate({
    userId: 'user-2',
    toolkits: ['SLACK'],
    prompt: 'What channels am I in?',
  });

  console.log('User 2 (Slack):', result2.text);

  // Request 3: Both
  const result3 = await agent.generate({
    userId: 'user-3',
    toolkits: ['GMAIL', 'SLACK'],
    prompt: 'Check my emails and notify me on Slack',
  });

  console.log('User 3 (Both):', result3.text);
}

// ============================================================================
// Example 6: Using Toolsets (Dynamic Config)
// ============================================================================

async function example6_Toolsets() {
  console.log('\nExample 6: Using toolsets for dynamic config\n');

  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY!,
  });

  const session = await composio.toolsets.create({
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL', 'CALENDAR'],
  });

  const mcp = new MCPClient({
    id: 'composio-mcp',
    servers: {
      composio: {
        url: new URL(session.mcp.url),
        requestInit: {
          headers: { 'x-api-key': process.env.COMPOSIO_API_KEY! },
        },
      },
    },
  });

  try {
    // Use toolsets instead of tools for dynamic config
    const toolsets = await mcp.listToolsets();

    const agent = new Agent({
      id: 'calendar-agent',
      name: 'Calendar Assistant',
      instructions: 'Help with calendar and email coordination.',
      model: openai('gpt-4o'),
      toolsets, // Note: toolsets instead of tools
    });

    const result = await agent.generate(
      'Schedule a meeting for tomorrow at 2pm based on my calendar availability',
      { maxSteps: 10 }
    );

    console.log('Result:', result.text);
  } finally {
    await mcp.disconnect();
  }
}

// ============================================================================
// Example 7: Error Handling and Retry
// ============================================================================

async function example7_ErrorHandling() {
  console.log('\nExample 7: Error handling and retry\n');

  const session = new ComposioMastraSession({
    composioApiKey: process.env.COMPOSIO_API_KEY!,
    userId: process.env.COMPOSIO_USER_ID!,
    toolkits: ['GMAIL'],
    agent: {
      id: 'robust-agent',
      name: 'Robust Agent',
      instructions: 'Handle errors gracefully and provide helpful feedback.',
      model: openai('gpt-4o'),
      maxSteps: 5,
    },
  });

  try {
    const result = await session.generate(
      'Send an email to invalid@example.com saying hello'
    );

    console.log('Success:', result.text);
  } catch (error) {
    console.error('Error:', error);

    // Retry with different prompt
    if (error instanceof Error && error.message.includes('authentication')) {
      console.log('\nRetrying with auth check...');
      const retry = await session.generate(
        'Check if Gmail is authenticated and explain what I need to do'
      );
      console.log('Retry result:', retry.text);
    }
  } finally {
    await session.cleanup();
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  // Validate env vars
  if (!process.env.COMPOSIO_API_KEY) {
    console.error('Error: COMPOSIO_API_KEY is required');
    process.exit(1);
  }

  if (!process.env.COMPOSIO_USER_ID) {
    console.error('Error: COMPOSIO_USER_ID is required');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is required');
    process.exit(1);
  }

  try {
    // Run examples (uncomment to test)
    // await example1_BasicAgent();
    // await example2_SessionWrapper();
    // await example3_QuickAgent();
    // await example4_MultiToolkitWorkflow();
    // await example5_DynamicToolkits();
    // await example6_Toolsets();
    // await example7_ErrorHandling();

    console.log('\nAll examples completed!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export {
  example1_BasicAgent,
  example2_SessionWrapper,
  example3_QuickAgent,
  example4_MultiToolkitWorkflow,
  example5_DynamicToolkits,
  example6_Toolsets,
  example7_ErrorHandling,
};
