'use client';

import { describeError, logSsrError, traceSsr } from '@/lib/debug/ssr-trace';

/**
 * The root error boundary — and, more to the point, the only place the app can
 * see a server *shell* error at all.
 *
 * vinext decides how to handle a shell error by whether this file exists:
 *
 *   no `global-error.tsx`  →  `fallbackToErrorDocumentOnShellError` is true, the
 *                             throw is swallowed, and the request ends as a
 *                             built-in error document with `status: 500` and
 *                             nothing written to the log. That is the state the
 *                             homepage's mystery 500 was reported in.
 *   this file              →  the throw is rethrown into
 *                             `renderAppPageHtmlStreamWithRecovery`, which
 *                             renders this component with `errorOrigin: "ssr"`
 *                             — and an SSR-origin error is passed through
 *                             *unredacted*, so the render below can log the
 *                             real message and stack.
 *
 * An RSC-origin error arrives redacted instead ("The specific message is
 * omitted in production builds…"), with the original hung off the replacement
 * under `Symbol.for("vinext.originalServerError")`; `describeError` unwraps it.
 *
 * @see node_modules/vinext/dist/server/app-page-stream.js — `fallbackToErrorDocumentOnShellError`
 * @see node_modules/vinext/dist/server/app-page-boundary-render.js — `errorOrigin === "ssr"`
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: (Error & { digest?: string }) | null | undefined;
  reset?: () => void;
}) {
  // Runs during the server render of the boundary as well as in the browser,
  // so this one line is what turns a bare `500` in the Cloudflare dashboard
  // into a message, a stack and a route.
  logSsrError('global-error:render', error, {
    digest: error?.digest,
    hasReset: typeof reset === 'function',
    href: typeof window === 'undefined' ? undefined : window.location.href,
  });

  const described = describeError(error);

  return (
    <html id="__next_error__" lang="en">
      <head>
        <title>This page could not load</title>
        <style
          dangerouslySetInnerHTML={{
            __html: [
              ':root{--bg:#fff;--fg:#171717;--muted:#666;color-scheme:light}',
              '@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#ededed;--muted:#a0a0a0;color-scheme:dark}}',
              'body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif}',
              '.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}',
              '.card{max-width:32rem;text-align:left}',
              'h1{font-size:1.5rem;line-height:2rem;margin:0 0 .75rem}',
              'p{font-size:.875rem;line-height:1.35rem;margin:0 0 1.25rem;color:var(--muted)}',
              'button{height:2rem;padding:0 .75rem;font:500 .875rem/1.25rem inherit;border-radius:.375rem;',
              'border:none;cursor:pointer;background:var(--fg);color:var(--bg)}',
              'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;color:var(--muted)}',
            ].join(''),
          }}
        />
      </head>
      <body>
        <div className="wrap">
          <div className="card">
            <h1>This page could not load</h1>
            <p>
              A server error occurred while rendering this page. Reloading often
              works; the failure has been written to the server log either way.
            </p>
            <button type="button" onClick={() => (reset ? reset() : window.location.reload())}>
              Reload
            </button>
            {described.digest ? (
              <p style={{ marginTop: '1.25rem' }}>
                <code>ERROR {described.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}

traceSsr('module:app/global-error');
