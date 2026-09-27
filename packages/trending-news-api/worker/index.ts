/**
 * Cloudflare Worker entry point for the trending-news backend.
 *
 * The request handling itself lives in `src/server/index.ts` so that a host
 * app can serve the exact same wire format from one of its own API routes
 * instead of deploying this worker separately.
 */
import { handleTrendingNewsRequest } from '../src/server';

export interface Env {
  THE_NEWS_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleTrendingNewsRequest(request, { apiKey: env.THE_NEWS_API_KEY });
  },
} satisfies ExportedHandler<Env>;
