/**
 * Article Q&A and follow-up question generation for the extract panel.
 *
 * QwkSearch generated these with the Vercel AI SDK and its own model registry;
 * here they run through LobeHub's `AiGenerationService`, so the user's
 * configured providers, key vaults and tracing apply. The request may name a
 * `provider`/`model`; otherwise the server default agent model is used.
 */
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@lobechat/business-const';
import { Hono } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { AiGenerationService } from '@/server/services/aiGeneration';

import { requireUserId, UnauthorizedError, unauthorizedResponse } from '../../qwksearch/session';

interface ChatHistoryEntry {
  content: string;
  role: string;
}

interface ArticleAiBody {
  article?: string;
  chatHistory?: ChatHistoryEntry[];
  maxQuestions?: number;
  model?: string;
  provider?: string;
  question?: string;
}

export const ARTICLE_MAX_CHARS = 15_000;

/** Normalise a free-form list of questions the model returned. */
export const parseQuestionList = (raw: unknown, maxQuestions: number): string[] => {
  const lines = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split('\n');

  return lines
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .map((q) => q.replace(/^[\d\-*.)]+\s*/, '').trim())
    .filter((q) => q.length > 10)
    .slice(0, maxQuestions);
};

const resolveModel = (body: ArticleAiBody) => ({
  model: body.model || DEFAULT_MODEL,
  provider: body.provider || DEFAULT_PROVIDER,
});

export const articleAiApp = new Hono();

articleAiApp.post('/api/agent/article-qa', async (c) => {
  try {
    const userId = await requireUserId(c.req.raw.headers);
    const body = (await c.req.json()) as ArticleAiBody;
    const { article, question, chatHistory = [] } = body;

    if (!article || !question) {
      return c.json({ error: 'Article and question are required' }, 400);
    }

    const historyContext =
      chatHistory.length > 0
        ? `\n\nPrevious conversation:\n${chatHistory
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n')}`
        : '';

    const service = new AiGenerationService(await getServerDB(), userId);
    const { model, provider } = resolveModel(body);

    const result = await service.generateObject<{ answer: string }>(
      {
        messages: [
          {
            content:
              'You are a helpful AI assistant that answers questions about articles. Provide clear, concise, and accurate answers based on the article content provided. If the answer is not in the article, say so.',
            role: 'system',
          },
          {
            content: `Article content:\n${article.slice(0, ARTICLE_MAX_CHARS)}\n${historyContext}\n\nUser question: ${question}\n\nAnswer based on the article content above.`,
            role: 'user',
          },
        ],
        model,
        provider,
        schema: {
          description: 'Answer to a question about an article',
          name: 'article_answer',
          schema: {
            additionalProperties: false,
            properties: { answer: { type: 'string' } },
            required: ['answer'],
            type: 'object',
          },
        },
      },
      { tracing: { scenario: 'qwksearch_article_qa' } },
    );

    return c.json({ content: result.answer, success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[qwksearch] article QA failed:', error);
    return c.json(
      { details: (error as Error)?.message, error: 'An error occurred while generating the answer' },
      500,
    );
  }
});

articleAiApp.post('/api/agent/article-followups', async (c) => {
  try {
    const userId = await requireUserId(c.req.raw.headers);
    const body = (await c.req.json()) as ArticleAiBody;
    const { article, chatHistory = [], maxQuestions = 5 } = body;

    if (!article) return c.json({ error: 'Article is required' }, 400);

    const historyContext =
      chatHistory.length > 0
        ? `\n\nPrevious questions asked:\n${chatHistory
            .filter((msg) => msg.role === 'user')
            .map((msg) => `- ${msg.content}`)
            .join('\n')}`
        : '';

    const service = new AiGenerationService(await getServerDB(), userId);
    const { model, provider } = resolveModel(body);

    const result = await service.generateObject<{ questions: string[] }>(
      {
        messages: [
          {
            content: `You are a helpful AI that generates insightful follow-up questions about articles. Generate ${maxQuestions} thought-provoking questions that would help readers understand the article better.`,
            role: 'system',
          },
          {
            content: `Article content:\n${article.slice(0, ARTICLE_MAX_CHARS)}\n${historyContext}\n\nGenerate ${maxQuestions} follow-up questions that would help readers dive deeper into this article.`,
            role: 'user',
          },
        ],
        model,
        provider,
        schema: {
          description: 'Follow-up questions about an article',
          name: 'article_followups',
          schema: {
            additionalProperties: false,
            properties: { questions: { items: { type: 'string' }, type: 'array' } },
            required: ['questions'],
            type: 'object',
          },
        },
      },
      { tracing: { scenario: 'qwksearch_article_followups' } },
    );

    return c.json({ extract: parseQuestionList(result.questions, maxQuestions), success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[qwksearch] article follow-ups failed:', error);
    return c.json(
      {
        details: (error as Error)?.message,
        error: 'An error occurred while generating follow-up questions',
      },
      500,
    );
  }
});
