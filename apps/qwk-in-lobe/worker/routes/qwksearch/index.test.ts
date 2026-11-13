// @vitest-environment node
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flags = vi.hoisted(() => ({ qwksearch: true }));
vi.mock('@/config/featureFlags', () => ({ getServerFeatureFlagsValue: () => flags }));

// Each sub-app answers its own paths with its name, so the test only checks
// the wiring: which module a path reaches, and that the flag gates all of them.
const stub = (name: string, method: 'get' | 'post', path: string) => {
  const app = new Hono();
  app[method](path, (c) => c.text(name));
  return app;
};
vi.mock('./article', () => ({ articleApp: stub('article', 'get', '/api/doc/article') }));
vi.mock('./articleAi', () => ({
  articleAiApp: stub('articleAi', 'post', '/api/agent/article-qa'),
}));
vi.mock('./documents', () => ({
  documentsApp: stub('documents', 'get', '/api/doc/documents'),
}));
vi.mock('./favorites', () => ({ favoritesApp: stub('favorites', 'get', '/api/doc/favorites') }));
vi.mock('./extractionSettings', () => ({
  extractionSettingsApp: stub('extraction', 'get', '/api/doc/extraction-settings'),
}));
vi.mock('./searchSettings', () => ({
  searchSettingsApp: stub('search', 'get', '/api/doc/search-settings'),
}));

const { qwksearchApp } = await import('./index');

const call = (path: string, method = 'GET') =>
  qwksearchApp.fetch(new Request(`https://qwk.test${path}`, { method }));

describe('qwksearchApp', () => {
  beforeEach(() => {
    flags.qwksearch = true;
  });

  it.each([
    ['/api/doc/article?url=https%3A%2F%2Fexample.com', 'GET', 'article'],
    ['/api/agent/article-qa', 'POST', 'articleAi'],
    ['/api/doc/documents', 'GET', 'documents'],
    ['/api/doc/favorites', 'GET', 'favorites'],
    ['/api/doc/extraction-settings', 'GET', 'extraction'],
    ['/api/doc/search-settings', 'GET', 'search'],
  ])('routes %s to the %s handlers', async (path, method, expected) => {
    const res = await call(path, method);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(expected);
  });

  it('answers 404 everywhere when the qwksearch flag is off', async () => {
    flags.qwksearch = false;
    expect((await call('/api/doc/article?url=x')).status).toBe(404);
    expect((await call('/api/doc/documents')).status).toBe(404);
    expect((await call('/api/agent/article-qa', 'POST')).status).toBe(404);
  });
});
