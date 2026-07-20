/**
 * @file scraper-captcha.ts
 * @description CAPTCHA and Cloudflare challenge detection and bypass utilities.
 * Provides functions to detect challenge pages, simulate human interaction,
 * click reCAPTCHA checkboxes, poll for solved state, and submit unsolvable
 * challenges to the 2captcha third-party service for automated resolution.
 */

import type { Page, Frame } from "@cloudflare/puppeteer";

/** 2captcha JSON response shape for both submit and result endpoints. */
interface TwoCaptchaResponse {
  status: number;
  request: string;
}

/**
 * Checks whether the given HTML content represents a bot-challenge page.
 * Tests against a custom match string first, then a list of known Cloudflare
 * and reCAPTCHA patterns.
 *
 * @param html - Raw HTML string of the page to inspect.
 * @param customMatch - Optional caller-supplied substring to detect challenges.
 * @param challengePatterns - Array of known challenge indicator strings.
 * @returns `true` if the page appears to be a challenge/CAPTCHA page.
 */
export function isChallengePage(
  html: string,
  customMatch: string | undefined,
  challengePatterns: string[],
): boolean {
  if (customMatch && html.includes(customMatch)) return true;

  for (const pattern of challengePatterns) {
    if (html.includes(pattern)) return true;
  }

  if (html.includes("/cdn-cgi/challenge-platform/")) return true;
  if (html.includes("challenges.cloudflare.com")) return true;

  return false;
}

/**
 * Moves the mouse through several random points and performs a small scroll
 * to mimic natural human interaction while waiting for a challenge to resolve.
 *
 * @param page - Puppeteer {@link Page} instance to interact with.
 */
export async function simulateHumanBehavior(page: Page): Promise<void> {
  try {
    const viewport = page.viewport();
    const width = viewport?.width ?? 1920;
    const height = viewport?.height ?? 1080;

    const numPoints = 3 + Math.floor(Math.random() * 3);
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.floor(Math.random() * width * 0.8) + width * 0.1,
        y: Math.floor(Math.random() * height * 0.8) + height * 0.1,
      });
    }

    for (const point of points) {
      await page.mouse.move(point.x, point.y, {
        steps: 10 + Math.floor(Math.random() * 15),
      });
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 150),
      );
    }

    await page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 100) - 50);
    });
  } catch (e) {
    console.log(
      "Error simulating human behavior:",
      (e as Error).message,
    );
  }
}

/**
 * Searches all page frames for a reCAPTCHA checkbox or anchor and clicks it
 * with human-like mouse movement.  Falls back to page-level reCAPTCHA
 * element selectors when no matching frame is found.
 *
 * @param page - Puppeteer {@link Page} instance to search.
 * @returns `true` if a reCAPTCHA element was located and clicked.
 */
export async function tryClickRecaptcha(page: Page): Promise<boolean> {
  try {
    const frames: Frame[] = page.frames();

    for (const frame of frames) {
      const frameUrl = frame.url();
      if (
        !frameUrl.includes("recaptcha") &&
        !frameUrl.includes("google.com/recaptcha")
      )
        continue;

      try {
        const checkbox = await frame.$(".recaptcha-checkbox-border");
        if (checkbox) {
          const box = await checkbox.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2 + (Math.random() * 10 - 5),
              box.y + box.height / 2 + (Math.random() * 10 - 5),
              { steps: 20 + Math.floor(Math.random() * 10) },
            );
            await new Promise<void>((r) =>
              setTimeout(r, 100 + Math.random() * 200),
            );
            await checkbox.click();
            console.log("Clicked reCAPTCHA checkbox");
            return true;
          }
        }

        const anchor = await frame.$("#recaptcha-anchor");
        if (anchor) {
          const box = await anchor.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2 + (Math.random() * 10 - 5),
              box.y + box.height / 2 + (Math.random() * 10 - 5),
              { steps: 20 + Math.floor(Math.random() * 10) },
            );
            await new Promise<void>((r) =>
              setTimeout(r, 100 + Math.random() * 200),
            );
            await anchor.click();
            console.log("Clicked reCAPTCHA anchor");
            return true;
          }
        }
      } catch (frameError) {
        console.log(
          "Error interacting with reCAPTCHA frame:",
          (frameError as Error).message,
        );
      }
    }

    const recaptchaSelectors = [
      ".g-recaptcha",
      "#g-recaptcha",
      "[data-sitekey]",
      ".recaptcha-checkbox",
      'iframe[src*="recaptcha"]',
    ];

    for (const selector of recaptchaSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const box = await element.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2,
              box.y + box.height / 2,
              { steps: 15 },
            );
            await new Promise<void>((r) =>
              setTimeout(r, 100 + Math.random() * 200),
            );
            await element.click();
            console.log(`Clicked reCAPTCHA element: ${selector}`);
            return true;
          }
        }
      } catch {
        // Try the next selector.
      }
    }

    return false;
  } catch (e) {
    console.log("Error trying to click reCAPTCHA:", (e as Error).message);
    return false;
  }
}

