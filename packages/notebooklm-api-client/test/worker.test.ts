import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { NotebookRunner, type Env, type NotebookJob } from '../src/index';

const API_TOKEN = 'test-token';

function createEnv(overrides: Partial<Env> = {}) {
  const containerFetch = vi.fn(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
  );
  const stub = { fetch: containerFetch };
  const idFromName = vi.fn(() => 'do-id');
  const get = vi.fn(() => stub);

  const env = {
    NOTEBOOK_RUNNER: { idFromName, get },
    BROWSER: {} as Fetcher,
    API_TOKEN,
    GOOGLE_EMAIL: 'user@example.com',
    GOOGLE_PASSWORD: 'hunter2',
    ...overrides,
  } as unknown as Env;

  return { env, containerFetch, idFromName, get };
}

function post(body: unknown, { token = API_TOKEN }: { token?: string | null } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return new Request('https://worker.example/', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('worker fetch: CORS preflight', () => {
  it('answers OPTIONS with permissive CORS headers and no body', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(new Request('https://worker.example/', { method: 'OPTIONS' }), env);

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type, authorization');
    expect(await res.text()).toBe('');
  });

  it('does not require authorization for the preflight', async () => {
    const { env, get } = createEnv();

    const res = await worker.fetch(new Request('https://worker.example/', { method: 'OPTIONS' }), env);

    expect(res.status).toBe(200);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('worker fetch: method and auth guards', () => {
  it.each(['GET', 'PUT', 'DELETE'])('rejects %s with 405', async (method) => {
    const { env } = createEnv();

    const res = await worker.fetch(new Request('https://worker.example/', { method }), env);

    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: 'Method not allowed' });
  });

  it('rejects a missing authorization header with 401', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(post({ action: 'list' }, { token: null }), env);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('rejects a wrong bearer token with 401', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(post({ action: 'list' }, { token: 'nope' }), env);

    expect(res.status).toBe(401);
  });

  it('never reaches the container when unauthorized', async () => {
    const { env, containerFetch } = createEnv();

    await worker.fetch(post({ action: 'list' }, { token: 'nope' }), env);

    expect(containerFetch).not.toHaveBeenCalled();
  });
});

describe('worker fetch: request body validation', () => {
  it('rejects a malformed JSON body with 400', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(post('{not json'), env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('rejects a body with no action with 400', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(post({ notebookId: 'abc' }), env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing action field' });
  });
});

describe('worker fetch: container proxying', () => {
  const actions: NotebookJob['action'][] = ['create', 'ask', 'summarize', 'list', 'delete'];

  it.each(actions)('forwards the %s job to the container', async (action) => {
    const { env, containerFetch, idFromName } = createEnv();
    const job = { action, notebookId: 'nb-1' };

    await worker.fetch(post(job), env);

    expect(idFromName).toHaveBeenCalledWith('default');
    const [url, init] = containerFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://container/run');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(job);
  });

  it('passes the container response body and status straight through', async () => {
    const { env, containerFetch } = createEnv();
    containerFetch.mockResolvedValue(
      new Response(JSON.stringify({ notebookId: 'nb-9' }), { status: 201 })
    );

    const res = await worker.fetch(post({ action: 'create' }), env);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ notebookId: 'nb-9' });
  });

  it('propagates a container error status', async () => {
    const { env, containerFetch } = createEnv();
    containerFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));

    const res = await worker.fetch(post({ action: 'ask', prompt: 'why' }), env);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('always answers with JSON and CORS headers', async () => {
    const { env } = createEnv();

    const res = await worker.fetch(post({ action: 'list' }), env);

    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('NotebookRunner', () => {
  it('is configured for port 8080 with a 5 minute idle timeout', () => {
    const runner = new NotebookRunner();

    expect(runner.defaultPort).toBe(8080);
    expect(runner.sleepAfter).toBe('5m');
  });

  it('starts the container with stored auth and internet enabled', async () => {
    const runner = new NotebookRunner();
    const start = vi.fn();
    runner.ctx = {
      container: { start },
      storage: { get: vi.fn(async () => 'stored-auth-json') },
    } as never;

    await runner.onStart();

    expect(start).toHaveBeenCalledWith({
      env: { NOTEBOOKLM_AUTH_JSON: 'stored-auth-json' },
      enableInternet: true,
    });
  });

  it('passes an empty auth string when nothing is stored yet', async () => {
    const runner = new NotebookRunner();
    const start = vi.fn();
    runner.ctx = {
      container: { start },
      storage: { get: vi.fn(async () => undefined) },
    } as never;

    await runner.onStart();

    expect(start).toHaveBeenCalledWith({
      env: { NOTEBOOKLM_AUTH_JSON: '' },
      enableInternet: true,
    });
  });
});
