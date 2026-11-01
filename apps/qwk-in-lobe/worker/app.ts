/**
 * The LobeHub Worker application.
 *
 * Mount order matters: the backend routes are registered before the SPA
 * catch-all, which comes last.
 */
import { Hono } from 'hono';

import { apiApp } from './routes/api';
import { spaApp } from './routes/spa';
import { trpcApp } from './routes/trpc';
import { webapiApp } from './routes/webapi';
import { installVisitorUsers } from './users';

export const createApp = () => {
  installVisitorUsers();

  const app = new Hono();

  app.onError((error, c) => {
    console.error(`[worker] ${c.req.method} ${new URL(c.req.url).pathname} failed:`, error);
    return c.json({ error: 'Internal Server Error', message: error.message }, 500);
  });

  // LobeHub backend.
  app.route('/', trpcApp);
  app.route('/', webapiApp);
  app.route('/', apiApp);

  // SPA shell.
  app.route('/', spaApp);

  return app;
};
