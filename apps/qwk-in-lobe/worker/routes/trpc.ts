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

type NextLikeRequest = Parameters<typeof import('@/libs/trpc/lambda/context').createLambdaContext>[0];

const createTRPCHandler = async (
  c: import('hono').Context,
  options: {
    endpoint: string;
    router: 'lambda' | 'tools' | 'mobile' | 'async';
    allowMethodOverride?: boolean;
    allowBatching?: boolean;
  }
) => {
  const { createLambdaContext } = await import('@/libs/trpc/lambda/context');
  const { createAsyncRouteContext } = await import('@/libs/trpc/async/context');
  const { createTRPCErrorLogger } = await import('@/libs/trpc/utils/errorLogger');
  const { createResponseMeta } = await import('@/libs/trpc/utils/responseMeta');
  const { lambdaRouter } = await import('@/server/routers/lambda');
  const { toolsRouter } = await import('@/server/routers/tools');
  const { mobileRouter } = await import('@/server/routers/mobile');
  const { asyncRouter } = await import('@/server/routers/async');

  const routers = {
    lambda: lambdaRouter,
    tools: toolsRouter,
    mobile: mobileRouter,
    async: asyncRouter,
  };

  const router = routers[options.router];

  if (options.router === 'async') {
    return fetchRequestHandler({
      allowBatching: options.allowBatching ?? false,
      createContext: () => createAsyncRouteContext(c.req.raw as never),
      endpoint: options.endpoint,
      onError: ({ error, path, type }) => {
        console.info(`Error in tRPC handler (async) on path: ${path}, type: ${type}`);
        console.error(error);
      },
      req: c.req.raw,
      responseMeta: createResponseMeta,
      router,
    });
  }

  return fetchRequestHandler({
    allowMethodOverride: options.allowMethodOverride ?? true,
    createContext: () => createLambdaContext(c.req.raw as NextLikeRequest),
    endpoint: options.endpoint,
    onError: createTRPCErrorLogger(options.router),
    req: c.req.raw,
    responseMeta: createResponseMeta,
    router,
  });
};

export const trpcApp = new Hono();

trpcApp.all('/trpc/lambda/*', (c) =>
  createTRPCHandler(c, {
    endpoint: '/trpc/lambda',
    router: 'lambda',
    allowMethodOverride: true,
  }),
);

trpcApp.all('/trpc/tools/*', (c) =>
  createTRPCHandler(c, {
    endpoint: '/trpc/tools',
    router: 'tools',
  }),
);

trpcApp.all('/trpc/mobile/*', (c) =>
  createTRPCHandler(c, {
    endpoint: '/trpc/mobile',
    router: 'mobile',
  }),
);

trpcApp.all('/trpc/async/*', (c) =>
  createTRPCHandler(c, {
    endpoint: '/trpc/async',
    router: 'async',
    allowBatching: false,
  }),
);