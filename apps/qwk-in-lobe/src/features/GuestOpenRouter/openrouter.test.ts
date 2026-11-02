import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GUEST_FREE_MODEL,
  looksLikeOpenRouterKey,
  normalizeOpenRouterKey,
  OpenRouterError,
  verifyOpenRouterKey,
} from './openrouter';

const KEY = 'sk-or-v1-0123456789abcdef';

describe('guest OpenRouter client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('normalizes and shape-checks keys', () => {
    expect(normalizeOpenRouterKey(`  Bearer ${KEY} `)).toBe(KEY);
    expect(looksLikeOpenRouterKey(KEY)).toBe(true);
    expect(looksLikeOpenRouterKey('sk-proj-abc')).toBe(false);
    expect(looksLikeOpenRouterKey('')).toBe(false);
  });

  it('verifies a key against OpenRouter directly', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: { is_free_tier: true, label: 'demo', limit: null, usage: 0 } }),
    );

    await expect(verifyOpenRouterKey(KEY)).resolves.toEqual({
      isFreeTier: true,
      label: 'demo',
      limit: null,
      usage: 0,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/key');
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
  });

  it('surfaces OpenRouter error messages for a rejected key', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { code: 401, message: 'No auth credentials found' } },
        { status: 401 },
      ),
    );

    const error = await verifyOpenRouterKey(KEY).catch((e) => e);
    expect(error).toBeInstanceOf(OpenRouterError);
    expect(error.message).toBe('No auth credentials found');
    expect(error.status).toBe(401);
  });

  it('points a spent account at the credits page and the free model', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { message: 'Insufficient credits' } }, { status: 402 }),
    );

    const error = await verifyOpenRouterKey(KEY).catch((e) => e);

    expect(error).toBeInstanceOf(OpenRouterError);
    expect(error.status).toBe(402);
    expect(error.message).toContain('Insufficient credits');
    expect(error.message).toContain('openrouter.ai/settings/credits');
    expect(error.message).toContain(GUEST_FREE_MODEL);
  });
});
