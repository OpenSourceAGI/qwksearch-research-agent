/**
 * Automates Google login for NotebookLM using the Cloudflare Puppeteer scraper.
 * Uses the existing proxy.qwksearch.com worker (BrowserDurableObject) with
 * session persistence to log in as the user, then extracts the auth cookies.
 */

import { renderUrlWithMetadata } from "../scraper/cloudflare-scraper-client";
import type { ScraperJsonResponse } from "../scraper/cloudflare-scraper-client";

const NOTEBOOKLM_URL = "https://notebooklm.google.com";
const GOOGLE_LOGIN_URL = "https://accounts.google.com/signin";

export interface LoginResult {
  success: boolean;
  cookies?: ScraperJsonResponse["cookies"];
  error?: string;
  googleEmail?: string;
}

/**
 * Step 1: Navigate to NotebookLM which redirects to Google login.
 * Uses a persistent session so cookies carry across steps.
 */
export async function initiateLogin(sessionId: string): Promise<{
  html: string;
  url: string;
  needsLogin: boolean;
}> {
  const result = await renderUrlWithMetadata(NOTEBOOKLM_URL, {
    sessionId,
    blockImages: true,
    waitUntil: "networkidle2",
    timeout: 30000,
    bypassCaptcha: true,
    maxRetries: 3,
  });

  const needsLogin =
    result.url.includes("accounts.google.com") ||
    result.html.includes("identifier") ||
    result.html.includes("Email or phone");

  return {
    html: result.html,
    url: result.url,
    needsLogin,
  };
}

/**
 * Step 2: Perform automated Google login using the CF Puppeteer scraper's
 * session persistence. This sends a custom scraper request that executes
 * the login flow via the Durable Object's persistent browser session.
 *
 * The scraper worker needs a special endpoint for multi-step login flows.
 * We use sequential renderWithMetadata calls sharing the same sessionId
 * to maintain browser state across navigations.
 */
export async function performGoogleLogin(
  sessionId: string,
  email: string,
  password: string,
): Promise<LoginResult> {
  const scraperUrl =
    typeof process !== "undefined" && process?.env?.SCRAPER_URL
      ? process.env.SCRAPER_URL
      : "https://proxy.qwksearch.com";

  // Use the scraper's login automation endpoint
  const loginPayload = {
    action: "google-login",
    sessionId,
    email,
    password,
    targetUrl: NOTEBOOKLM_URL,
  };

  const response = await fetch(`${scraperUrl}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process?.env?.SCRAPER_API_KEY
        ? { Authorization: `Bearer ${process.env.SCRAPER_API_KEY}` }
        : {}),
    },
    body: JSON.stringify(loginPayload),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    return {
      success: false,
      error: `Login request failed (${response.status}): ${err.slice(0, 200)}`,
    };
  }

  const result = (await response.json()) as {
    success: boolean;
    cookies?: ScraperJsonResponse["cookies"];
    error?: string;
    finalUrl?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error || "Login failed" };
  }

  // Verify we landed on NotebookLM (not still on a login/consent page)
  if (result.finalUrl && !result.finalUrl.includes("notebooklm.google.com")) {
    return {
      success: false,
      error: "Login did not complete — may require 2FA or consent",
    };
  }

  return {
    success: true,
    cookies: result.cookies,
    googleEmail: email,
  };
}

/**
 * Validate that stored cookies are still valid by checking NotebookLM access.
 */
export async function validateSession(
  sessionId: string,
  cookies: ScraperJsonResponse["cookies"],
): Promise<boolean> {
  try {
    const result = await renderUrlWithMetadata(NOTEBOOKLM_URL, {
      sessionId,
      blockImages: true,
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // If we're redirected to login, the session is expired
    if (
      result.url.includes("accounts.google.com") ||
      result.html.includes("Email or phone")
    ) {
      return false;
    }

    return result.url.includes("notebooklm.google.com");
  } catch {
    return false;
  }
}
