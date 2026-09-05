/**
 * The QwkSearch × LobeHub Worker application.
 *
 * Mount order matters: the QwkSearch feature routes (`/api/doc/*`,
 * `/api/agent/article-*`) are registered before LobeHub's `/api/agent` Hono app
 * so their more specific paths win, and the SPA catch-all comes last.
 */
import { Hono } from 'hono';

import { apiApp } from './routes/api';
import { authApp } from './routes/auth';
import { articleApp } from './routes/qwksearch/article';
import { articleAiApp } from './routes/qwksearch/articleAi';
import { documentsApp } from './routes/qwksearch/documents';
import { favoritesApp } from './routes/qwksearch/favorites';
import { spaApp } from './routes/spa';
import { trpcApp } from './routes/trpc';
import { webapiApp } from './routes/webapi';

export const createApp = () => {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(`[worker] ${c.req.method} ${new URL(c.req.url).pathname} failed:`, error);
    return c.json({ error: 'Internal Server Error', message: error.message }, 500);
  });

  // Better Auth first: /api/auth/* must never be shadowed by the generic /api handlers.
  app.route('/', authApp);

  // QwkSearch features on D1 (article extracts, favorites, REASON documents).
  app.route('/', articleApp);
  app.route('/', favoritesApp);
  app.route('/', documentsApp);
  app.route('/', articleAiApp);

  // LobeHub backend.
  app.route('/', trpcApp);
  app.route('/', webapiApp);
  app.route('/', apiApp);

  // SPA shells + protected page redirects.
  app.route('/', spaApp);

  return app;
};
