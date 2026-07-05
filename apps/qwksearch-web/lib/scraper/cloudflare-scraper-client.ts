/**
 * @fileoverview Client for the Cloudflare Puppeteer-based scraper service.
 * Renders JavaScript-heavy pages and bypasses bot detection.
 *
 * This wraps the scraper-cloudflare package deployed as a Cloudflare Worker
 * with Browser Rendering (Puppeteer) support.
 */

export interface ScraperOptions {
  /** URL to render */
  url: string;
  /** API key for authentication (optional if SCRAPER_API_KEY not set) */
  apiKey?: string;
  /** Additional wait time after page load (ms) */
  wait?: number;
  /** Block image loading for faster rendering */
  blockImages?: boolean;
  /** Session ID for cookie persistence */
  sessionId?: string;
  /** Navigation timeout (ms) */
  timeout?: number;
  /** Puppeteer waitUntil condition */
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle0' | 'networkidle2';
  /** Response format */
  format?: 'html' | 'json';
  /** Custom headers */
  headers?: Record<string, string>;
  /** Proxy configuration */
  proxyUrl?: string;
  proxyUser?: string;
  proxyPass?: string;
  /** Bypass Cloudflare challenges and CAPTCHAs */
  bypassCaptcha?: boolean;
  /** Challenge detection pattern */
  challengeMatch?: string;
  /** Max retry attempts for challenges */
  maxRetries?: number;
  /** 2Captcha API key for solving */
  twoCaptchaKey?: string;
}

export interface ScraperJsonResponse {
  html: string;
  url: string;
  title: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  challengeBypassed: boolean;
  retryCount: number;
  loadTime: number;
}

export interface ScraperConfig {
  /** Base URL of the scraper service */
  baseURL: string;
  /** Global API key */
  apiKey?: string;
}

const DEFAULT_CONFIG: ScraperConfig = {
  baseURL: typeof process !== 'undefined' && process?.env?.SCRAPER_URL
    ? process.env.SCRAPER_URL
    : 'https://scraper.qwksearch.workers.dev',
  apiKey: typeof process !== 'undefined' && process?.env?.SCRAPER_API_KEY
    ? process.env.SCRAPER_API_KEY
    : undefined,
};

/**
 * Renders a URL using the Cloudflare Puppeteer scraper service.
 * Supports JavaScript rendering, bot detection bypass, and session management.
 *
 * @param options - Scraping configuration
 * @param config - Service configuration (base URL and API key)
 * @returns Rendered HTML or structured JSON response
 *
 * @example
 * ```ts
 * // Basic usage
 * const html = await renderWithCloudflare({ url: 'https://example.com' });
 *
 * // With challenge bypass
 * const result = await renderWithCloudflare({
 *   url: 'https://protected-site.com',
 *   bypassCaptcha: true,
 *   format: 'json'
 * });
 *
 * // With session management
 * const html = await renderWithCloudflare({
 *   url: 'https://site-requiring-login.com',
 *   sessionId: 'user-123',
 *   blockImages: true
 * });
 * ```
 */
export async function renderWithCloudflare(
  options: ScraperOptions,
  config: Partial<ScraperConfig> = {}
): Promise<string | ScraperJsonResponse> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const apiKey = options.apiKey || mergedConfig.apiKey;

  const url = new URL('/api/render', mergedConfig.baseURL);

  const body = {
    url: options.url,
    wait: options.wait ?? 0,
    blockImages: options.blockImages ?? false,
    sessionId: options.sessionId ?? 'default',
    timeout: options.timeout ?? 30000,
    waitUntil: options.waitUntil ?? 'networkidle2',
    format: options.format ?? 'html',
    headers: options.headers ?? {},
    proxyUrl: options.proxyUrl,
    proxyUser: options.proxyUser,
    proxyPass: options.proxyPass,
    bypassCaptcha: options.bypassCaptcha ?? true,
    challengeMatch: options.challengeMatch,
    maxRetries: options.maxRetries ?? 10,
    twoCaptchaKey: options.twoCaptchaKey,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Scraper request failed (${response.status}): ${errorText}`
    );
  }

  if (options.format === 'json') {
    return (await response.json()) as ScraperJsonResponse;
  }

  return await response.text();
}

/**
 * Convenience function to render a URL and return just the HTML content.
 *
 * @param url - URL to render
 * @param options - Additional scraping options
 * @param config - Service configuration
 * @returns Rendered HTML string
 */
export async function renderUrlToHtml(
  url: string,
  options: Omit<ScraperOptions, 'url'> = {},
  config: Partial<ScraperConfig> = {}
): Promise<string> {
  const result = await renderWithCloudflare(
    { ...options, url, format: 'html' },
    config
  );
  return typeof result === 'string' ? result : result.html;
}

/**
 * Renders a URL and returns full metadata including cookies, load time, etc.
 *
 * @param url - URL to render
 * @param options - Additional scraping options
 * @param config - Service configuration
 * @returns Structured response with HTML and metadata
 */
export async function renderUrlWithMetadata(
  url: string,
  options: Omit<ScraperOptions, 'url' | 'format'> = {},
  config: Partial<ScraperConfig> = {}
): Promise<ScraperJsonResponse> {
  const result = await renderWithCloudflare(
    { ...options, url, format: 'json' },
    config
  );
  return result as ScraperJsonResponse;
}
