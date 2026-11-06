/**
 * @file route.ts
 * @description Every `/api/*` route of the live demo on Vercel (Next.js).
 *
 * The routes themselves are `handleApi` in `worker/api.ts`, the same code the
 * Cloudflare Worker serves, so the demo's PDF, Webpage and Citation tabs, the
 * OCR follow-up (`/api/enhance`, `/api/warmup`) and the admin panel
 * (`/api/admin/*`) behave the same on both hosts. Variables and secrets come
 * from the Vercel project's environment.
 *
 * There is no KV namespace on Vercel, so settings saved in the admin panel
 * are kept in memory per function instance; set them as Vercel environment
 * variables instead.
 */
import { handleApi, type Env } from '../../../worker/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const env = process.env as unknown as Env;

async function handle(request: Request): Promise<Response> {
  return (await handleApi(request, env)) ?? Response.json({ error: 'Not found' }, { status: 404 });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
