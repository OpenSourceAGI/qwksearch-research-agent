import { buildPrefillUrl, getProvider } from './providers';
import { HARD_LIMIT_CHARS } from './transcript';
import type { ChatProvider } from './types';

/** How the transcript reaches the destination site. */
export type HandoffMode =
  /** Already in the opened URL's query string; the destination tab only confirms it. */
  | 'url'
  /** The destination tab's content script pastes it into the prompt box. */
  | 'fill'
  /** Too big to fill; the user pastes from the clipboard. */
  | 'clipboard';

export interface HandoffPlan {
  url: string;
  mode: HandoffMode;
}

export function planHandoff(provider: ChatProvider, text: string): HandoffPlan {
  if (text.length > HARD_LIMIT_CHARS) return { url: provider.newChatUrl, mode: 'clipboard' };
  const prefill = buildPrefillUrl(provider, text);
  return prefill ? { url: prefill, mode: 'url' } : { url: provider.newChatUrl, mode: 'fill' };
}

export interface PendingHandoff {
  providerId: string;
  mode: HandoffMode;
  /** Kept so the destination tab can paste it (also when URL prefill turns out not to work); omitted for clipboard-only. */
  text?: string;
  createdAt: number;
}

export const PENDING_TTL_MS = 5 * 60_000;

export type HandoffRequest =
  | { type: 'chatHandoff:open'; providerId: string; text: string }
  | { type: 'chatHandoff:claim' };

export interface OpenResponse {
  ok: boolean;
  mode?: HandoffMode;
  error?: string;
}

export type ClaimResponse = { pending: Pick<PendingHandoff, 'mode' | 'text' | 'providerId'> | null };

/** Used by the background worker to turn an untrusted request into a tab to open. */
export function resolveOpenRequest(
  request: { providerId?: unknown; text?: unknown },
  now = Date.now()
): { provider: ChatProvider; plan: HandoffPlan; pending: PendingHandoff } | null {
  const provider = typeof request.providerId === 'string' ? getProvider(request.providerId) : undefined;
  if (!provider || typeof request.text !== 'string' || !request.text.trim()) return null;
  const plan = planHandoff(provider, request.text);
  return {
    provider,
    plan,
    pending: {
      providerId: provider.id,
      mode: plan.mode,
      text: plan.mode === 'clipboard' ? undefined : request.text,
      createdAt: now,
    },
  };
}
