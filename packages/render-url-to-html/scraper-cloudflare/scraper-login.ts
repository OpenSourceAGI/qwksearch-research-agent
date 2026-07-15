/**
 * @file scraper-login.ts
 * @description Google login automation via the BrowserDurableObject.
 * Handles the multi-step Google sign-in flow (email → password → redirect)
 * and returns the resulting auth cookies for NotebookLM access.
 *
 * Also provides a fetch-as-session endpoint that executes HTTP requests
 * with the session's stored cookies.
 */

import puppeteer from "@cloudflare/puppeteer";
import type { Browser, Page, Cookie } from "@cloudflare/puppeteer";
import { applyStealthEvasions } from "./scraper-stealth.js";
import type { Env } from "./scraper-utils.js";

export interface LoginRequest {
  action: "google-login";
  sessionId: string;
  email: string;
  password: string;
  targetUrl: string;
}

export interface LoginResponse {
  success: boolean;
  cookies?: Cookie[];
  finalUrl?: string;
  error?: string;
}

export interface FetchAsSessionRequest {
  sessionId: string;
  url: string;
  method?: string;
  body?: string;
  cookies?: Cookie[];
  headers?: Record<string, string>;
}

/**
 * Handles POST /api/login — automates Google OAuth login flow via Puppeteer.
 *
 * Flow:
 * 1. Navigate to targetUrl (e.g. NotebookLM) which redirects to Google login
 * 2. Enter email, click Next
 * 3. Enter password, click Next
 * 4. Wait for redirect back to targetUrl
 * 5. Return all cookies from the authenticated session
 */
export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (!body.email || !body.password || !body.targetUrl) {
    return jsonResponse(
      { success: false, error: "email, password, and targetUrl are required" },
      400,
    );
  }

  const id = env.BROWSER_DO.idFromName(`browser-${body.sessionId || "login"}`);
  const browserDO = env.BROWSER_DO.get(id);

  // Forward the login request to the Durable Object
  const doRequest = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, _action: "login" }),
  });

  return browserDO.fetch(doRequest);
}

/**
 * Handles POST /api/fetch — execute an HTTP request using the session's
 * stored browser cookies. This allows the qwksearch-web backend to make
 * authenticated requests to NotebookLM's internal APIs.
 */
export async function handleFetchAsSession(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: FetchAsSessionRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.url || !body.sessionId) {
    return jsonResponse({ error: "url and sessionId are required" }, 400);
  }

  // Build the proxied request with the user's cookies
  const cookieHeader = body.cookies
    ?.map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const headers: Record<string, string> = {
    ...body.headers,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  try {
    const response = await fetch(body.url, {
      method: body.method || "GET",
      headers,
      body: body.body,
    });

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      response.headers.get("Content-Type") || "application/json",
    );
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return jsonResponse(
      { error: `Fetch failed: ${(err as Error).message}` },
      502,
    );
  }
}

/**
 * Google login flow executed inside a Durable Object's persistent browser.
 * Called from BrowserDurableObject when it receives a login action request.
 */
export async function executeGoogleLogin(
  page: Page,
  email: string,
  password: string,
  targetUrl: string,
): Promise<LoginResponse> {
  try {
    // Navigate to the target (NotebookLM) which will redirect to Google login
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Check if already logged in
    if (page.url().includes("notebooklm.google.com") && !page.url().includes("accounts.google.com")) {
      const cookies = await page.cookies();
      return { success: true, cookies, finalUrl: page.url() };
    }

    // Wait for the email input field
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await randomDelay(500, 1000);

    // Type email with human-like delays
    await page.type('input[type="email"]', email, { delay: 50 + Math.random() * 80 });
    await randomDelay(300, 700);

    // Click "Next" button
    const nextButton = await page.$(
      '#identifierNext, button[type="submit"], [data-idom-class*="next"]',
    );
    if (nextButton) {
      await nextButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Wait for password field to appear
    await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 10000,
    });
    await randomDelay(800, 1500);

    // Type password
    await page.type('input[type="password"]', password, { delay: 40 + Math.random() * 60 });
    await randomDelay(300, 700);

    // Click "Next" / "Sign in"
    const signInButton = await page.$(
      '#passwordNext, button[type="submit"], [data-idom-class*="next"]',
    );
    if (signInButton) {
      await signInButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Wait for navigation to complete (either to target or 2FA/consent)
    await page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Check for 2FA challenge
    const currentUrl = page.url();
    if (
      currentUrl.includes("challenge") ||
      currentUrl.includes("signin/v2/challenge")
    ) {
      return {
        success: false,
        error:
          "Two-factor authentication required. Please use an app password or disable 2FA temporarily.",
        finalUrl: currentUrl,
      };
    }

    // Check for consent screen
    if (currentUrl.includes("consent") || currentUrl.includes("oauthchooseaccount")) {
      // Try to click "Allow" or "Continue"
      const allowBtn = await page.$(
        'button[id="submit_approve_access"], [data-value="true"], button:has-text("Allow"), button:has-text("Continue")',
      );
      if (allowBtn) {
        await allowBtn.click();
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
      }
    }

    // Give the page a moment to settle after login
    await randomDelay(2000, 3000);

    const finalUrl = page.url();
    const cookies = await page.cookies();

    return {
      success: finalUrl.includes("notebooklm.google.com"),
      cookies,
      finalUrl,
      error: finalUrl.includes("notebooklm.google.com")
        ? undefined
        : "Did not reach NotebookLM after login",
    };
  } catch (err) {
    return {
      success: false,
      error: `Login flow error: ${(err as Error).message}`,
      finalUrl: page.url(),
    };
  }
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
