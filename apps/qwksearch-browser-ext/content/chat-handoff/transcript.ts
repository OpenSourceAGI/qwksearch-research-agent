import type { ChatMessage, ChatRole } from './types';

/** Above this the menu warns and offers to keep only the newest turns. */
export const SOFT_LIMIT_CHARS = 60_000;
/** Above this nothing is auto-filled into another site; the clipboard is the only route. */
export const HARD_LIMIT_CHARS = 400_000;

const ROLE_LABEL: Record<ChatRole, string> = { user: 'User', assistant: 'Assistant' };

/** Drops empty turns and merges consecutive turns by the same speaker. */
export function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const text = m.text.replace(/\r\n?/g, '\n').trim();
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role && prev.text === text) continue;
    out.push({ role: m.role, text });
  }
  return out;
}

/** Clean Markdown: one `## User` / `## Assistant` section per turn, in order. */
export function formatTranscript(messages: ChatMessage[], opts: { source?: string; omitted?: number } = {}): string {
  const parts: string[] = [];
  if (opts.source) parts.push(`# Conversation with ${opts.source}`);
  if (opts.omitted) {
    parts.push(`_The ${opts.omitted} earliest message${opts.omitted === 1 ? ' was' : 's were'} omitted because the conversation is long._`);
  }
  for (const m of messages) parts.push(`## ${ROLE_LABEL[m.role]}\n\n${m.text}`);
  return parts.join('\n\n') + '\n';
}

export interface TruncatedChat {
  messages: ChatMessage[];
  omitted: number;
}

/**
 * Keeps the newest whole turns whose formatted size fits in `maxChars`. The
 * newest turn is always kept, even if alone it is over the limit.
 */
export function truncateMessages(messages: ChatMessage[], maxChars = SOFT_LIMIT_CHARS): TruncatedChat {
  let size = 0;
  let start = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = messages[i].text.length + 16;
    if (start < messages.length && size + cost > maxChars) break;
    size += cost;
    start = i;
  }
  return { messages: messages.slice(start), omitted: start };
}

/** The text sent to the destination chat: an instruction followed by the transcript. */
export function buildHandoffPrompt(transcript: string, source?: string): string {
  const from = source ? ` with ${source}` : '';
  return `Below is a conversation I was having${from}. Read it, then continue helping me from where it left off. I will send my next message after this one.\n\n${transcript}`;
}

/** Rough token estimate for the warning shown to the user (about 4 characters each). */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
