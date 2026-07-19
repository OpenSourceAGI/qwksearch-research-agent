/**
 * OpenConnector + Mastra Integration Examples
 * Shows how to use OpenConnector tools with Mastra agents
 */

import 'dotenv/config';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { openai } from '@ai-sdk/openai';
import {
  OpenConnectorMastraSession,
  createOpenConnectorMastraAgent,
  createDynamicOpenConnectorAgent,
} from '../src/tools/open-connector-mastra';

// ============================================================================
// Example 1: Basic OpenConnector + Mastra Agent
// ============================================================================

async function example1_BasicAgent() {
  console.log('Example 1: Basic OpenConnector + Mastra agent\n');

  const baseUrl = process.env.OPEN_CONNECTOR_URL!;
  const adminToken = process.env.OPEN_CONNECTOR_ADMIN_TOKEN!;

  const mcp = new MCPClient({
    id: 'open-connector-mcp',
    servers: {
      openconnector: {
        url: new URL(`${baseUrl}/mcp/sse`),
        requestInit: {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      },
    },
  });

  const tools = await mcp.listTools();
  console.log('Tools available:', Object.keys(tools).length);

  const agent = new Agent({
    id: 'email-agent',
    name: 'Email Assistant',
    instructions:
      'You are an email assistant. Use Gmail tools to help users manage their inbox.',
    model: openai('gpt-4o'),
    tools,
  });

  const result = await agent.generate(
    'Check my 5 most recent unread emails and summarize them',
    { maxSteps: 10 }
  );

  console.log('\nAgent response:', result.text);
  await mcp.disconnect();
}

// ============================================================================
// Example 2: Using the Session Wrapper
// ============================================================================

async function example2_SessionWrapper() {
  console.log('\nExample 2: Using OpenConnectorMastraSession wrapper\n');

  const session = new OpenConnectorMastraSession({
    adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
    baseUrl: process.env.OPEN_CONNECTOR_URL!,
    userId: process.env.OPEN_CONNECTOR_USER_ID!,
    apps: ['gmail', 'slack'],
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

  const session = await createOpenConnectorMastraAgent({
    adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
    baseUrl: process.env.OPEN_CONNECTOR_URL!,
    userId: process.env.OPEN_CONNECTOR_USER_ID!,
    apps: ['notion'],
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
// Example 4: Dynamic Per-Request Apps
// ============================================================================

async function example4_DynamicApps() {
  console.log('\nExample 4: Dynamic per-request apps\n');

  const agent = await createDynamicOpenConnectorAgent({
    adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
    baseUrl: process.env.OPEN_CONNECTOR_URL!,
    agent: {
      id: 'dynamic-agent',
      name: 'Dynamic Assistant',
      instructions: 'Use the available tools to help the user.',
      model: openai('gpt-4o'),
      maxSteps: 10,
    },
  });

  const result1 = await agent.generate({
    userId: 'user-1',
    apps: ['gmail'],
    prompt: 'How many unread emails do I have?',
  });

  console.log('User 1 (Gmail):', result1.text);

  const result2 = await agent.generate({
    userId: 'user-2',
    apps: ['slack'],
    prompt: 'What channels am I in?',
  });

  console.log('User 2 (Slack):', result2.text);
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  if (!process.env.OPEN_CONNECTOR_ADMIN_TOKEN) {
    console.error('Error: OPEN_CONNECTOR_ADMIN_TOKEN is required');
    process.exit(1);
  }

  if (!process.env.OPEN_CONNECTOR_URL) {
    console.error('Error: OPEN_CONNECTOR_URL is required');
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
    // await example4_DynamicApps();

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
  example4_DynamicApps,
};
