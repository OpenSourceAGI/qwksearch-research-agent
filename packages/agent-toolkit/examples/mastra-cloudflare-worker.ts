/**
 * @fileoverview Mastra + Cloudflare Workers Example
 *
 * Complete example showing how to use Mastra memory management
 * within a Cloudflare Worker with D1 or KV storage.
 *
 * Deploy:
 * 1. Add wrangler.toml configuration
 * 2. Create D1 database: wrangler d1 create qwksearch-memory
 * 3. Deploy: wrangler deploy
 */

import { createMastraMemory } from '../src/memory/mastra-integration';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { CloudflareEnv } from '../src/memory/mastra-integration';

/**
 * Cloudflare Worker with Mastra Memory Integration
 */
export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize Mastra memory with D1
      const memoryManager = createMastraMemory({
        storage: 'd1',
        env,
        tableName: 'mastra_memories',
      });

      // Route: POST /chat - Send message and get AI response with memory
      if (url.pathname === '/chat' && request.method === 'POST') {
        const { userId, threadId, message, provider = 'openai' } = await request.json() as any;

        if (!userId || !message) {
          return new Response(
            JSON.stringify({ error: 'userId and message are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Get conversation history
        const history = await memoryManager.recallConversation(userId, threadId || 'default', 10);

        // Get relevant context
        const context = await memoryManager.getRelevantContext(userId, message, 5);

        // Build prompt with history and context
        let prompt = '';
        if (context) {
          prompt += `Relevant context:\n${context}\n\n`;
        }
        if (history.length > 0) {
          prompt += `Conversation history:\n`;
          history.forEach(h => {
            prompt += `${h.role}: ${h.content}\n`;
          });
          prompt += '\n';
        }
        prompt += `User: ${message}\n\nAssistant:`;

        // Create agent with model
        const model = provider === 'anthropic'
          ? anthropic('claude-3-5-sonnet-20241022')
          : openai('gpt-4o');

        const agent = await memoryManager.createAgent({
          id: 'chat-agent',
          name: 'Chat Assistant',
          instructions: `You are a helpful AI assistant with memory. Use the conversation history and context to provide relevant responses.`,
          model,
          userId,
          threadId: threadId || 'default',
        });

        // Generate response
        const response = await agent.generate(prompt, { maxSteps: 5 });

        // Store user message
        await memoryManager.storeMessage(userId, threadId || 'default', 'user', message);

        // Store assistant response
        await memoryManager.storeMessage(
          userId,
          threadId || 'default',
          'assistant',
          response.text || ''
        );

        return new Response(
          JSON.stringify({
            response: response.text,
            threadId: threadId || 'default',
            historyLength: history.length,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Route: GET /history - Get conversation history
      if (url.pathname === '/history' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        const threadId = url.searchParams.get('threadId') || 'default';
        const limit = parseInt(url.searchParams.get('limit') || '20');

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const history = await memoryManager.recallConversation(userId, threadId, limit);

        return new Response(JSON.stringify({ history }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Route: POST /memory - Store a fact/memory manually
      if (url.pathname === '/memory' && request.method === 'POST') {
        const { userId, content, importance = 1.0, type = 'fact', metadata } = await request.json() as any;

        if (!userId || !content) {
          return new Response(
            JSON.stringify({ error: 'userId and content are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const storage = memoryManager.getStorage();
        const memoryId = await storage.insertMemory(userId, type, content, importance, metadata);

        return new Response(
          JSON.stringify({ id: memoryId, success: true }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Route: GET /search - Search memories
      if (url.pathname === '/search' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        const query = url.searchParams.get('query') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10');

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const storage = memoryManager.getStorage();
        const memories = query
          ? await storage.findSimilarMemories(userId, query, limit)
          : await storage.findMemories(userId, undefined, limit);

        return new Response(
          JSON.stringify({
            memories: memories.map(m => ({
              id: m.id,
              content: m.content,
              type: m.memory_type,
              importance: m.importance,
              created_at: m.created_at,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Route: DELETE /memory/:id - Delete a memory
      if (url.pathname.startsWith('/memory/') && request.method === 'DELETE') {
        const memoryId = url.pathname.split('/')[2];

        if (!memoryId) {
          return new Response(
            JSON.stringify({ error: 'Memory ID is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const storage = memoryManager.getStorage();
        await storage.deleteMemory(memoryId);

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Default route
      return new Response(
        JSON.stringify({
          message: 'Mastra + Cloudflare Workers Memory API',
          endpoints: {
            'POST /chat': 'Send a message with memory context',
            'GET /history': 'Get conversation history',
            'POST /memory': 'Store a memory manually',
            'GET /search': 'Search memories',
            'DELETE /memory/:id': 'Delete a memory',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};

/**
 * Example wrangler.toml configuration:
 *
 * ```toml
 * name = "mastra-memory-worker"
 * main = "src/worker.ts"
 * compatibility_date = "2024-03-10"
 * compatibility_flags = ["nodejs_compat"]
 *
 * [vars]
 * OPENAI_API_KEY = "sk-..."
 * ANTHROPIC_API_KEY = "sk-ant-..."
 *
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "mastra-memory"
 * database_id = "..."
 *
 * [[kv_namespaces]]
 * binding = "KV"
 * id = "..."
 * ```
 *
 * Example usage:
 *
 * ```bash
 * # Chat with memory
 * curl -X POST https://your-worker.workers.dev/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": "user-123",
 *     "threadId": "conversation-1",
 *     "message": "What is my name?",
 *     "provider": "openai"
 *   }'
 *
 * # Get history
 * curl "https://your-worker.workers.dev/history?userId=user-123&threadId=conversation-1"
 *
 * # Store a memory
 * curl -X POST https://your-worker.workers.dev/memory \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": "user-123",
 *     "content": "User prefers concise responses",
 *     "type": "preference",
 *     "importance": 0.8
 *   }'
 *
 * # Search memories
 * curl "https://your-worker.workers.dev/search?userId=user-123&query=preference"
 * ```
 */
