/**
 * @fileoverview "Sign in with QwkSearch" for embedding hosts: the auth client
 * reads the host's session endpoint, sends sign-in through the connect flow,
 * and attaches the linked key to QwkSearch API requests only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildConnectStartUrl,
  createQwkSearchConnectAuthClient,
  getQwkSearchApiKey,
  isQwkSearchApiRequest,
  setQwkSearchApiKey,
} from '../src/lib/qwksearch-connect';

const ORIGIN = 'https://qwksearch.com';

describe('isQwkSearchApiRequest', () => {
  it('matches only <origin>/api/ URLs', () => {
    expect(isQwkSearchApiRequest('https://qwksearch.com/api/agent/chat', ORIGIN)).toBe(true);
    expect(isQwkSearchApiRequest(new URL('https://qwksearch.com/api/x'), ORIGIN)).toBe(true);
    expect(isQwkSearchApiRequest('https://qwksearch.com/login', ORIGIN)).toBe(false);
    expect(isQwkSearchApiRequest('https://qwksearch.com.evil.com/api/x', ORIGIN)).toBe(false);
    expect(isQwkSearchApiRequest('/api/settings', ORIGIN)).toBe(false);
  });
});

describe('buildConnectStartUrl', () => {
  it('appends the page to come back to', () => {
    expect(buildConnectStartUrl('/api/qwksearch/connect', '/doc?x=1')).toBe(
      '/api/qwksearch/connect?returnTo=%2Fdoc%3Fx%3D1',
    );
    expect(buildConnectStartUrl('/c?a=1', '/')).toBe('/c?a=1&returnTo=%2F');
  });
});

describe('createQwkSearchConnectAuthClient', () => {
  const seen: { url: string; headers: Headers }[] = [];
  let sessionBody: unknown;

  beforeEach(() => {
    seen.length = 0;
    setQwkSearchApiKey(null);
    sessionBody = { connected: false };
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      seen.push({ url, headers: new Headers(init?.headers) });
      if (url === '/api/qwksearch/session') return new Response(JSON.stringify(sessionBody), { status: 200 });
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => setQwkSearchApiKey(null));

  const makeClient = () =>
    createQwkSearchConnectAuthClient({
      sessionUrl: '/api/qwksearch/session',
      connectUrl: '/api/qwksearch/connect',
      disconnectUrl: '/api/qwksearch/disconnect',
    });

  it('reports no user while the account is not linked', async () => {
    expect(await makeClient().getSession()).toEqual({ data: null });
    expect(getQwkSearchApiKey()).toBeNull();
  });

  it('exposes the linked user and attaches the key to QwkSearch API calls only', async () => {
    sessionBody = { connected: true, user: { id: 'u1', name: 'Ada' }, apiKey: 'qwk_abc', plan: 'free' };
    const client = makeClient();
    expect(await client.getSession()).toEqual({ data: { user: { id: 'u1', name: 'Ada' } } });
    expect(getQwkSearchApiKey()).toBe('qwk_abc');

    await window.fetch('https://qwksearch.com/api/agent/chats');
    await window.fetch('https://debate-ai.com/api/settings');
    const qwk = seen.find((r) => r.url === 'https://qwksearch.com/api/agent/chats');
    const own = seen.find((r) => r.url === 'https://debate-ai.com/api/settings');
    expect(qwk?.headers.get('x-api-key')).toBe('qwk_abc');
    expect(own?.headers.get('x-api-key')).toBeNull();
  });

  it('signs out through the host and stops sending the key', async () => {
    sessionBody = { connected: true, user: { id: 'u1', name: 'Ada' }, apiKey: 'qwk_abc' };
    const client = makeClient();
    await client.getSession();
    const onSuccess = vi.fn();
    await client.signOut({ fetchOptions: { onSuccess } });
    expect(seen.some((r) => r.url === '/api/qwksearch/disconnect')).toBe(true);
    expect(getQwkSearchApiKey()).toBeNull();
    expect(onSuccess).toHaveBeenCalled();
  });
});
