/**
 * @file browser-durable-object.ts
 * @description Cloudflare Durable Object that owns a single Puppeteer browser
 * instance.  All scrape requests are routed here so that one long-lived
 * browser process is shared across many Workers invocations, avoiding the
 * cold-start cost of launching a new browser for every request.
 *
 * The browser is kept alive for up to {@link BrowserDurableObject.BROWSER_TIMEOUT}
 * milliseconds of inactivity.  An alarm is set after each request; if the
 * alarm fires and the idle threshold has been exceeded the browser is closed.
 */

import { applyStealthEvasions } from "./scraper-stealth.js";
import {
  isChallengePage,
  simulateHumanBehavior,
  tryClickRecaptcha,
  waitForRecaptchaSolved,
  solveRecaptchaWith2Captcha,
  solveTurnstileWith2Captcha,
} from "./scraper-captcha.js";
import { executeGoogleLogin } from "./scraper-login.js";
import puppeteer from "@cloudflare/puppeteer";
import type { Browser, Page, Cookie } from "@cloudflare/puppeteer";
import { parseRequestParams } from "./scraper-utils.js";
import type { Env } from "./scraper-utils.js";

/** Cloudflare Durable Object storage interface (subset used here). */
interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

/** Cloudflare Durable Object state passed to the constructor. */
interface DurableObjectState {
  storage: DurableObjectStorage;
}

/** JSON shape returned when `format=json` is requested. */
interface ScrapeJsonResponse {
  html: string;
  url: string;
  title: string;
  cookies: Cookie[];
  challengeBypassed: boolean;
  retryCount: number;
  loadTime: number;
}

/**
 * Cloudflare Durable Object that manages a persistent Puppeteer browser for
 * rendering web pages.  One instance is created per `sessionId` so that
 * cookie state is isolated between logical sessions.
 */
