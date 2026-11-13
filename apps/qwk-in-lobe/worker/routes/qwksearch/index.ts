/**
 * The QwkSearch add-on API, as one Hono app:
 *
 * - `/api/doc/article`               article extract + cache (the reader panel)
 * - `/api/agent/article-qa`          answer a question about an open article
 * - `/api/agent/article-followups`   suggested follow-up questions
 * - `/api/doc/documents[/:id]`       REASON document sync (the Docs editor)
 * - `/api/doc/favorites`             starred articles
 * - `/api/doc/extraction-settings`   the Extraction settings pane
 * - `/api/doc/search-settings`       the Search & Sources settings pane
 *
 * `worker/app.ts` imports this module lazily, on the first request to one of
 * these paths, so none of it (the extractors in particular) is evaluated at
 * Worker startup. With the `qwksearch` feature flag off every path is a 404,
 * so the Worker answers like plain LobeHub.
 */
import { Hono } from 'hono';

import { getServerFeatureFlagsValue } from '@/config/featureFlags';

import { articleApp } from './article';
import { articleAiApp } from './articleAi';
import { documentsApp } from './documents';
import { extractionSettingsApp } from './extractionSettings';
import { favoritesApp } from './favorites';
import { searchSettingsApp } from './searchSettings';

export const qwksearchApp = new Hono();

qwksearchApp.use('*', async (c, next) => {
  if (!getServerFeatureFlagsValue().qwksearch) return c.notFound();
  await next();
});

qwksearchApp.route('/', articleApp);
qwksearchApp.route('/', articleAiApp);
qwksearchApp.route('/', documentsApp);
qwksearchApp.route('/', favoritesApp);
qwksearchApp.route('/', extractionSettingsApp);
qwksearchApp.route('/', searchSettingsApp);

export default qwksearchApp;
