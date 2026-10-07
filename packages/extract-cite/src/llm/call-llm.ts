/**
 * @fileoverview The one LLM call: an OpenAI-compatible chat-completions
 * request, OpenRouter by default, with a JSON-object reply parsed back out.
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export class CiteLLMError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CiteLLMError";
    this.status = status;
  }
}

export interface CallLLMOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  system: string;
  user: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

/** The API key from the environment, where there is an environment. */
export function envApiKey(): string | undefined {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return env?.OPENROUTER_API_KEY || undefined;
}

/**
 * Sends one system + user prompt and returns the reply parsed as a JSON object.
 * Throws `CiteLLMError` for a missing key, an HTTP error, an empty reply or a
 * reply that is not JSON.
 */
export async function callLLM(options: CallLLMOptions): Promise<{ json: unknown; model: string }> {
  const apiKey = options.apiKey || envApiKey();
  if (!apiKey) {
    throw new CiteLLMError(
      "No API key: pass `apiKey`, or set OPENROUTER_API_KEY.",
      401
    );
  }
  const model = options.model || DEFAULT_MODEL;
  const baseUrl = (options.baseUrl || OPENROUTER_BASE_URL).replace(/\/+$/, "");
  const doFetch = options.fetch || fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);
  let res: Response;
  try {
    res = await doFetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...options.headers,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    throw new CiteLLMError(
      aborted ? "The model call timed out." : `The model call failed: ${(err as Error)?.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error?.message || body?.error || `HTTP ${res.status}`;
    throw new CiteLLMError(`The model call failed: ${detail}`, res.status);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new CiteLLMError("The model returned an empty reply.", res.status);
  }
  return { json: parseJSONReply(content), model: body?.model || model };
}

/** Parses a reply that may be wrapped in a code fence or surrounded by prose. */
export function parseJSONReply(content: string): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new CiteLLMError("The model's reply was not valid JSON.");
  }
}
