import { Container } from "cloudflare:workers";
import puppeteer from "@cloudflare/puppeteer";

export interface Env {
  NOTEBOOK_RUNNER: DurableObjectNamespace<NotebookRunner>;
  BROWSER: Fetcher;
  API_TOKEN: string;
  GOOGLE_EMAIL: string;
  GOOGLE_PASSWORD: string;
}

export interface NotebookJob {
  action: "create" | "ask" | "summarize" | "list" | "delete" | "login";
  notebookId?: string;
  sourceUrls?: string[];
  title?: string;
  prompt?: string;
  securityCode?: string;
}

export class NotebookRunner extends Container {
  defaultPort = 8080;
  sleepAfter = "5m";

  override async onStart() {
    this.ctx.container.start({
      env: {
        NOTEBOOKLM_AUTH_JSON: (await this.ctx.storage.get<string>("auth")) ?? "",
      },
      enableInternet: true,
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.API_TOKEN}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: NotebookJob;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.action) {
      return json({ error: "Missing action field" }, 400);
    }

    if (body.action === "login") {
      return handleLogin(env, body.securityCode);
    }

    const id = env.NOTEBOOK_RUNNER.idFromName("default");
    const stub = env.NOTEBOOK_RUNNER.get(id);

    const containerResp = await stub.fetch("http://container/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await containerResp.text();
    return new Response(result, {
      status: containerResp.status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    });
  },
};

async function handleLogin(env: Env, securityCode?: string): Promise<Response> {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );

    await page.goto("https://notebooklm.google.com", {
      waitUntil: "networkidle0",
    });

    // Google sign-in: enter email
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', env.GOOGLE_EMAIL, { delay: 50 });
    await page.click("#identifierNext");
    await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});

    // Enter password
    await page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 15000,
    });
    await delay(1000);
    await page.type('input[type="password"]', env.GOOGLE_PASSWORD, {
      delay: 50,
    });
    await page.click("#passwordNext");
    await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});

    // Handle security code / 2FA if provided
    if (securityCode) {
      await delay(2000);
      const codeInput = await page.$(
        'input[type="tel"], input[name="totpPin"], input[id="idvPin"]'
      );
      if (codeInput) {
        await codeInput.type(securityCode, { delay: 50 });
        const nextBtn = await page.$(
          'button[data-idom-class*="next"], #idvPreregisteredPhoneNext, button[jsname="LgbsSe"]'
        );
        if (nextBtn) await nextBtn.click();
        await page
          .waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 })
          .catch(() => {});
      }
    }

    // Wait for NotebookLM to load (confirms successful login)
    await page.waitForSelector("body", { timeout: 10000 });
    await delay(3000);

    // Extract cookies and local storage auth
    const cookies = await page.cookies();
    const localStorage = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)!;
        data[key] = window.localStorage.getItem(key)!;
      }
      return data;
    });

    const authData = JSON.stringify({
      cookies,
      localStorage,
      timestamp: new Date().toISOString(),
    });

    // Store auth in the container's Durable Object storage
    const id = env.NOTEBOOK_RUNNER.idFromName("default");
    const stub = env.NOTEBOOK_RUNNER.get(id);
    await stub.fetch("http://container/store-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: authData,
    });

    return json({
      success: true,
      message: "Login complete, auth stored for container",
      cookieCount: cookies.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: "Login failed", detail: message }, 500);
  } finally {
    await browser.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}
