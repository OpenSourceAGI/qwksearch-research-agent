/**
 * `/webapi/*` routes: model chat completions, model lists, TTS, traces,
 * avatars, ComfyUI image creation and the SSE event streams.
 *
 * Each handler is the unchanged Next.js route module; Hono only adapts the
 * `(request, { params })` calling convention. Route modules are imported
 * lazily so a cold isolate does not evaluate every provider SDK up front.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';

import { NextRequest } from '../shims/next-server';

type RouteHandler = (
  request: Request,
  options: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

/** Next route modules export per-method handlers with slightly different signatures. */
type RouteModule = Record<string, unknown>;

const callRoute = async (
  c: Context,
  loader: () => Promise<RouteModule>,
  params: Record<string, string> = {},
) => {
  const mod = await loader();
  const handler = mod[c.req.method] as RouteHandler | undefined;
  if (typeof handler !== 'function') return c.text('Method Not Allowed', 405);

  return handler(NextRequest.adapt(c.req.raw), { params: Promise.resolve(params) });
};

export const webapiApp = new Hono();

webapiApp.post('/webapi/chat/:provider', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/chat/[provider]/route'), {
    provider: c.req.param('provider'),
  }),
);

webapiApp.on(['GET', 'POST'], '/webapi/models/:provider/pricing', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/models/[provider]/pricing/route'), {
    provider: c.req.param('provider'),
  }),
);

webapiApp.on(['GET', 'POST'], '/webapi/models/:provider/pull', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/models/[provider]/pull/route'), {
    provider: c.req.param('provider'),
  }),
);

webapiApp.on(['GET', 'POST'], '/webapi/models/:provider', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/models/[provider]/route'), {
    provider: c.req.param('provider'),
  }),
);

webapiApp.post('/webapi/tts/openai', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/tts/openai/route')),
);

webapiApp.post('/webapi/trace', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/trace/route')),
);

webapiApp.get('/webapi/revalidate', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/revalidate/route')),
);

webapiApp.get('/webapi/user/avatar/:id/:image', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/user/avatar/[id]/[image]/route'), {
    id: c.req.param('id'),
    image: c.req.param('image'),
  }),
);

webapiApp.post('/webapi/create-image/comfyui', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/create-image/comfyui/route')),
);

webapiApp.get('/webapi/document/events', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/document/events/route')),
);

webapiApp.get('/webapi/topic-comment/events', (c) =>
  callRoute(c, () => import('@/app/(backend)/webapi/topic-comment/events/route')),
);
