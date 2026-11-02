/**
 * `/api/*` and `/f/*` routes that already are (or wrap) Hono apps in LobeHub:
 * the OpenAPI surface, agent runtime callbacks, QStash workflows, IdP
 * webhooks, Composio OAuth, dev tools, version and the public file proxy.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';

import pkg from '../../package.json';
import { NextRequest } from '../shims/next-server';

type FetchApp = { fetch: (request: Request) => Promise<Response> | Response };

const delegate = async (c: Context, loader: () => Promise<{ default: FetchApp }>) =>
  (await loader()).default.fetch(c.req.raw);

export const apiApp = new Hono();

apiApp.get('/api/version', (c) => c.json({ version: pkg.version }));

// The SPA links `/manifest.webmanifest`. Next serves it from `src/app/manifest.ts`;
// the Worker has no Next routes, so without this the SPA shell (HTML) answered and
// browsers logged "Manifest: Line: 1, column: 1, Syntax error".
apiApp.get('/manifest.webmanifest', async (c) => {
  const { default: manifest } = await import('@/app/manifest');
  return c.body(JSON.stringify(await manifest()), 200, {
    'cache-control': 'public, max-age=3600',
    'content-type': 'application/manifest+json; charset=utf-8',
  });
});

apiApp.get('/api/health', (c) => c.json({ ok: true, service: 'qwksearch-lobehub-worker' }));

apiApp.all('/api/v1/*', (c) => delegate(c, () => import('@lobechat/openapi')));
apiApp.all('/api/v1', (c) => delegate(c, () => import('@lobechat/openapi')));

apiApp.get('/api/agent/stream', async (c) => {
  const { GET } = await import('@/app/(backend)/api/agent/stream/route');
  return GET(NextRequest.adapt(c.req.raw));
});
apiApp.all('/api/agent', (c) => delegate(c, () => import('@/server/router-hono/agent')));
apiApp.all('/api/agent/*', (c) => delegate(c, () => import('@/server/router-hono/agent')));

apiApp.post('/api/workflows/*', (c) => delegate(c, () => import('@/server/router-hono/workflows')));
apiApp.post('/api/webhooks/*', (c) => delegate(c, () => import('@/server/router-hono/webhooks')));
apiApp.get('/api/composio/*', (c) => delegate(c, () => import('@/server/router-hono/composio')));
apiApp.all('/api/dev/*', (c) => delegate(c, () => import('@/server/router-hono/devtools')));

apiApp.get('/f/:id', async (c) => {
  const { GET } = await import('@/app/(backend)/f/[id]/route');
  return GET(c.req.raw, { params: Promise.resolve({ id: c.req.param('id') }) });
});

// There is no sign-in, so there is no OIDC provider either. Answer old CLI /
// desktop clients explicitly rather than with the SPA shell.
apiApp.all('/oidc/*', (c) =>
  c.json(
    {
      error: 'oidc_unavailable',
      message: 'This deployment has no sign-in, so there is no OIDC provider.',
    },
    501,
  ),
);
