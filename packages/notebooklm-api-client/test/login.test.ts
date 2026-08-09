import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { setLaunchImpl } from './stubs/puppeteer';

const API_TOKEN = 'test-token';

/** A puppeteer Page double recording the interactions handleLogin performs. */
function createPage(overrides: Record<string, unknown> = {}) {
  return {
    typed: [] as { selector: string; value: string }[],
    clicked: [] as string[],
    setUserAgent: vi.fn(async () => {}),
    goto: vi.fn(async () => {}),
    waitForSelector: vi.fn(async () => {}),
    waitForNavigation: vi.fn(async () => {}),
    type: vi.fn(async function (this: never, selector: string, value: string) {
      (page.typed as { selector: string; value: string }[]).push({ selector, value });
    }),
    click: vi.fn(async (selector: string) => {
      (page.clicked as string[]).push(selector);
    }),
    $: vi.fn(async () => null),
    cookies: vi.fn(async () => [{ name: 'SID', value: 'abc' }]),
    evaluate: vi.fn(async () => ({ token: 'xyz' })),
    ...overrides,
  };
  }

let page: ReturnType<typeof createPage>;

function createEnv() {
  const containerFetch = vi.fn(async () => new Response('{}', { status: 200 }));
  const env = {
    NOTEBOOK_RUNNER: { idFromName: vi.fn(() => 'id'), get: vi.fn(() => ({ fetch: containerFetch })) },
    BROWSER: { binding: true } as unknown as Fetcher,
    API_TOKEN,
    GOOGLE_EMAIL: 'user@example.com',
    GOOGLE_PASSWORD: 'hunter2',
  } as unknown as Env;
  return { env, containerFetch };
}

function loginRequest(body: Record<string, unknown> = {}) {
  return new Request('https://worker.example/', {
    method: 'POST',
    headers: { authorization: `Bearer ${API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'login', ...body }),
  });
}

let close: ReturnType<typeof vi.fn>;

beforeEach(() => {
  page = createPage();
  close = vi.fn(async () => {});
  setLaunchImpl(async () => ({ newPage: async () => page, close }));
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** handleLogin awaits fixed delays; advance them while the promise is pending. */
async function runLogin(request: Request, env: Env) {
  const promise = worker.fetch(request, env);
  await vi.runAllTimersAsync();
  return promise;
}

describe('handleLogin', () => {
  it('navigates to NotebookLM and signs in with the configured credentials', async () => {
    const { env } = createEnv();

    const res = await runLogin(loginRequest(), env);

    expect(res.status).toBe(200);
    expect(page.goto).toHaveBeenCalledWith('https://notebooklm.google.com', {
      waitUntil: 'networkidle0',
    });
    expect(page.typed).toEqual([
      { selector: 'input[type="email"]', value: 'user@example.com' },
      { selector: 'input[type="password"]', value: 'hunter2' },
    ]);
    expect(page.clicked).toEqual(['#identifierNext', '#passwordNext']);
  });

  it('sets a desktop user agent before navigating', async () => {
    const { env } = createEnv();

    await runLogin(loginRequest(), env);

    expect(page.setUserAgent).toHaveBeenCalledWith(expect.stringContaining('Mozilla/5.0'));
  });

  it('stores the harvested cookies and localStorage on the container', async () => {
    const { env, containerFetch } = createEnv();

    await runLogin(loginRequest(), env);

    const [url, init] = containerFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://container/store-auth');
    const stored = JSON.parse(init.body as string);
    expect(stored.cookies).toEqual([{ name: 'SID', value: 'abc' }]);
    expect(stored.localStorage).toEqual({ token: 'xyz' });
    expect(stored.timestamp).toEqual(expect.any(String));
  });

  it('reports success with the cookie count', async () => {
    const { env } = createEnv();

    const res = await runLogin(loginRequest(), env);

    expect(await res.json()).toEqual({
      success: true,
      message: 'Login complete, auth stored for container',
      cookieCount: 1,
    });
  });

  it('skips the 2FA step when no security code is supplied', async () => {
    const { env } = createEnv();

    await runLogin(loginRequest(), env);

    expect(page.$).not.toHaveBeenCalled();
  });

  it('enters a supplied security code and submits it', async () => {
    const typedCode: string[] = [];
    const codeInput = { type: vi.fn(async (value: string) => void typedCode.push(value)) };
    const nextBtn = { click: vi.fn(async () => {}) };
    page = createPage({
      $: vi.fn(async (selector: string) =>
        selector.includes('tel') ? codeInput : nextBtn
      ),
    });
    setLaunchImpl(async () => ({ newPage: async () => page, close }));
    const { env } = createEnv();

    await runLogin(loginRequest({ securityCode: '123456' }), env);

    expect(typedCode).toEqual(['123456']);
    expect(nextBtn.click).toHaveBeenCalled();
  });

  it('tolerates the 2FA input not being present', async () => {
    const { env } = createEnv();

    const res = await runLogin(loginRequest({ securityCode: '123456' }), env);

    expect(res.status).toBe(200);
  });

  it('returns 500 with the failure detail when a step throws', async () => {
    page = createPage({
      waitForSelector: vi.fn(async () => {
        throw new Error('email field never appeared');
      }),
    });
    setLaunchImpl(async () => ({ newPage: async () => page, close }));
    const { env } = createEnv();

    const res = await runLogin(loginRequest(), env);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Login failed',
      detail: 'email field never appeared',
    });
  });

  it('reports a non-Error throw as an unknown error', async () => {
    page = createPage({
      waitForSelector: vi.fn(async () => {
        throw 'just a string';
      }),
    });
    setLaunchImpl(async () => ({ newPage: async () => page, close }));
    const { env } = createEnv();

    const res = await runLogin(loginRequest(), env);

    expect(await res.json()).toEqual({ error: 'Login failed', detail: 'Unknown error' });
  });

  it('closes the browser on both the success and failure paths', async () => {
    const { env } = createEnv();
    await runLogin(loginRequest(), env);
    expect(close).toHaveBeenCalledTimes(1);

    page = createPage({
      goto: vi.fn(async () => {
        throw new Error('nope');
      }),
    });
    const secondClose = vi.fn(async () => {});
    setLaunchImpl(async () => ({ newPage: async () => page, close: secondClose }));

    await runLogin(loginRequest(), createEnv().env);
    expect(secondClose).toHaveBeenCalledTimes(1);
  });

  it('never reaches the container run endpoint for a login action', async () => {
    const { env, containerFetch } = createEnv();

    await runLogin(loginRequest(), env);

    const urls = containerFetch.mock.calls.map((call) => call[0]);
    expect(urls).not.toContain('http://container/run');
  });
});
