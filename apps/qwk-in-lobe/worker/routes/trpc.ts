/**
 * tRPC endpoints on the Worker.
 *
 * Same routers and contexts as the Next.js route shells under
 * `src/app/(backend)/trpc/*`; only the transport changes (Hono → tRPC fetch
 * adapter). The lambda/tools/mobile routers share `createLambdaContext`, the
 * async router uses its own bearer-token context.
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';

import { createAsyncRouteContext } from '@/libs/trpc/async/context';
import { createLambdaContext } from '@/libs/trpc/lambda/context';
import { createTRPCErrorLogger } from '@/libs/trpc/utils/errorLogger';
import { createResponseMeta } from '@/libs/trpc/utils/responseMeta';
import { asyncRouter } from '@/server/routers/async';
import { lambdaRouter } from '@/server/routers/lambda';
import { mobileRouter } from '@/server/routers/mobile';
import { toolsRouter } from '@/server/routers/tools';

type NextLikeRequest = Parameters<typeof createLambdaContext>[0];

export const trpcApp = new Hono();

trpcApp.all('/trpc/lambda/*', (c) =>
  fetchRequestHandler({
    allowMethodOverride: true,
    createContext: () => createLambdaContext(c.req.raw as NextLikeRequest),
    endpoint: '/trpc/lambda',
    onError: createTRPCErrorLogger('lambda'),
    req: c.req.raw,
    responseMeta: createResponseMeta,
    router: lambdaRouter,
  }),
);

trpcApp.all('/trpc/tools/*', (c) =>
  fetchRequestHandler({
    createContext: () => createLambdaContext(c.req.raw as NextLikeRequest),
    endpoint: '/trpc/tools',
    onError: createTRPCErrorLogger('tools'),
    req: c.req.raw,
    responseMeta: createResponseMeta,
    router: toolsRouter,
  }),
);

trpcApp.all('/trpc/mobile/*', (c) =>
  fetchRequestHandler({
    createContext: () => createLambdaContext(c.req.raw as NextLikeRequest),
    endpoint: '/trpc/mobile',
    onError: createTRPCErrorLogger('mobile'),
    req: c.req.raw,
    responseMeta: createResponseMeta,
    router: mobileRouter,
  }),
);

trpcApp.all('/trpc/async/*', (c) =>
  fetchRequestHandler({
    allowBatching: false,
    createContext: () => createAsyncRouteContext(c.req.raw as never),
    endpoint: '/trpc/async',
    onError: ({ error, path, type }) => {
      console.info(`Error in tRPC handler (async) on path: ${path}, type: ${type}`);
      console.error(error);
    },
    req: c.req.raw,
    responseMeta: createResponseMeta,
    router: asyncRouter,
  }),
);
