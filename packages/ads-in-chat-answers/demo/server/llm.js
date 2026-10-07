// Shared by the demo's functions: which model to call, read from the
// environment. Any OpenAI-compatible endpoint works; OpenRouter is the
// default because one key reaches every provider.
import { createOpenAICompatibleComplete } from '../../src/server/index.ts';

export function getComplete() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;
  const baseUrl =
    process.env.LLM_BASE_URL ||
    (process.env.OPENAI_API_KEY && !process.env.LLM_API_KEY && !process.env.OPENROUTER_API_KEY
      ? 'https://api.openai.com/v1'
      : undefined);
  const model =
    process.env.LLM_MODEL || (baseUrl === 'https://api.openai.com/v1' ? 'gpt-4o-mini' : undefined);
  return createOpenAICompatibleComplete({
    apiKey,
    baseUrl,
    model,
    headers: { 'HTTP-Referer': 'https://qwksearch.com', 'X-Title': 'QwkSearch ads demo' },
  });
}