/**
 * Polls the page (and all reCAPTCHA frames) until the hidden response token
 * field is populated, indicating the challenge has been solved.
 *
 * @param page - Puppeteer {@link Page} instance to poll.
 * @param timeout - Maximum polling duration in milliseconds (default 30 000).
 * @returns `true` if the challenge was solved within `timeout`.
 */
export async function waitForRecaptchaSolved(
  page: Page,
  timeout = 30_000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const solved = await page.evaluate(() => {
        const response =
          document.querySelector<HTMLInputElement>("#g-recaptcha-response") ??
          document.querySelector<HTMLInputElement>(
            '[name="g-recaptcha-response"]',
          );
        return Boolean(response?.value?.length);
      });

      if (solved) {
        console.log("reCAPTCHA solved!");
        return true;
      }

      const frames: Frame[] = page.frames();
      for (const frame of frames) {
        if (!frame.url().includes("recaptcha")) continue;
        try {
          const frameSolved = await frame.evaluate(() => {
            const checkbox = document.querySelector(".recaptcha-checkbox");
            return checkbox?.getAttribute("aria-checked") === "true";
          });
          if (frameSolved) {
            console.log("reCAPTCHA checkbox marked as solved");
            return true;
          }
        } catch {
          /* ignore per-frame errors */
        }
      }
    } catch {
      /* ignore evaluation errors; keep polling */
    }

    await new Promise<void>((r) => setTimeout(r, 500));
  }

  return false;
}

/**
 * Extracts the reCAPTCHA sitekey from the page, submits it to the 2captcha
 * service, polls until a token is returned, then injects the token into the
 * page's hidden response fields and fires any registered callbacks.
 *
 * @param page - Puppeteer {@link Page} instance containing the reCAPTCHA.
 * @param apiKey - 2captcha API key.
 * @returns `true` if the token was successfully obtained and injected.
 */
