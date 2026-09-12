/**
 * @fileoverview `register()` / `onRequestError()` — the framework's own error
 * hook, wired to the Worker's console.
 *
 * vinext supports Next.js's `instrumentation.ts` convention: `register()` is
 * baked into the generated RSC entry as a top-level `await`, so it runs inside
 * the Worker before the first request, and an exported `onRequestError` is
 * parked on `globalThis` and called for every unhandled server render error —
 * **with the original error, not the production-redacted one**.
 *
 * That last part is why this file is the single most valuable logger in the
 * app. Without it, vinext's `createRscOnErrorHandler` reports the error to a
 * reporter that does not exist, declines to `console.error` it because
 * `NODE_ENV === "production"`, and returns a digest. The request then ends as a
 * `500` that says nothing.
 *
 * @see node_modules/vinext/dist/server/app-rsc-errors.js — `createRscOnErrorHandler`
 * @see node_modules/vinext/dist/server/instrumentation.js — `reportRequestError`
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import { describeError, isSsrTraceEnabled, logSsrError, traceSsr } from './lib/debug/ssr-trace';

/** Request headers worth keeping. The rest are noise or personal data. */
const LOGGED_HEADERS = [
  'accept',
  'accept-language',
  'user-agent',
  'referer',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-ch-ua-mobile',
  'rsc',
  'next-router-prefetch',
  'cf-ray',
  'cf-ipcountry',
  'host',
  'x-forwarded-proto',
];

type RequestInfo = {
  path?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ErrorContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  revalidateReason?: string;
};

/** Header subset, with cookie values reduced to their names. */
function pickHeaders(headers: RequestInfo['headers']): Record<string, string> {
  const picked: Record<string, string> = {};
  if (!headers) return picked;
  for (const name of LOGGED_HEADERS) {
    const value = headers[name];
    if (typeof value === 'string') picked[name] = value;
    else if (Array.isArray(value)) picked[name] = value.join(', ');
  }
  const cookie = headers.cookie;
  if (typeof cookie === 'string') {
    // Names only: which cookies arrived decides which code path ran, and no
    // value here is worth putting in a log.
    picked['cookie-names'] = cookie
      .split(';')
      .map((pair) => pair.split('=')[0]?.trim())
      .filter(Boolean)
      .join(',');
  }
  return picked;
}

/**
 * Runs once per Worker isolate, before any request is served. Prints what the
 * isolate can see, so a log that starts mid-hunt still says which build and
 * which configuration produced the lines under it.
 */
export function register(): void {
  traceSsr('instrumentation:register', {
    nodeEnv: process.env.NODE_ENV,
    buildId: process.env.__VINEXT_BUILD_ID,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    traceEnabled: isSsrTraceEnabled(),
  });

  // A promise rejected with nobody awaiting it is otherwise invisible: the
  // Worker records `outcome: "ok"` and the page still 500s.
  try {
    addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      logSsrError('unhandledrejection', event.reason);
    });
    addEventListener('error', (event: ErrorEvent) => {
      logSsrError('uncaught-error', event.error ?? event.message);
    });
  } catch (error) {
    traceSsr('instrumentation:global-handlers:unavailable', {
      reason: describeError(error).message,
    });
  }
}

/**
 * Every unhandled error raised while rendering a route. This is the line to
 * look for first in the Cloudflare logs: it carries the real message, the real
 * stack, and the route that was rendering when it threw.
 */
export function onRequestError(
  error: unknown,
  request: RequestInfo,
  context: ErrorContext,
): void {
  logSsrError('instrumentation:onRequestError', error, {
    path: request?.path,
    method: request?.method,
    routerKind: context?.routerKind,
    routePath: context?.routePath,
    routeType: context?.routeType,
    renderSource: context?.renderSource,
    revalidateReason: context?.revalidateReason,
    headers: pickHeaders(request?.headers),
  });
}
