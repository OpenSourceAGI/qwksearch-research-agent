/**
 * Better Auth on the Worker.
 *
 * `auth.handler` is the framework-agnostic fetch handler, so the Worker mounts
 * it directly instead of going through `better-auth/next-js`. The two helper
 * endpoints used by the sign-in form (`check-user`, `resolve-username`) are
 * reused from their Next route modules, which only depend on the Fetch API and
 * the `next/server` shim.
 */
import { Hono } from 'hono';

import { POST as checkUser } from '@/app/(backend)/api/auth/check-user/route';
import { POST as resolveUsername } from '@/app/(backend)/api/auth/resolve-username/route';
import { auth } from '@/auth';

import { NextRequest } from '../shims/next-server';

const jsonContentTypeRegex = /^application\/(?:[a-z0-9.+-]*\+)?json/i;

/**
 * better-call turns `Request.json()` SyntaxErrors into 500s; keep malformed
 * client payloads as 400s like the Next route does.
 */
const validateJsonBody = async (request: Request): Promise<Response | undefined> => {
  const contentType = request.headers.get('content-type') || '';
  if (!request.body || !jsonContentTypeRegex.test(contentType)) return;

  try {
    await request.clone().json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { code: 'INVALID_JSON', message: 'Malformed JSON request body' },
        { status: 400 },
      );
    }
    throw error;
  }
};

export const authApp = new Hono();

authApp.post('/api/auth/check-user', (c) => checkUser(NextRequest.from(c.req.raw)));
authApp.post('/api/auth/resolve-username', (c) => resolveUsername(NextRequest.from(c.req.raw)));

authApp.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  if (c.req.method === 'POST') {
    const invalid = await validateJsonBody(c.req.raw);
    if (invalid) return invalid;
  }

  return auth.handler(c.req.raw);
});