export async function solveRecaptchaWith2Captcha(
  page: Page,
  apiKey: string,
): Promise<boolean> {
  if (!apiKey) {
    console.log("No 2captcha API key provided");
    return false;
  }

  try {
    const sitekey = await page.evaluate((): string | null => {
      const recaptchaDiv = document.querySelector<HTMLElement>(".g-recaptcha");
      if (recaptchaDiv) return recaptchaDiv.getAttribute("data-sitekey");

      for (const script of Array.from(document.querySelectorAll("script"))) {
        const match = script.textContent?.match(
          /['"]sitekey['"]\s*:\s*['"]([^'"]+)['"]/,
        );
        if (match) return match[1];
      }

      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[src*="recaptcha"]',
      );
      if (iframe) {
        const match = (iframe.getAttribute("src") ?? "").match(/[?&]k=([^&]+)/);
        if (match) return match[1];
      }

      return null;
    });

    if (!sitekey) {
      console.log("Could not find reCAPTCHA sitekey");
      return false;
    }

    const pageUrl = page.url();
    console.log(`Found sitekey: ${sitekey}, requesting solution from 2captcha...`);

    const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${sitekey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitResult: TwoCaptchaResponse = await fetch(submitUrl).then((r) =>
      r.json(),
    );

    if (submitResult.status !== 1) {
      console.log("2captcha submit failed:", submitResult);
      return false;
    }

    const captchaId = submitResult.request;
    console.log(`Captcha submitted, ID: ${captchaId}, waiting for solution...`);

    const maxAttempts = 60;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await new Promise<void>((r) => setTimeout(r, 5_000));

      const resultUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
      const result: TwoCaptchaResponse = await fetch(resultUrl).then((r) =>
        r.json(),
      );

      if (result.status === 1) {
        const token = result.request;
        console.log("Got reCAPTCHA token from 2captcha");

        await page.evaluate((t: string) => {
          const responseField =
            document.querySelector<HTMLTextAreaElement>(
              "#g-recaptcha-response",
            ) ??
            document.querySelector<HTMLTextAreaElement>(
              '[name="g-recaptcha-response"]',
            );
          if (responseField) {
            responseField.value = t;
            responseField.style.display = "block";
          }

          document
            .querySelectorAll<HTMLTextAreaElement>(
              'textarea[name="g-recaptcha-response"]',
            )
            .forEach((ta) => {
              ta.value = t;
              ta.innerHTML = t;
            });

          const w = window as unknown as Record<string, unknown>;
          if (typeof w.captchaCallback === "function")
            (w.captchaCallback as (t: string) => void)(t);
          if (typeof w.onCaptchaSuccess === "function")
            (w.onCaptchaSuccess as (t: string) => void)(t);

          try {
            type GrecaptchaClient = {
              U?: { callback?: (t: string) => void };
            };
            const cfg = (window as unknown as Record<string, unknown>)
              .___grecaptcha_cfg as
              | { clients?: Record<string, GrecaptchaClient> }
              | undefined;
            const callback = cfg?.clients?.[0]?.U?.callback;
            if (typeof callback === "function") callback(t);
          } catch (_e) {}
        }, token);

        return true;
      }

      if (result.request === "CAPCHA_NOT_READY") {
        console.log(`Captcha not ready, attempt ${attempts + 1}/${maxAttempts}`);
        continue;
      }

      console.log("2captcha error:", result);
      return false;
    }

    console.log("2captcha timeout");
    return false;
  } catch (error) {
    console.error("Error solving reCAPTCHA with 2captcha:", error);
    return false;
  }
}

/**
 * Extracts the Cloudflare Turnstile sitekey from the page, submits it to the
 * 2captcha service, polls for a token, then injects the token into the
 * Turnstile response field and fires any registered callback.
 *
 * @param page - Puppeteer {@link Page} instance containing the Turnstile widget.
 * @param apiKey - 2captcha API key.
 * @returns `true` if the token was successfully obtained and injected.
 */
export async function solveTurnstileWith2Captcha(
  page: Page,
  apiKey: string,
): Promise<boolean> {
  if (!apiKey) {
    console.log("No 2captcha API key provided");
    return false;
  }

  try {
    const sitekey = await page.evaluate((): string | null => {
      const turnstileDiv =
        document.querySelector<HTMLElement>(".cf-turnstile");
      if (turnstileDiv) return turnstileDiv.getAttribute("data-sitekey");

      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[src*="challenges.cloudflare.com"]',
      );
      if (iframe) {
        const match = (iframe.getAttribute("src") ?? "").match(/[?&]k=([^&]+)/);
        if (match) return match[1];
      }

      return null;
    });

    if (!sitekey) {
      console.log("Could not find Turnstile sitekey");
      return false;
    }

    const pageUrl = page.url();
    console.log(`Found Turnstile sitekey: ${sitekey}`);

    const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=turnstile&sitekey=${sitekey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitResult: TwoCaptchaResponse = await fetch(submitUrl).then((r) =>
      r.json(),
    );

    if (submitResult.status !== 1) {
      console.log("2captcha Turnstile submit failed:", submitResult);
      return false;
    }

    const captchaId = submitResult.request;
    console.log(`Turnstile submitted, ID: ${captchaId}`);

    const maxAttempts = 60;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await new Promise<void>((r) => setTimeout(r, 5_000));

      const resultUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
      const result: TwoCaptchaResponse = await fetch(resultUrl).then((r) =>
        r.json(),
      );

      if (result.status === 1) {
        const token = result.request;
        console.log("Got Turnstile token from 2captcha");

        await page.evaluate((t: string) => {
          const responseField =
            document.querySelector<HTMLInputElement>(
              '[name="cf-turnstile-response"]',
            ) ??
            document.querySelector<HTMLInputElement>(
              'input[name="cf-turnstile-response"]',
            );
          if (responseField) responseField.value = t;

          const w = window as unknown as Record<string, unknown>;
          if (typeof w.turnstileCallback === "function")
            (w.turnstileCallback as (t: string) => void)(t);
        }, token);

        return true;
      }

      if (result.request !== "CAPCHA_NOT_READY") {
        console.log("2captcha Turnstile error:", result);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error("Error solving Turnstile with 2captcha:", error);
    return false;
  }
}
