/**
 * @file scraper-utils.ts
 * @description Shared utility functions for the Puppeteer scraper service.
 * Handles request parameter parsing (GET query params + POST body merging)
 * and Bearer/API-key authentication against the SCRAPER_API_KEY env var.
 */

/** Cloudflare Worker environment bindings. */
export interface Env {
  SCRAPER_API_KEY?: string;
  PROXY_URL?: string;
  PROXY_USER?: string;
  PROXY_PASS?: string;
  TWO_CAPTCHA_KEY?: string;
  CHALLENGE_MATCH?: string;
  /** Cloudflare Browser binding used to launch Puppeteer. */
  MYBROWSER: unknown;
  /** Cloudflare Durable Object namespace for the browser pool. */
  BROWSER_DO: DurableObjectNamespace;
}

/** Durable Object namespace stub (provided by the Cloudflare runtime). */
export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface DurableObjectId {
  toString(): string;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

/** Normalised parameters extracted from an incoming scrape request. */
export interface RequestParams {
  url: string;
  /** API key sourced from body/query (lowercase alias kept for compat). */
  scraper_api_key?: string;
  SCRAPER_API_KEY?: string;
  /** Extra milliseconds to wait after page load. */
  wait: number;
  blockImages: boolean;
  /** Browser-pool session identifier; controls cookie persistence. */
  sessionId: string;
  /** Navigation timeout in milliseconds. */
  timeout: number;
  /** Puppeteer `waitUntil` condition. */
  waitUntil: string;
  /** JSON-serialised cookie array to inject before navigation. */
  cookies?: string;
  /** Additional HTTP headers to attach to every request. */
  headers: Record<string, string>;
  /** Response format: `"html"` (default) or `"json"`. */
  format: string;
  proxyUrl?: string;
  proxyUser?: string;
  proxyPass?: string;
  /** Whether to attempt automatic Cloudflare challenge bypass. */
  bypassCaptcha: boolean;
  /** Custom HTML substring that signals a challenge page. */
  challengeMatch?: string;
  /** Maximum number of challenge-bypass retry iterations. */
  maxRetries: number;
  /** Per-retry navigation timeout in milliseconds. */
  challengeTimeout: number;
  /** 2captcha API key for programmatic reCAPTCHA / Turnstile solving. */
  twoCaptchaKey?: string;
}

/** Result returned by {@link authenticateRequest}. */
export interface AuthResult {
  success: boolean;
  /** JSON-stringified error body (only present when `success` is false). */
  error?: string;
}

/**
 * Validates the API key supplied in the request against the environment.
 * Accepts the key as a Bearer token, a `SCRAPER_API_KEY` query parameter,
 * or a `SCRAPER_API_KEY` field in the POST body (already parsed into `params`).
 * Auth is skipped entirely when `env.SCRAPER_API_KEY` is not set.
 *
 * @param request - The incoming Fetch request.
 * @param env - Cloudflare Worker environment bindings.
 * @param params - Pre-parsed request parameters (used for body-sourced key).
 * @returns `{ success: true }` on pass, or `{ success: false, error }` on failure.
 */
export async function authenticateRequest(
  request: Request,
  env: Env,
  params: RequestParams,
): Promise<AuthResult> {
  if (!env.SCRAPER_API_KEY) {
    return { success: true };
  }

  const authHeader = request.headers.get("Authorization");
  const urlParams = new URL(request.url).searchParams;

  let providedApiKey: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedApiKey = authHeader.substring(7);
  } else if (urlParams.get("SCRAPER_API_KEY")) {
    providedApiKey = urlParams.get("SCRAPER_API_KEY");
  } else if (params.SCRAPER_API_KEY) {
    providedApiKey = params.SCRAPER_API_KEY;
  }

  if (providedApiKey !== env.SCRAPER_API_KEY) {
    return {
      success: false,
      error: JSON.stringify({ error: "Invalid or missing API key" }),
    };
  }

  return { success: true };
}

/**
 * Merges GET query parameters and a POST JSON / form-urlencoded body into a
 * single {@link RequestParams} object, applying sane defaults for every field.
 *
 * @param request - The incoming Fetch request (body is consumed here for POST).
 * @returns Fully populated {@link RequestParams} with defaults applied.
 */
export async function parseRequestParams(
  request: Request,
): Promise<RequestParams> {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  let bodyParams: Partial<RequestParams> & Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        bodyParams = await request.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        bodyParams = Object.fromEntries(formData) as typeof bodyParams;
      }
    } catch {
      // Ignore body parsing errors; fall back to query params only.
    }
  }

  return {
    url: (searchParams.get("url") ?? bodyParams.url ?? "") as string,
    scraper_api_key: (searchParams.get("SCRAPER_API_KEY") ??
      bodyParams.SCRAPER_API_KEY) as string | undefined,
    wait: parseInt(
      (searchParams.get("wait") ?? String(bodyParams.wait) ?? "0") as string,
      10,
    ),
    blockImages:
      searchParams.get("blockImages") === "true" ||
      bodyParams.blockImages === true,
    sessionId:
      (searchParams.get("sessionId") ??
        (bodyParams.sessionId as string | undefined) ??
        "default"),
    timeout: parseInt(
      (searchParams.get("timeout") ??
        String(bodyParams.timeout) ??
        "30000") as string,
      10,
    ),
    waitUntil:
      searchParams.get("waitUntil") ??
      (bodyParams.waitUntil as string | undefined) ??
      "networkidle2",
    cookies:
      searchParams.get("cookies") ??
      (bodyParams.cookies as string | undefined),
    headers: (bodyParams.headers as Record<string, string>) ?? {},
    format:
      searchParams.get("format") ??
      (bodyParams.format as string | undefined) ??
      "html",
    proxyUrl:
      searchParams.get("proxyUrl") ??
      (bodyParams.proxyUrl as string | undefined),
    proxyUser:
      searchParams.get("proxyUser") ??
      (bodyParams.proxyUser as string | undefined),
    proxyPass:
      searchParams.get("proxyPass") ??
      (bodyParams.proxyPass as string | undefined),
    bypassCaptcha:
      searchParams.get("bypassCaptcha") === "true" ||
      bodyParams.bypassCaptcha === true ||
      true,
    challengeMatch:
      searchParams.get("challengeMatch") ??
      (bodyParams.challengeMatch as string | undefined),
    maxRetries: parseInt(
      (searchParams.get("maxRetries") ??
        String(bodyParams.maxRetries) ??
        "10") as string,
      10,
    ),
    challengeTimeout: parseInt(
      (searchParams.get("challengeTimeout") ??
        String(bodyParams.challengeTimeout) ??
        "5000") as string,
      10,
    ),
    twoCaptchaKey:
      searchParams.get("twoCaptchaKey") ??
      (bodyParams.twoCaptchaKey as string | undefined),
  };
}
