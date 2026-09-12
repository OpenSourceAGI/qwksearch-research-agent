/**
 * @fileoverview Pins the shape the generated client resolves to on a non-2xx
 * response.
 *
 * Callers need the HTTP status to tell "your session expired" (401) apart from
 * "the server broke" (500). The client puts the *parsed body* in `error` and
 * never copies the status onto it, so the status has to come from `response`.
 * Reading `error.status` silently yields `undefined` and every branch on it is
 * dead code — which is how a stale-session fallback in research-agent-ui came
 * to never run.
 *
 * The client sends through api2client/grab rather than calling `fetch`
 * directly, so the transport is stubbed on the global rather than handed in as
 * a `fetch` option — grab owns that call. Recovering the raw Response from
 * behind grab needs its `onRawResponse` hook; on a grab without it api2client
 * has no Response to hand back and reports grab's own "HTTP error: 500"
 * string instead of the body, so the two cases that read `response`/`error`
 * are skipped rather than asserted against a transport that cannot satisfy
 * them. `grab.supports` is the same probe api2client itself uses.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { grab } from 'grab-url';
import { createClient } from '../src/client/client.gen';

/** Whether the installed grab can surface the raw Response (grab >= 1.6.23). */
const hasRawResponse =
  (grab as unknown as { supports?: { onRawResponse?: boolean } }).supports
    ?.onRawResponse === true;

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function respondWith(body: string, init: ResponseInit & { type?: string }) {
  globalThis.fetch = vi.fn().mockImplementation(
    async () =>
      new Response(body, {
        ...init,
        headers: { 'Content-Type': init.type ?? 'application/json' },
      }),
  ) as never;

  return createClient({ baseUrl: 'https://example.test' });
}

describe('generated client error result', () => {
  it.skipIf(!hasRawResponse)('exposes the status on response, not on error', async () => {
    const client = respondWith(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(result.response.status).toBe(401);
    expect((result.error as Record<string, unknown>).status).toBeUndefined();
  });

  it.skipIf(!hasRawResponse)('puts the handler JSON body in error', async () => {
    const client = respondWith(JSON.stringify({ message: 'An error has occurred.' }), {
      status: 500,
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(result.error).toEqual({ message: 'An error has occurred.' });
  });

  it.skipIf(!hasRawResponse)('puts a non-JSON body in error as a raw string', async () => {
    // A 500 raised outside the route handler never carries this app's
    // `{ message }` shape, so `error.message` is undefined.
    const client = respondWith('<!DOCTYPE html><title>Error 1101</title>', {
      status: 500,
      type: 'text/html',
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(typeof result.error).toBe('string');
    expect((result.error as unknown as { message?: string }).message).toBeUndefined();
  });
});
