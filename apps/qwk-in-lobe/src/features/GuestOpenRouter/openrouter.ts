/**
 * Browser-side OpenRouter helpers for the key prompt.
 *
 * The visitor's key is checked against OpenRouter straight from the browser
 * before it is saved to their account, where the LobeHub chat reads it.
 * OpenRouter answers CORS requests, so the check goes from this tab to
 * openrouter.ai and nowhere else.
 */

export const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/keys';
export const GUEST_DEFAULT_MODEL = 'openrouter/auto';

/**
 * The model that answers without credits.
 *
 * `openrouter/auto` picks a paid model, so an account whose balance is spent
 * gets a 402 on every message. `openrouter/free` routes to the free models,
 * which ignore the balance.
 */
export const GUEST_FREE_MODEL = 'openrouter/free';

export class OpenRouterError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
  }
}

const appHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'X-Title': 'QwkSearch LobeHub' };
  // OpenRouter uses the referer to attribute traffic to an app.
  if (typeof location !== 'undefined' && location.origin) headers['HTTP-Referer'] = location.origin;
  return headers;
};

/** Pull a readable message out of an OpenRouter error body. */
const readError = async (res: Response): Promise<OpenRouterError> => {
  let message = `${res.status} ${res.statusText}`.trim();
  try {
    const body: any = await res.json();
    const detail = body?.error?.message ?? body?.message;
    if (typeof detail === 'string' && detail) message = detail;
  } catch {
    // keep the status line
  }
  // 402 is the balance, not the key: paid models are refused while the free
  // ones still answer, so the message says which way out exists.
  if (res.status === 402) {
    message = `${message}. Add credits at https://openrouter.ai/settings/credits, or switch the model to ${GUEST_FREE_MODEL} to keep chatting for free.`;
  }
  return new OpenRouterError(message, res.status);
};

/** Trims whitespace and a pasted `Bearer ` prefix. */
export const normalizeOpenRouterKey = (key: string) => key.trim().replace(/^bearer\s+/i, '');

/** A cheap shape check so obvious typos are caught before a network round trip. */
export const looksLikeOpenRouterKey = (key: string) => /^sk-or-[\w-]{10,}$/.test(key);

export interface OpenRouterKeyInfo {
  isFreeTier?: boolean;
  label?: string;
  limit?: number | null;
  usage?: number;
}

/**
 * Checks the key against OpenRouter's `GET /key` endpoint.
 * Resolves with the key's metadata, rejects with `OpenRouterError` when it is refused.
 */
export const verifyOpenRouterKey = async (
  apiKey: string,
  signal?: AbortSignal,
): Promise<OpenRouterKeyInfo> => {
  const res = await fetch(`${OPENROUTER_API_BASE}/key`, {
    headers: { Authorization: `Bearer ${apiKey}`, ...appHeaders() },
    signal,
  });

  if (!res.ok) throw await readError(res);

  const body: any = await res.json().catch(() => ({}));
  const data = body?.data ?? {};

  return {
    isFreeTier: data.is_free_tier,
    label: data.label,
    limit: data.limit,
    usage: data.usage,
  };
};
