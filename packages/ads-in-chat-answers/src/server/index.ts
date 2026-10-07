/**
 * @fileoverview Server half: the HTTP handler behind the advertiser panel's
 * "Generate keywords" button and the ad-selection call, plus a model adapter
 * for any OpenAI-compatible chat endpoint (OpenRouter by default).
 *
 * Plain `fetch`/`Request`/`Response` only, so the same handler runs in a
 * Cloudflare Worker, a Vercel function, a Next.js route, Bun or Deno. The
 * model key stays on the server; the browser only ever sees the plan.
 */

import { generateKeywordPlan, type AdvertiserBrief } from '../keywords';
import { selectChatAds } from '../matching';
import type { Campaign, CompleteFn } from '../types';

export { generateKeywordPlan, heuristicKeywordPlan, buildKeywordPrompt, parseKeywordPlan } from '../keywords';
export type { AdvertiserBrief } from '../keywords';
export { selectChatAds, runAuction, scoreCampaign } from '../matching';
export type * from '../types';

export const DEFAULT_LLM_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_LLM_MODEL = 'openai/gpt-4o-mini';

/** Brief fields are advertiser input; cap them before they reach a prompt. */
const MAX_BRIEF_FIELD = 2_000;
const MAX_QUERY_LENGTH = 4_000;

/**
 * A model call that hangs holds the panel's spinner until the platform kills
 * the request; the heuristic fallback is a better answer than a 504.
 */
const LLM_TIMEOUT_MS = 20_000;

export interface OpenAICompatibleOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Extra headers, e.g. OpenRouter's `HTTP-Referer` / `X-Title`. */
  headers?: Record<string, string>;
}

/**
 * Wraps a `/chat/completions` endpoint as a `CompleteFn`. Works with OpenAI,
 * OpenRouter, Groq, Together, Workers AI's OpenAI route and Ollama.
 */
export function createOpenAICompatibleComplete(options: OpenAICompatibleOptions): CompleteFn {
  const {
    apiKey,
    baseUrl = DEFAULT_LLM_BASE_URL,
    model = DEFAULT_LLM_MODEL,
    fetchImpl = fetch,
    headers = {},
  } = options;
  return async ({ system, user }) => {
    const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`LLM request failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  };
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS_HEADERS },
  });
}

function str(value: unknown, max = MAX_BRIEF_FIELD): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function strList(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? value.map((v) => str(v, 200)).filter(Boolean).slice(0, limit) : [];
}

/** Validates a request body into a brief, or returns the reason it is unusable. */
export function parseBrief(body: unknown): AdvertiserBrief | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  const advertiser = str(b.advertiser, 120);
  const description = str(b.description);
  if (!advertiser) return '`advertiser` is required';
  if (description.length < 10) return '`description` must be at least 10 characters';
  return {
    advertiser,
    description,
    ...(str(b.website, 300) ? { website: str(b.website, 300) } : {}),
    products: strList(b.products, 20),
    existingKeywords: strList(b.existingKeywords, 50),
  };
}

export interface AdsHandlerOptions {
  /** The model used for keyword plans. Absent → heuristic plans only. */
  complete?: CompleteFn;
  /** Campaigns the `/select` route auctions over. Absent → `/select` is 404. */
  getCampaigns?: () => Campaign[] | Promise<Campaign[]>;
}

/**
 * Routes on the last path segment, so it can be mounted under any prefix:
 *
 * - `POST …/keywords` — body: `AdvertiserBrief` → `KeywordPlan`.
 * - `POST …/select` — body: `{ query, answer? }` → `{ answer, followUp }`.
 *
 * Always answers JSON, including errors.
 */
export async function handleAdsRequest(
  request: Request,
  options: AdsHandlerOptions = {}
): Promise<Response> {
  // A 204 must not carry a body; `new Response('null', { status: 204 })` throws.
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const route = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  if (route === 'keywords') {
    const brief = parseBrief(body);
    if (typeof brief === 'string') return json({ error: brief }, 400);
    return json(await generateKeywordPlan(brief, options.complete));
  }

  if (route === 'select' && options.getCampaigns) {
    const b = (body ?? {}) as Record<string, unknown>;
    const query = str(b.query, MAX_QUERY_LENGTH);
    if (!query) return json({ error: '`query` is required' }, 400);
    const campaigns = await options.getCampaigns();
    return json(selectChatAds(campaigns, { query, answer: str(b.answer, 20_000) }));
  }

  return json({ error: `Unknown route: ${route}` }, 404);
}
