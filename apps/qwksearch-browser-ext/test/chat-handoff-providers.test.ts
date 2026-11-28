import { describe, expect, it } from 'vitest';
import { searchEngines } from '../content/search-engines';
import { planHandoff, resolveOpenRequest } from '../content/chat-handoff/handoff';
import {
  CHAT_MATCHES,
  CHAT_PROVIDERS,
  MAX_PREFILL_URL_LENGTH,
  buildPrefillUrl,
  getProvider,
  otherProviders,
  providerForHost,
} from '../content/chat-handoff/providers';
import { HARD_LIMIT_CHARS } from '../content/chat-handoff/transcript';

describe('provider registry', () => {
  it('has unique ids and https URLs on the declared hosts', () => {
    expect(new Set(CHAT_PROVIDERS.map((p) => p.id)).size).toBe(CHAT_PROVIDERS.length);
    for (const p of CHAT_PROVIDERS) {
      const url = new URL(p.newChatUrl);
      expect(url.protocol, p.id).toBe('https:');
      expect(p.hosts, p.id).toContain(url.hostname);
      for (const match of p.matches) {
        expect(p.hosts.some((h) => match === `https://${h}/*`), `${p.id} ${match}`).toBe(true);
      }
    }
  });

  it('only matches the chat sites, never a wildcard host', () => {
    expect(CHAT_MATCHES.length).toBeGreaterThan(0);
    for (const m of CHAT_MATCHES) expect(m).toMatch(/^https:\/\/[a-z.]+\/\*$/);
  });

  it('looks providers up by id and host', () => {
    expect(getProvider('claude')?.name).toBe('Claude');
    expect(getProvider('nope')).toBeUndefined();
    expect(providerForHost('chat.openai.com')?.id).toBe('chatgpt');
    expect(providerForHost('example.com')).toBeUndefined();
  });

  it('excludes the current site from the menu', () => {
    const others = otherProviders('claude');

    expect(others.map((p) => p.id)).not.toContain('claude');
    expect(others).toHaveLength(CHAT_PROVIDERS.length - 1);
    expect(otherProviders(undefined)).toHaveLength(CHAT_PROVIDERS.length);
  });

  it('agrees with the Perplexity search URL already in search-engines.ts', () => {
    const engine = searchEngines.find((e) => e.name === 'Perplexity')!;

    expect(engine.url).toBe(`${getProvider('perplexity')!.newChatUrl}?q=`);
  });
});

describe('buildPrefillUrl', () => {
  it('encodes the prompt in the provider query parameter', () => {
    const url = new URL(buildPrefillUrl(getProvider('claude')!, 'hello & more\nline')!);

    expect(url.origin + url.pathname).toBe('https://claude.ai/new');
    expect(url.searchParams.get('q')).toBe('hello & more\nline');
  });

  it('returns null for providers without a prefill parameter', () => {
    expect(buildPrefillUrl(getProvider('gemini')!, 'hi')).toBeNull();
  });

  it('returns null when the URL would be too long', () => {
    expect(buildPrefillUrl(getProvider('claude')!, 'x'.repeat(MAX_PREFILL_URL_LENGTH))).toBeNull();
  });
});

describe('planHandoff', () => {
  it('uses URL prefill for short text on supporting sites', () => {
    const plan = planHandoff(getProvider('chatgpt')!, 'hi');

    expect(plan.mode).toBe('url');
    expect(plan.url).toContain('q=hi');
  });

  it('falls back to filling from the content script', () => {
    expect(planHandoff(getProvider('gemini')!, 'hi')).toEqual({ url: 'https://gemini.google.com/app', mode: 'fill' });
    expect(planHandoff(getProvider('chatgpt')!, 'x'.repeat(10_000)).mode).toBe('fill');
  });

  it('only opens the site for transcripts beyond the hard limit', () => {
    expect(planHandoff(getProvider('chatgpt')!, 'x'.repeat(HARD_LIMIT_CHARS + 1))).toEqual({
      url: 'https://chatgpt.com/',
      mode: 'clipboard',
    });
  });
});

describe('resolveOpenRequest', () => {
  it('rejects unknown providers and empty text', () => {
    expect(resolveOpenRequest({ providerId: 'evil', text: 'x' })).toBeNull();
    expect(resolveOpenRequest({ providerId: 'claude', text: '  ' })).toBeNull();
    expect(resolveOpenRequest({ providerId: 5, text: 'x' })).toBeNull();
  });

  it('builds the URL from the registry and keeps text for the destination tab', () => {
    const out = resolveOpenRequest({ providerId: 'gemini', text: 'hello' }, 42)!;

    expect(out.plan.url).toBe('https://gemini.google.com/app');
    expect(out.pending).toEqual({ providerId: 'gemini', mode: 'fill', text: 'hello', createdAt: 42 });
  });

  it('does not store text that is only meant for the clipboard', () => {
    const out = resolveOpenRequest({ providerId: 'claude', text: 'x'.repeat(HARD_LIMIT_CHARS + 1) })!;

    expect(out.pending.mode).toBe('clipboard');
    expect(out.pending.text).toBeUndefined();
  });
});
