/**
 * The `getCompletion` both editor engines default to: a POST to the host's
 * rewrite route, with the whole instruction — system rules, context window and
 * the text to act on — collapsed into one `prompt` string.
 *
 * It lives here rather than next to either engine because both need it. The
 * Tiptap `Ai` extension takes it from the plugin registry
 * (`src/editor-views/config/pluginRegistry.tsx`, where the endpoint is a user
 * setting) and the Plate editor takes it from `AiKit`
 * (`src/docs-agent/plate/kits/ai-kit.tsx`); a single definition keeps the two
 * asking the same route the same way, so a document rewritten in one engine
 * reads like a document rewritten in the other.
 */

import { createStreamingCompletion } from './createStreamingCompletion';
import { mockAiCompletion } from './mockCompletion';
import { buildAiUserPrompt } from './prompt';

import type { AiCompletionFn } from '../types';

/**
 * Default endpoint the AI writing assistant posts to. It matches the
 * `{ text, prompt } -> { rewrittenText }` contract the QwkSearch web app
 * serves at `/api/agent/rewrite`, which is where this editor is mounted.
 * Hosts without that route point it at their own (or clear it) — an empty
 * value falls back to the offline demo transform rather than failing every
 * action.
 */
export const DEFAULT_AI_ENDPOINT = '/api/agent/rewrite';

/**
 * Builds a completion function for a rewrite endpoint. The request carries the
 * whole instruction as one prompt, so a plain rewrite route needs no changes to
 * serve every command in the menu. An empty `endpoint` returns the offline demo
 * transform, which is what keeps the menu usable with no backend at all.
 *
 * `stream: true` asks for a token stream, which is what fills the review panel
 * in as the model writes. It is a hint, not a requirement: a route that ignores
 * it answers with its usual JSON body and `createStreamingCompletion` reports
 * that as a single chunk, so the panel still works — it just arrives at once.
 */
export function createRewriteCompletion(endpoint: string): AiCompletionFn {
  if (!endpoint) return mockAiCompletion;

  return createStreamingCompletion({
    endpoint,
    body: (request) => ({
      // `prompt` carries the real instruction; `text` is the field such routes
      // validate as non-empty, so the generate commands (which run with no
      // selection) fall back to their context and instruction.
      text: request.selectedText || request.documentText || request.instruction,
      prompt: `${request.systemPrompt}\n\n${buildAiUserPrompt(request)}`,
      command: request.commandId,
      stream: true,
    }),
  });
}
