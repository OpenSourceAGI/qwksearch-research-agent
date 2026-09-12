/**
 * @fileoverview The interstitial served in place of a first page load.
 *
 * Self-contained on purpose: inline CSS, one inline script, and Cloudflare's
 * widget loader. It renders before the app's own JS, CSS or fonts exist for
 * this visitor, so it cannot depend on any of them — and it must stay small,
 * because it is on the critical path of the very first impression.
 *
 * The widget auto-submits the form from its success callback, so in Turnstile's
 * Managed mode most visitors see a spinner resolve on its own and never click
 * anything. The submit button is the fallback for the interactive case and for
 * `noscript`.
 */

const WIDGET_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export interface ChallengePageOptions {
  siteKey: string;
  /** Same-origin path to return to once the token checks out. */
  redirectTo: string;
  /** Where the page POSTs its token. */
  verifyPath: string;
  /** Shown above the widget when a previous attempt failed. */
  error?: string;
  status?: number;
}

/** Escapes a value for interpolation into an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function renderChallengePage(options: ChallengePageOptions): Response {
  const siteKey = escapeHtml(options.siteKey);
  const redirectTo = escapeHtml(options.redirectTo);
  const verifyPath = escapeHtml(options.verifyPath);
  const error = options.error ? escapeHtml(options.error) : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="referrer" content="no-referrer" />
<title>Just a moment — QwkSearch</title>
<script src="${WIDGET_SCRIPT_URL}" async defer></script>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9;
    --card: #ffffff;
    --fg: #14161a;
    --muted: #5c636e;
    --border: #e3e6ea;
    --accent: #2563eb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0c0e12;
      --card: #14171d;
      --fg: #eef1f5;
      --muted: #9aa3b0;
      --border: #252a33;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg);
    color: var(--fg);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  main {
    width: 100%;
    max-width: 420px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 32px 28px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px rgba(0, 0, 0, 0.06);
  }
  .brand {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 18px;
  }
  h1 { font-size: 19px; font-weight: 600; margin: 0 0 8px; }
  p { margin: 0 0 22px; color: var(--muted); font-size: 14px; }
  .widget { display: flex; justify-content: center; min-height: 65px; }
  .error {
    margin: 0 0 18px;
    padding: 10px 12px;
    border-radius: 9px;
    background: rgba(204, 45, 45, 0.1);
    color: #cc2d2d;
    font-size: 13px;
    text-align: left;
  }
  button {
    margin-top: 18px;
    width: 100%;
    padding: 10px 16px;
    border: 0;
    border-radius: 9px;
    background: var(--accent);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover { filter: brightness(1.08); }
  .foot { margin: 20px 0 0; font-size: 12px; color: var(--muted); }
  noscript p { margin-top: 16px; }
</style>
</head>
<body>
<main>
  <p class="brand">QwkSearch</p>
  <h1>Just a moment</h1>
  <p>We're checking that you're a person before loading the page. This happens once.</p>
  ${error ? `<p class="error">${error}</p>` : ""}
  <form id="turnstile-form" method="POST" action="${verifyPath}">
    <input type="hidden" name="redirect" value="${redirectTo}" />
    <div class="widget">
      <div class="cf-turnstile"
           data-sitekey="${siteKey}"
           data-callback="onTurnstileSuccess"
           data-theme="auto"
           data-appearance="always"></div>
    </div>
    <button type="submit">Continue</button>
  </form>
  <noscript>
    <p>JavaScript is required to complete this check.</p>
  </noscript>
  <p class="foot">Protected by Cloudflare Turnstile</p>
</main>
<script>
  // Defined on window (not module-scoped) because the widget resolves
  // data-callback by name off the global object.
  window.onTurnstileSuccess = function () {
    var form = document.getElementById("turnstile-form");
    if (form) form.submit();
  };
</script>
</body>
</html>`;

  return new Response(html, {
    status: options.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // The pass is carried by a cookie, so a cached copy of this page (or of
      // the page behind it) would be served to the wrong visitor.
      "cache-control": "no-store, must-revalidate",
      vary: "Cookie",
      // Belt and braces alongside the meta tag: crawlers are exempt from the
      // gate, but a challenge page that somehow reached one must not be indexed.
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
