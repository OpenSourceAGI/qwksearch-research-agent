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

// OIDC provider (CLI / desktop sign-in) relies on the Koa-based `oidc-provider`
// package, which cannot run inside a Worker. Answer explicitly instead of
// crashing the isolate; web sign-in goes through Better Auth at /api/auth.
apiApp.all('/oidc/*', (c) =>
  c.json(
    {
      error: 'oidc_unavailable',
      message: 'The OIDC provider is not available on the Cloudflare Workers deployment.',
    },
    501,
  ),
);
