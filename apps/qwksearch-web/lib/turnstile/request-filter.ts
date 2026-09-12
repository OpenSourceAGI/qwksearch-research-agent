/**
 * @fileoverview Decides which requests the Turnstile gate is allowed to stop.
 *
 * The gate is a *first-load* check, so it only ever interrupts a top-level
 * HTML navigation. Everything else — API calls, the framework's own RSC
 * fetches, static assets, webhooks, health checks, crawlers, and anything from
 * a phone — passes straight through. Challenging any of those would break the
 * app rather than protect it: an interstitial served in place of a JSON
 * response is just a parse error with extra steps, and an interstitial served
 * to Googlebot is a deindexed site.
 */

/**
 * Mobile is exempt by product decision: the interstitial costs a phone user an
 * extra tap on a connection where the page load is already the slow part.
 *
 * Detection prefers the `Sec-CH-UA-Mobile` client hint, which Chromium sends on
 * every request and which is not a string-matching guess, and falls back to the
 * user-agent for Safari and Firefox. iPadOS deliberately presents itself as
 * desktop Safari and is not detectable here — an iPad gets the challenge.
 */
const MOBILE_UA_PATTERN =
  /Android|iPhone|iPod|iPad|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|Opera Mobi|webOS|Mobile Safari|Silk\//i;

/**
 * Search-engine and link-preview crawlers, allowed through so the site stays
 * indexable and its links keep unfurling.
 *
 * This is a deliberately *narrow* list of named agents rather than a match on
 * "bot", which anything could claim. A user-agent is still self-reported and
 * therefore spoofable: this list is an SEO guarantee, not a security control.
 * Real enforcement against agents that lie about who they are belongs in
 * Cloudflare's Bot Management / verified-bot WAF rules, in front of this Worker.
 */
const CRAWLER_UA_PATTERN =
  /(googlebot|google-inspectiontool|storebot-google|google-extended|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandex(bot|images)|sogou|exabot|applebot|petalbot|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|redditbot|pinterest(bot|\/)|embedly|quora link preview|skypeuripreview|vkshare|w3c_validator|ia_archiver|archive\.org_bot|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|amazonbot|bytespider|ccbot|semrushbot|ahrefsbot|mj12bot|screaming frog)/i;

/** Path prefixes the gate never touches. */
const EXEMPT_PREFIXES = [
  "/api/",
  "/_next/",
  "/_vinext/",
  "/__vinext/",
  "/assets/",
  "/static/",
  "/fonts/",
  "/images/",
  "/icons/",
  "/.well-known/",
  "/cdn-cgi/",
  "/monitoring",
];

/** Exact paths the gate never touches. */
const EXEMPT_PATHS = new Set([
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/robots.txt",
  "/sitemap.xml",
  "/ads.txt",
  "/llms.txt",
  "/opensearch.xml",
  "/manifest.json",
  "/manifest.webmanifest",
  "/site.webmanifest",
  "/sw.js",
  "/service-worker.js",
  "/health",
  "/healthz",
  "/status",
]);

/** File extensions that mark a request as an asset fetch, not a page view. */
const ASSET_EXTENSION_PATTERN =
  /\.(?:js|mjs|cjs|css|map|json|xml|txt|ico|png|jpe?g|gif|svg|webp|avif|bmp|woff2?|ttf|otf|eot|mp[34]|m4a|webm|ogg|wav|pdf|zip|wasm|csv)$/i;

export interface ChallengeDecision {
  challenge: boolean;
  /** Why the request was let through, for logging and for the tests. */
  reason:
    | "challenge"
    | "not-a-document"
    | "unsafe-method"
    | "exempt-path"
    | "mobile"
    | "crawler";
}

/** True when the client hints or the user-agent say this is a phone. */
export function isMobileRequest(request: Request): boolean {
  const hint = request.headers.get("sec-ch-ua-mobile");
  if (hint) return hint.trim() === "?1";
  return MOBILE_UA_PATTERN.test(request.headers.get("user-agent") ?? "");
}

/** True for a crawler Cloudflare itself verified, or one naming itself in the list above. */
export function isCrawlerRequest(request: Request): boolean {
  const verifiedCategory = (request as { cf?: { verifiedBotCategory?: string } }).cf?.verifiedBotCategory;
  if (verifiedCategory) return true;
  return CRAWLER_UA_PATTERN.test(request.headers.get("user-agent") ?? "");
}

/**
 * True only for a top-level HTML navigation.
 *
 * `Sec-Fetch-Dest` is authoritative where the browser sends it (every current
 * browser does) and cleanly separates a navigation from the framework's own
 * `fetch` for an RSC payload. Where it is absent, the `Accept` header carries
 * the same signal well enough: a document request asks for `text/html`, a data
 * fetch does not.
 */
export function isDocumentNavigation(request: Request, url: URL): boolean {
  // Next.js/vinext fetch RSC payloads from an already-rendered page. They are
  // same-URL GETs that would otherwise look exactly like a navigation, and
  // answering one with an HTML interstitial breaks client-side routing.
  if (request.headers.get("rsc") === "1") return false;
  if (request.headers.get("next-router-prefetch")) return false;
  if (url.searchParams.has("_rsc")) return false;

  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";

  const mode = request.headers.get("sec-fetch-mode");
  if (mode) return mode === "navigate";

  return (request.headers.get("accept") ?? "").includes("text/html");
}

/** True when the path is one the gate must never interrupt. */
export function isExemptPath(pathname: string): boolean {
  if (EXEMPT_PATHS.has(pathname)) return true;
  if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return ASSET_EXTENSION_PATTERN.test(pathname);
}

/**
 * The single decision the Worker asks for: may this request be interrupted by
 * the challenge page?
 */
export function decideChallenge(request: Request, url: URL): ChallengeDecision {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return { challenge: false, reason: "unsafe-method" };
  }
  if (isExemptPath(url.pathname)) {
    return { challenge: false, reason: "exempt-path" };
  }
  if (!isDocumentNavigation(request, url)) {
    return { challenge: false, reason: "not-a-document" };
  }
  if (isMobileRequest(request)) {
    return { challenge: false, reason: "mobile" };
  }
  if (isCrawlerRequest(request)) {
    return { challenge: false, reason: "crawler" };
  }
  return { challenge: true, reason: "challenge" };
}