export class BrowserDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private browser: Browser | null;
  private lastUsed: number;
  private storage: DurableObjectStorage;

  /** Inactivity period after which the browser process is closed. */
  private readonly BROWSER_TIMEOUT = 5 * 60 * 1000;

  /** Default HTML substrings that indicate a Cloudflare bot challenge. */
  private readonly CHALLENGE_PATTERNS: string[] = [
    "challenge-platform",
    "cf-challenge",
    "cf_chl_opt",
    "_cf_chl",
    "cf-turnstile",
    "challenge-running",
    "cf-please-wait",
    "Checking your browser",
    "Just a moment...",
    "Verifying you are human",
    "cf-spinner",
    "ray-id",
    "g-recaptcha",
    "recaptcha",
    "grecaptcha",
  ];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.browser = null;
    this.lastUsed = 0;
    this.storage = state.storage;
  }

  /**
   * Main request handler.  Parses params, spins up a Puppeteer page, applies
   * stealth evasions, optionally bypasses Cloudflare challenges, and returns
   * the rendered HTML (or a JSON envelope when `format=json`).
   *
   * @param request - Incoming Fetch request forwarded from the Worker.
   * @returns HTML or JSON response with load-time and session metadata headers.
   */
  async fetch(request: Request): Promise<Response> {
    // Handle login action requests from the NotebookLM integration
    if (request.method === "POST") {
      try {
        const clonedReq = request.clone();
        const body = await clonedReq.json() as Record<string, unknown>;
        if (body._action === "login") {
          return this.handleLoginAction(body);
        }
      } catch {
        // Not a login request, continue with normal flow
      }
    }

    const params = await parseRequestParams(request);

    try {
      const normalizedUrl = new URL(params.url).toString();

      await this.ensureBrowser();

      const page: Page = await this.browser!.newPage();

      await applyStealthEvasions(page);

      if (params.proxyUser && params.proxyPass) {
        await page.authenticate({
          username: params.proxyUser,
          password: params.proxyPass,
        });
      } else if (this.env.PROXY_USER && this.env.PROXY_PASS) {
        await page.authenticate({
          username: this.env.PROXY_USER,
          password: this.env.PROXY_PASS,
        });
      }

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      });

      if (params.blockImages || Object.keys(params.headers).length > 0) {
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const resourceType = req.resourceType();
          if (params.blockImages && resourceType === "image") {
            req.abort();
          } else {
            const headers = { ...req.headers(), ...params.headers };
            req.continue({ headers });
          }
        });
      }

      await this.loadCookies(page, params.sessionId, params.cookies);

      const startTime = Date.now();
      let response = await page.goto(normalizedUrl, {
        waitUntil: "domcontentloaded",
        timeout: params.timeout,
      });

      let responseBody = await page.content();
      let retryCount = 0;
      let challengeBypassed = false;

      if (params.bypassCaptcha) {
        const challengeMatch =
          params.challengeMatch ?? this.env.CHALLENGE_MATCH;
        const twoCaptchaKey =
          params.twoCaptchaKey ?? this.env.TWO_CAPTCHA_KEY;

        while (
          isChallengePage(responseBody, challengeMatch, this.CHALLENGE_PATTERNS) &&
          retryCount < params.maxRetries
        ) {
          console.log(
            `Challenge detected, attempt ${retryCount + 1}/${params.maxRetries}`,
          );

          await simulateHumanBehavior(page);

          try {
            const recaptchaClicked = await tryClickRecaptcha(page);

            if (recaptchaClicked) {
              await new Promise<void>((r) =>
                setTimeout(r, 2000 + Math.random() * 2000),
              );

              const solved = await waitForRecaptchaSolved(page, 5000);

              if (!solved && twoCaptchaKey) {
                console.log("Attempting to solve reCAPTCHA with 2captcha...");
                const captchaSolved = await solveRecaptchaWith2Captcha(
                  page,
                  twoCaptchaKey,
                );
                if (captchaSolved) {
                  await new Promise<void>((r) => setTimeout(r, 1000));
                }
              }
            }

            if (twoCaptchaKey && responseBody.includes("cf-turnstile")) {
              console.log("Attempting to solve Turnstile with 2captcha...");
              await solveTurnstileWith2Captcha(page, twoCaptchaKey);
            }

            const newResponse = await page.waitForNavigation({
              timeout: params.challengeTimeout,
              waitUntil: "domcontentloaded",
            });

            if (newResponse) response = newResponse;

            responseBody = await page.content();
            retryCount++;
            challengeBypassed = true;
          } catch (_navError) {
            responseBody = await page.content();
            retryCount++;

            if (
              isChallengePage(
                responseBody,
                challengeMatch,
                this.CHALLENGE_PATTERNS,
              )
            ) {
              await new Promise<void>((r) =>
                setTimeout(r, 1000 + Math.random() * 2000),
              );
            }
          }
        }

        if (challengeBypassed || retryCount > 0) {
          try {
            await page.waitForNetworkIdle({ timeout: 5000 });
          } catch {
            // Page may already be idle; ignore.
          }
        }
      }

      if (params.wait > 0) {
        await new Promise<void>((r) => setTimeout(r, params.wait));
      }

      if (params.waitUntil !== "domcontentloaded") {
        try {
          await page.waitForNetworkIdle({
            timeout: params.timeout,
            idleTime: 500,
          });
        } catch {
          // Ignore navigation timeout.
        }
      }

      const html = await page.content();
      const title = await page.title();
      const finalUrl = page.url();
      const loadTime = Date.now() - startTime;

      const cookies: Cookie[] = await page.cookies();
      await this.saveCookies(params.sessionId, cookies);

      await page.close();

      this.lastUsed = Date.now();
      await this.scheduleCleanup();

      if (params.format === "json") {
        const responseData: ScrapeJsonResponse = {
          html,
          url: finalUrl,
          title,
          cookies,
          challengeBypassed,
          retryCount,
          loadTime,
        };

        return new Response(JSON.stringify(responseData, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "X-Load-Time": String(loadTime),
            "X-Session-Id": params.sessionId,
            "X-Challenge-Bypassed": String(challengeBypassed),
            "X-Retry-Count": String(retryCount),
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const htmlWithBase = html.replace(
        /<head[^>]*>/i,
        `<head><base href='${normalizedUrl.split("/").slice(0, 3).join("/")}/' >`,
      );

      return new Response(htmlWithBase, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Load-Time": String(loadTime),
          "X-Session-Id": params.sessionId,
          "X-Final-URL": finalUrl,
          "X-Challenge-Bypassed": String(challengeBypassed),
          "X-Retry-Count": String(retryCount),
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error rendering page:", error);
      await this.closeBrowser();

      return new Response(
        JSON.stringify({
          error: `Failed to render page: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Handles automated Google login via the persistent browser session.
   * Navigates to Google login, enters credentials, and returns cookies.
   */
  private async handleLoginAction(
    body: Record<string, unknown>,
  ): Promise<Response> {
    const { email, password, targetUrl } = body as {
      email: string;
      password: string;
      targetUrl: string;
    };

    try {
      await this.ensureBrowser();
      const page: Page = await this.browser!.newPage();
      await applyStealthEvasions(page);

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      });

      const result = await executeGoogleLogin(page, email, password, targetUrl);

      if (result.success && result.cookies) {
        const sessionId = (body.sessionId as string) || "login";
        await this.saveCookies(sessionId, result.cookies);
      }

      await page.close();
      this.lastUsed = Date.now();
      await this.scheduleCleanup();

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 422,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("Login action error:", err);
      await this.closeBrowser();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Login error: ${(err as Error).message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Loads cookies from Durable Object storage and the `cookies` request param,
   * then injects them all into the given page.
   *
   * @param page - Puppeteer page to inject cookies into.
   * @param sessionId - Session key used to look up persisted cookies.
   * @param cookiesParam - Optional JSON-serialised cookie array from the caller.
   */
  private async loadCookies(
    page: Page,
    sessionId: string,
    cookiesParam: string | undefined,
  ): Promise<void> {
    const storedCookies = await this.storage.get<Cookie[]>(
      `cookies:${sessionId}`,
    );
    let allCookies: Cookie[] = storedCookies ? [...storedCookies] : [];

    if (cookiesParam) {
      try {
        const paramCookies: Cookie[] = JSON.parse(cookiesParam);
        allCookies = allCookies.concat(paramCookies);
      } catch (e) {
        console.error("Invalid cookies parameter:", e);
      }
    }

    if (allCookies.length > 0) {
      await page.setCookie(...allCookies);
    }
  }

  /**
   * Persists the current page cookies to Durable Object storage under the
   * given session key, overwriting any previously stored value.
   *
   * @param sessionId - Storage key prefix for this session.
   * @param cookies - Array of cookies returned by `page.cookies()`.
   */
  private async saveCookies(
    sessionId: string,
    cookies: Cookie[],
  ): Promise<void> {
    if (cookies.length > 0) {
      await this.storage.put(`cookies:${sessionId}`, cookies);
    }
  }

  /**
   * Ensures a connected browser instance is available, launching one if
   * necessary.  Applies the `PROXY_URL` env var as a `--proxy-server` arg
   * and keeps the browser alive for up to 10 minutes between requests.
   */
  private async ensureBrowser(): Promise<void> {
    if (this.browser?.isConnected()) {
      try {
        await this.browser.version();
        return;
      } catch {
        this.browser = null;
      }
    }

    const launchOptions: Record<string, unknown> = {
      keep_alive: 10 * 60 * 1000,
    };

    const browserArgs: string[] = [];
    if (this.env.PROXY_URL) {
      browserArgs.push(`--proxy-server=${this.env.PROXY_URL}`);
    }
    if (browserArgs.length > 0) {
      launchOptions.args = browserArgs;
    }

    this.browser = await puppeteer.launch(this.env.MYBROWSER, launchOptions);
    this.lastUsed = Date.now();
  }

  /**
   * Gracefully closes the browser and clears the instance reference.
   * Called on error or when the inactivity alarm fires.
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error("Error closing browser:", error);
      }
      this.browser = null;
    }
  }

  /**
   * Resets the Durable Object alarm to fire {@link BROWSER_TIMEOUT} ms from
   * now, replacing any previously scheduled alarm.
   */
  private async scheduleCleanup(): Promise<void> {
    const existingAlarm = await this.storage.getAlarm();
    if (existingAlarm) await this.storage.deleteAlarm();
    await this.storage.setAlarm(Date.now() + this.BROWSER_TIMEOUT);
  }

  /**
   * Cloudflare Durable Object alarm handler.  Closes the browser when it has
   * been idle longer than {@link BROWSER_TIMEOUT}; otherwise reschedules the
   * alarm for the remaining idle period.
   */
  async alarm(): Promise<void> {
    const timeSinceLastUse = Date.now() - this.lastUsed;
    if (timeSinceLastUse >= this.BROWSER_TIMEOUT) {
      await this.closeBrowser();
    } else {
      await this.scheduleCleanup();
    }
  }
}
