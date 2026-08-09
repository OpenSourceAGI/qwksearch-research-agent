import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerRenderPageTool } from '../src/tools/render-page.js';
import { createFakeServer } from './helpers/fake-server';

function register() {
  const fake = createFakeServer();
  registerRenderPageTool(fake.server);
  return fake.get('render_page_with_javascript');
}

const DEFAULT_ARGS = {
  url: 'https://example.com/app',
  wait: 0,
  timeout: 30000,
  waitUntil: 'networkidle2',
};

function mockFetch(body: unknown, init: { ok?: boolean; text?: string } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    json: async () => body,
    text: async () => init.text ?? '',
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('render_page_with_javascript tool registration', () => {
  it('registers under the expected name', () => {
    expect(register().name).toBe('render_page_with_javascript');
  });

  it('declares the render options as inputs', () => {
    const schema = register().config.inputSchema;

    expect(Object.keys(schema).sort()).toEqual(['timeout', 'url', 'wait', 'waitUntil']);
  });
});

describe('render_page_with_javascript handler', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('refuses to run without SCRAPER_API_KEY', async () => {
    vi.stubEnv('SCRAPER_API_KEY', '');

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SCRAPER_API_KEY environment variable not set');
  });

  it('posts to the default scraper with a bearer token', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    const fetchMock = mockFetch({ html: '<html></html>' });

    await register().handler(DEFAULT_ARGS);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://scraper.qwksearch.workers.dev/api/render');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
  });

  it('honours a SCRAPER_URL override', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    vi.stubEnv('SCRAPER_URL', 'https://scraper.internal.example');
    const fetchMock = mockFetch({ html: '' });

    await register().handler(DEFAULT_ARGS);

    expect(fetchMock.mock.calls[0][0]).toBe('https://scraper.internal.example/api/render');
  });

  it('forwards the render options in the request body', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    const fetchMock = mockFetch({ html: '' });

    await register().handler({ ...DEFAULT_ARGS, wait: 500, timeout: 45000, waitUntil: 'load' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as unknown as RequestInit).body as string);
    expect(body).toMatchObject({
      url: 'https://example.com/app',
      wait: 500,
      timeout: 45000,
      waitUntil: 'load',
      blockImages: true,
      bypassCaptcha: true,
      format: 'json',
    });
  });

  it('renders the page title, load time and html', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    mockFetch({
      url: 'https://example.com/app/final',
      title: 'My App',
      loadTime: 1234,
      html: '<h1>Hi</h1>',
    });

    const text = (await register().handler(DEFAULT_ARGS)).content[0].text;

    expect(text).toContain('Page rendered: https://example.com/app/final');
    expect(text).toContain('Title: My App');
    expect(text).toContain('Load Time: 1234ms');
    expect(text).toContain('<h1>Hi</h1>');
  });

  it('falls back to the requested URL and tolerates missing html', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    mockFetch({});

    const text = (await register().handler(DEFAULT_ARGS)).content[0].text;

    expect(text).toContain('Page rendered: https://example.com/app');
    expect(text).not.toContain('Title:');
  });

  it('surfaces the scraper error body on a non-ok response', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    mockFetch(null, { ok: false, text: 'quota exceeded' });

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Render failed: quota exceeded');
  });

  it('reports a thrown error with the requested URL', async () => {
    vi.stubEnv('SCRAPER_API_KEY', 'secret-key');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('socket hang up');
    }));

    const result = await register().handler(DEFAULT_ARGS);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'Render failed for "https://example.com/app": socket hang up'
    );
  });
});
